<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataEvent;
use App\Models\EventCart;
use App\Models\EventCartDetail;
use App\Models\EventPayment;
use App\Models\Payment;
use App\Models\ProdukPrice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PosController extends Controller
{
    private const STATUS_DRAFT = 'Draft';
    private const STATUS_PAID = 'Paid';
    private const STATUS_VOID_CARTS = 'Void Carts';
    private const STATUS_VOID_TRANSAKSI = 'Void Transaksi';
    private const STATUS_VOID_OLD = 'Void';

    private const CART_TYPE_PO = 'PO';
    private const CART_TYPE_PEMBELIAN = 'Pembelian';

    private const PAYMENT_TYPE_DP = 'DP';
    private const PAYMENT_TYPE_LUNAS = 'Lunas';

    private const PAYMENT_STATUS_LUNAS = 'Lunas';
    private const PAYMENT_STATUS_BELUM_LUNAS = 'Belum Lunas';

    public function options()
    {
        $this->autoVoidExpiredDraftCarts();

        $today = now()->toDateString();

        $payments = Payment::query()
            ->orderBy('created_at')
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'payment' => $payment->payment
                        ?? $payment->nama_payment
                        ?? $payment->name
                        ?? $payment->code
                        ?? 'Metode Pembayaran',
                ];
            })
            ->values();

        $produkPrices = ProdukPrice::query()
            ->whereHas('event', function ($query) use ($today) {
                $query->whereDate('valid_until', '>=', $today);
            })
            ->with([
                'produk:id,nama_produk,product_number,code_gs1',
                'bundleDetails:id,produk_price_id,produk_id,qty',
                'bundleDetails.produk:id,nama_produk,product_number,code_gs1',
            ])
            ->select([
                'id',
                'produk_id',
                'event_id',
                'tipe_harga',
                'nama_bundle',
                'harga_produk',
            ])
            ->orderBy('event_id')
            ->orderBy('tipe_harga')
            ->orderBy('nama_bundle')
            ->get()
            ->map(function ($produkPrice) {
                return $this->formatProdukPriceOption($produkPrice);
            })
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Data pilihan POS berhasil dimuat.',
            'data' => [
                'events' => DataEvent::query()
                    ->select('id', 'nama_event', 'alamat_event', 'valid_from', 'valid_until')
                    ->whereDate('valid_until', '>=', $today)
                    ->orderBy('valid_from')
                    ->orderBy('nama_event')
                    ->get(),

                'payments' => $payments,
                'products' => $produkPrices,
                'produk_prices' => $produkPrices,
                'product_prices' => $produkPrices,
            ],
        ]);
    }

    public function drafts(Request $request)
    {
        $this->autoVoidExpiredDraftCarts();

        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', self::STATUS_DRAFT));
        $today = now()->toDateString();

        $allowedStatuses = [
            self::STATUS_DRAFT,
            self::STATUS_PAID,
            self::STATUS_VOID_CARTS,
            self::STATUS_VOID_TRANSAKSI,
            self::STATUS_VOID_OLD,
        ];

        if (!in_array($status, $allowedStatuses, true)) {
            $status = self::STATUS_DRAFT;
        }

        $rows = EventCart::query()
            ->with([
                'event:id,nama_event,alamat_event',
                'details:id,event_carts_id,produk_price_id,qty,manual_discount_type,manual_discount_value',
                'details.produkPrice:id,produk_id,event_id,tipe_harga,nama_bundle,harga_produk',
                'details.produkPrice.produk:id,nama_produk,product_number,code_gs1',
                'details.produkPrice.bundleDetails:id,produk_price_id,produk_id,qty',
                'details.produkPrice.bundleDetails.produk:id,nama_produk,product_number,code_gs1',
                'payment:id,event_carts_id,payment_id,payment_type,total_amount,paid_amount,dp_amount,change_amount,remaining_amount,payment_status,cashier_user_id',
                'payment.payment:id,payment',
                'payment.cashier:id,name,email',
            ])
            ->where('status', $status)
            ->whereDate('tanggal_carts', $today)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $keyword = '%' . mb_strtolower($search) . '%';

                    $subQuery
                        ->whereRaw('LOWER(no_invoice) LIKE ?', [$keyword])
                        ->orWhereRaw('LOWER(customer) LIKE ?', [$keyword])
                        ->orWhereHas('event', function ($eventQuery) use ($keyword) {
                            $eventQuery->whereRaw('LOWER(nama_event) LIKE ?', [$keyword]);
                        });
                });
            })
            ->orderByDesc('updated_at')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(function ($cart) {
                return $this->appendCartSummary($cart);
            });

        return response()->json([
            'success' => true,
            'message' => 'Data invoice hari ini berhasil dimuat.',
            'status' => $status,
            'date' => $today,
            'data' => $rows,
        ]);
    }

    public function startCart(Request $request)
    {
        $this->autoVoidExpiredDraftCarts();

        $validated = $request->validate([
            'event_id' => ['required', 'uuid', 'exists:data_event,id'],
            'customer' => ['nullable', 'string', 'max:150'],
            'transaction_type' => ['required', 'string', 'in:PO,Pembelian'],
        ], [
            'event_id.required' => 'Event wajib dipilih.',
            'event_id.exists' => 'Event tidak ditemukan.',
            'customer.max' => 'Nama customer maksimal 150 karakter.',
            'transaction_type.required' => 'Jenis transaksi wajib dipilih.',
            'transaction_type.in' => 'Jenis transaksi hanya boleh PO atau Pembelian.',
        ]);

        $this->ensureActiveEvent($validated['event_id']);

        $cart = new EventCart();
        $cart->event_id = $validated['event_id'];
        $cart->customer = trim((string) ($validated['customer'] ?? '')) ?: 'Walk In Customer';
        $cart->no_invoice = $this->generateInvoiceNumber();
        $cart->tanggal_carts = now()->toDateString();
        $cart->status = self::STATUS_DRAFT;
        $cart->transaction_type = $validated['transaction_type'];
        $cart->save();

        return response()->json([
            'success' => true,
            'message' => 'Invoice baru berhasil dibuat.',
            'data' => $this->loadCart($cart->id),
        ], 201);
    }

    public function showCart(string $id)
    {
        $this->autoVoidExpiredDraftCarts();

        $cart = EventCart::query()->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail cart berhasil dimuat.',
            'data' => $this->loadCart($cart->id),
        ]);
    }

    public function nota(string $id)
    {
        $this->autoVoidExpiredDraftCarts();

        $cart = $this->loadCart($id);

        if (!$cart->payment) {
            return response()->json([
                'message' => 'Nota belum tersedia karena invoice belum dibayar.',
                'errors' => [
                    'nota' => ['Nota belum tersedia karena invoice belum dibayar.'],
                ],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Nota berhasil dimuat.',
            'data' => $cart->nota,
        ]);
    }

    public function scanProduct(Request $request, string $id)
    {
        $this->autoVoidExpiredDraftCarts();

        $validated = $request->validate([
            'produk_price_id' => ['nullable', 'uuid', 'exists:produk_price,id'],
            'code_gs1' => ['nullable', 'required_without:produk_price_id', 'string', 'max:100'],
            'qty' => ['nullable', 'integer', 'min:1'],
        ], [
            'produk_price_id.uuid' => 'Produk tidak valid.',
            'produk_price_id.exists' => 'Produk tidak ditemukan.',
            'code_gs1.required_without' => 'Kode GS1 atau produk wajib diisi.',
            'qty.integer' => 'Qty harus berupa angka bulat.',
            'qty.min' => 'Qty minimal 1.',
        ]);

        $qty = (int) ($validated['qty'] ?? 1);

        if ($qty <= 0) {
            $qty = 1;
        }

        return DB::transaction(function () use ($id, $validated, $qty) {
            $cart = EventCart::query()
                ->where('status', self::STATUS_DRAFT)
                ->whereDate('tanggal_carts', now()->toDateString())
                ->lockForUpdate()
                ->findOrFail($id);

            $this->ensureActiveEvent($cart->event_id);

            $produkPriceId = $validated['produk_price_id'] ?? null;
            $codeGs1 = trim((string) ($validated['code_gs1'] ?? ''));

            $produkPriceQuery = ProdukPrice::query()
                ->with([
                    'produk:id,nama_produk,product_number,code_gs1',
                    'bundleDetails:id,produk_price_id,produk_id,qty',
                    'bundleDetails.produk:id,nama_produk,product_number,code_gs1',
                ])
                ->where('event_id', $cart->event_id);

            if ($produkPriceId) {
                $produkPriceQuery->where('id', $produkPriceId);
            } else {
                $produkPriceQuery
                    ->where(function ($query) {
                        $query->whereNull('tipe_harga')
                            ->orWhere('tipe_harga', 'single');
                    })
                    ->whereHas('produk', function ($query) use ($codeGs1) {
                        $query->where('code_gs1', $codeGs1);
                    });
            }

            $produkPrice = $produkPriceQuery->first();

            if (!$produkPrice) {
                return response()->json([
                    'message' => 'Produk tidak ditemukan pada event ini.',
                    'errors' => [
                        'produk_price_id' => [
                            'Produk tidak ditemukan pada event ini.',
                        ],
                    ],
                ], 422);
            }

            if ($this->isBundlePrice($produkPrice) && $produkPrice->bundleDetails->count() === 0) {
                return response()->json([
                    'message' => 'Bundle belum memiliki isi produk.',
                    'errors' => [
                        'produk_price_id' => [
                            'Bundle belum memiliki isi produk.',
                        ],
                    ],
                ], 422);
            }

            $detail = EventCartDetail::query()
                ->where('event_carts_id', $cart->id)
                ->where('produk_price_id', $produkPrice->id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->first();

            $currentQty = $detail ? (int) $detail->qty : 0;
            $nextQty = $currentQty + $qty;

            $stock = $this->getStockSummary(
                $cart->event_id,
                $produkPrice->id,
                $detail?->id
            );

            if (!$this->isPoCart($cart) && $nextQty > $stock['stock_available_for_line']) {
                $message = $this->isBundlePrice($produkPrice)
                    ? 'Stok isi bundle tidak mencukupi.'
                    : 'Stok produk tidak mencukupi.';

                return response()->json([
                    'message' => $message,
                    'errors' => [
                        'code_gs1' => [
                            $message . ' Stok terakhir: ' . $stock['stock_terakhir'] .
                            '. Maksimal qty untuk item ini: ' . $stock['stock_available_for_line'],
                        ],
                    ],
                    'stock' => [
                        'stock_masuk' => $stock['stock_masuk'],
                        'stock_terpakai' => $stock['stock_terpakai'],
                        'stock_terakhir' => $stock['stock_terakhir'],
                        'stock_available_for_line' => $stock['stock_available_for_line'],
                        'bundle_components' => $stock['bundle_components'] ?? [],
                    ],
                ], 422);
            }

            if ($detail) {
                $detail->update([
                    'qty' => $nextQty,
                ]);
            } else {
                EventCartDetail::create([
                    'event_carts_id' => $cart->id,
                    'produk_price_id' => $produkPrice->id,
                    'qty' => $qty,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => $this->isBundlePrice($produkPrice)
                    ? 'Bundle berhasil ditambahkan ke invoice.'
                    : 'Produk berhasil ditambahkan ke invoice.',
                'data' => $this->loadCart($cart->id),
            ]);
        });
    }

    public function updateItem(Request $request, string $cartId, string $detailId)
    {
        $this->autoVoidExpiredDraftCarts();

        $validated = $request->validate([
            'qty' => ['required', 'integer', 'min:1'],
            'manual_discount_type' => ['nullable', 'string', 'in:none,percent,nominal'],
            'manual_discount_value' => ['nullable', 'numeric', 'min:0'],
        ], [
            'qty.required' => 'Qty wajib diisi.',
            'qty.integer' => 'Qty harus berupa angka bulat.',
            'qty.min' => 'Qty minimal 1.',
            'manual_discount_type.in' => 'Tipe diskon manual tidak valid.',
            'manual_discount_value.numeric' => 'Nilai diskon manual harus berupa angka.',
            'manual_discount_value.min' => 'Nilai diskon manual tidak boleh kurang dari 0.',
        ]);

        return DB::transaction(function () use ($cartId, $detailId, $validated) {
            $cart = EventCart::query()
                ->where('status', self::STATUS_DRAFT)
                ->whereDate('tanggal_carts', now()->toDateString())
                ->lockForUpdate()
                ->findOrFail($cartId);

            $detail = EventCartDetail::query()
                ->with([
                    'produkPrice:id,produk_id,event_id,tipe_harga,nama_bundle,harga_produk',
                    'produkPrice.bundleDetails:id,produk_price_id,produk_id,qty',
                    'produkPrice.bundleDetails.produk:id,nama_produk,product_number,code_gs1',
                ])
                ->where('event_carts_id', $cart->id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->findOrFail($detailId);

            $nextQty = (int) $validated['qty'];

            $stock = $this->getStockSummary(
                $cart->event_id,
                $detail->produk_price_id,
                $detail->id
            );

            if (!$this->isPoCart($cart) && $nextQty > $stock['stock_available_for_line']) {
                $message = $detail->produkPrice && $this->isBundlePrice($detail->produkPrice)
                    ? 'Stok isi bundle tidak mencukupi.'
                    : 'Stok produk tidak mencukupi.';

                return response()->json([
                    'message' => $message,
                    'errors' => [
                        'qty' => [
                            $message . ' Stok terakhir: ' . $stock['stock_terakhir'] .
                            '. Maksimal qty untuk item ini: ' . $stock['stock_available_for_line'],
                        ],
                    ],
                    'stock' => [
                        'stock_masuk' => $stock['stock_masuk'],
                        'stock_terpakai' => $stock['stock_terpakai'],
                        'stock_terakhir' => $stock['stock_terakhir'],
                        'stock_available_for_line' => $stock['stock_available_for_line'],
                        'bundle_components' => $stock['bundle_components'] ?? [],
                    ],
                ], 422);
            }

            $manualDiscountType = $validated['manual_discount_type'] ?? $detail->manual_discount_type ?? null;
            $manualDiscountValue = array_key_exists('manual_discount_value', $validated)
                ? (float) ($validated['manual_discount_value'] ?? 0)
                : (float) ($detail->manual_discount_value ?? 0);

            if ($manualDiscountType === 'none' || $manualDiscountValue <= 0) {
                $manualDiscountType = null;
                $manualDiscountValue = 0;
            }

            if ($manualDiscountType === 'percent' && $manualDiscountValue > 100) {
                return response()->json([
                    'message' => 'Diskon manual persen maksimal 100%.',
                    'errors' => [
                        'manual_discount_value' => ['Diskon manual persen maksimal 100%.'],
                    ],
                ], 422);
            }

            $detail->qty = $nextQty;
            $detail->manual_discount_type = $manualDiscountType;
            $detail->manual_discount_value = $manualDiscountValue;
            $detail->save();

            return response()->json([
                'success' => true,
                'message' => 'Qty produk berhasil diperbarui.',
                'data' => $this->loadCart($cart->id),
            ]);
        });
    }

    public function deleteItem(string $cartId, string $detailId)
    {
        $this->autoVoidExpiredDraftCarts();

        return DB::transaction(function () use ($cartId, $detailId) {
            $cart = EventCart::query()
                ->where('status', self::STATUS_DRAFT)
                ->whereDate('tanggal_carts', now()->toDateString())
                ->lockForUpdate()
                ->findOrFail($cartId);

            $detail = EventCartDetail::query()
                ->where('event_carts_id', $cart->id)
                ->whereNull('deleted_at')
                ->lockForUpdate()
                ->findOrFail($detailId);

            $detail->delete();

            return response()->json([
                'success' => true,
                'message' => 'Produk berhasil dihapus dari invoice. Stok otomatis kembali.',
                'data' => $this->loadCart($cart->id),
            ]);
        });
    }

    public function voidCart(string $id)
    {
        $this->autoVoidExpiredDraftCarts();

        return DB::transaction(function () use ($id) {
            $cart = EventCart::query()
                ->with([
                    'payment',
                ])
                ->lockForUpdate()
                ->findOrFail($id);

            if (in_array($cart->status, [
                self::STATUS_VOID_CARTS,
                self::STATUS_VOID_TRANSAKSI,
                self::STATUS_VOID_OLD,
            ], true)) {
                return response()->json([
                    'message' => 'Cart sudah void.',
                    'errors' => [
                        'cart' => ['Cart sudah void.'],
                    ],
                ], 422);
            }

            if ($cart->status === self::STATUS_DRAFT) {
                $cart->update([
                    'status' => self::STATUS_VOID_CARTS,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Cart berhasil di-void. Stok otomatis kembali.',
                    'data' => $this->loadCart($cart->id),
                ]);
            }

            if ($cart->status === self::STATUS_PAID) {
                $cart->update([
                    'status' => self::STATUS_VOID_TRANSAKSI,
                ]);

                if ($cart->payment) {
                    $cart->payment->update([
                        'payment_status' => self::STATUS_VOID_TRANSAKSI,
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Transaksi berhasil di-void. Stok otomatis kembali.',
                    'data' => $this->loadCart($cart->id),
                ]);
            }

            return response()->json([
                'message' => 'Status cart tidak bisa di-void.',
                'errors' => [
                    'cart' => ['Status cart tidak bisa di-void.'],
                ],
            ], 422);
        });
    }

    public function pay(Request $request, string $id)
    {
        $this->autoVoidExpiredDraftCarts();

        $validated = $request->validate([
            'payment_id' => ['required', 'uuid', 'exists:payments,id'],
            'paid_amount' => ['required', 'numeric', 'min:0.01'],
            'payment_type' => ['nullable', 'string', 'in:DP,Lunas'],
        ], [
            'payment_id.required' => 'Metode pembayaran wajib dipilih.',
            'payment_id.uuid' => 'Metode pembayaran tidak valid.',
            'payment_id.exists' => 'Metode pembayaran tidak ditemukan.',
            'paid_amount.required' => 'Jumlah bayar wajib diisi.',
            'paid_amount.numeric' => 'Jumlah bayar harus berupa angka.',
            'paid_amount.min' => 'Jumlah bayar harus lebih dari 0.',
            'payment_type.in' => 'Jenis pembayaran hanya boleh DP atau Lunas.',
        ]);

        return DB::transaction(function () use ($id, $validated) {
            $cart = EventCart::query()
                ->whereDate('tanggal_carts', now()->toDateString())
                ->with([
                    'details.produkPrice:id,produk_id,event_id,harga_produk',
                    'payment',
                ])
                ->lockForUpdate()
                ->findOrFail($id);

            $isPo = $this->isPoCart($cart);
            $existingPayment = $cart->payment;

            $canReceivePayment =
                $cart->status === self::STATUS_DRAFT ||
                (
                    $isPo &&
                    $cart->status === self::STATUS_PAID &&
                    $existingPayment &&
                    $existingPayment->payment_status === self::PAYMENT_STATUS_BELUM_LUNAS
                );

            if (!$canReceivePayment) {
                return response()->json([
                    'message' => 'Invoice tidak bisa menerima pembayaran.',
                    'errors' => [
                        'cart' => ['Invoice tidak bisa menerima pembayaran.'],
                    ],
                ], 422);
            }

            if ($cart->details->count() === 0) {
                return response()->json([
                    'message' => 'Invoice belum memiliki produk.',
                    'errors' => [
                        'cart' => ['Invoice belum memiliki produk.'],
                    ],
                ], 422);
            }

            if (!$isPo) {
                foreach ($cart->details as $detail) {
                    $stock = $this->getStockSummary(
                        $cart->event_id,
                        $detail->produk_price_id,
                        $detail->id
                    );

                    if ((int) $detail->qty > $stock['stock_available_for_line']) {
                        return response()->json([
                            'message' => 'Stok produk tidak mencukupi untuk pembayaran.',
                            'errors' => [
                                'stock' => [
                                    'Ada produk dengan stok tidak mencukupi. Silakan cek cart kembali.',
                                ],
                            ],
                        ], 422);
                    }
                }
            }

            if ($existingPayment && !$isPo) {
                return response()->json([
                    'message' => 'Invoice ini sudah memiliki pembayaran.',
                    'errors' => [
                        'payment' => ['Invoice ini sudah memiliki pembayaran.'],
                    ],
                ], 422);
            }

            if ($existingPayment && $existingPayment->payment_status === self::PAYMENT_STATUS_LUNAS) {
                return response()->json([
                    'message' => 'Invoice ini sudah lunas.',
                    'errors' => [
                        'payment' => ['Invoice ini sudah lunas.'],
                    ],
                ], 422);
            }

            $cart = $this->appendCartSummary($cart);
            $totalAmount = (float) ($cart->total_amount ?? 0);

            $inputPaidAmount = (float) $validated['paid_amount'];
            $requestedPaymentType = $validated['payment_type'] ?? self::PAYMENT_TYPE_LUNAS;

            $previousPaidAmount = (float) ($existingPayment?->paid_amount ?? 0);
            $newPaidAmount = $previousPaidAmount + $inputPaidAmount;

            if (!$isPo && $newPaidAmount < $totalAmount) {
                return response()->json([
                    'message' => 'Jumlah bayar kurang dari total transaksi.',
                    'errors' => [
                        'paid_amount' => ['Jumlah bayar kurang dari total transaksi.'],
                    ],
                ], 422);
            }

            if ($isPo && $requestedPaymentType === self::PAYMENT_TYPE_LUNAS && $newPaidAmount < $totalAmount) {
                return response()->json([
                    'message' => 'Pembayaran Lunas harus sama dengan atau lebih besar dari total PO.',
                    'errors' => [
                        'paid_amount' => ['Pembayaran Lunas harus sama dengan atau lebih besar dari total PO.'],
                    ],
                ], 422);
            }

            $remainingAmount = max($totalAmount - $newPaidAmount, 0);
            $changeAmount = max($newPaidAmount - $totalAmount, 0);

            $paymentStatus = $remainingAmount > 0
                ? self::PAYMENT_STATUS_BELUM_LUNAS
                : self::PAYMENT_STATUS_LUNAS;

            $paymentType = $paymentStatus === self::PAYMENT_STATUS_BELUM_LUNAS
                ? self::PAYMENT_TYPE_DP
                : self::PAYMENT_TYPE_LUNAS;

            if ($existingPayment) {
                $existingPayment->payment_id = $validated['payment_id'];
                $existingPayment->cashier_user_id = auth()->id();
                $existingPayment->payment_type = $paymentType;
                $existingPayment->total_amount = $totalAmount;
                $existingPayment->paid_amount = $newPaidAmount;
                $existingPayment->change_amount = $changeAmount;
                $existingPayment->remaining_amount = $remainingAmount;
                $existingPayment->payment_status = $paymentStatus;
                $existingPayment->save();
            } else {
                $payment = new EventPayment();
                $payment->id = (string) Str::uuid();
                $payment->event_carts_id = $cart->id;
                $payment->payment_id = $validated['payment_id'];
                $payment->cashier_user_id = auth()->id();
                $payment->payment_type = $paymentType;
                $payment->total_amount = $totalAmount;
                $payment->paid_amount = $newPaidAmount;
                $payment->dp_amount = $paymentType === self::PAYMENT_TYPE_DP ? $inputPaidAmount : 0;
                $payment->change_amount = $changeAmount;
                $payment->remaining_amount = $remainingAmount;
                $payment->payment_status = $paymentStatus;
                $payment->save();
            }

           EventCart::query()
    ->where('id', $cart->id)
    ->update([
        'status' => self::STATUS_PAID,
        'updated_at' => now(),
    ]);

            $loadedCart = $this->loadCart($cart->id);

            return response()->json([
                'success' => true,
                'message' => $paymentStatus === self::PAYMENT_STATUS_LUNAS
                    ? 'Pembayaran berhasil disimpan. Status Lunas.'
                    : 'Pembayaran DP berhasil disimpan. Status Belum Lunas.',
                'data' => $loadedCart,
                'nota' => $loadedCart->nota,
            ]);
        });
    }

    private function loadCart(string $id)
    {
        $cart = EventCart::query()
            ->with([
                'event:id,nama_event,alamat_event,valid_from,valid_until',
                'details:id,event_carts_id,produk_price_id,qty,manual_discount_type,manual_discount_value',
                'details.produkPrice:id,produk_id,event_id,tipe_harga,nama_bundle,harga_produk',
                'details.produkPrice.produk:id,nama_produk,product_number,code_gs1',
                'details.produkPrice.bundleDetails:id,produk_price_id,produk_id,qty',
                'details.produkPrice.bundleDetails.produk:id,nama_produk,product_number,code_gs1',
                'payment',
                'payment.payment',
                'payment.cashier:id,name,email',
            ])
            ->findOrFail($id);

        return $this->appendCartSummary($cart);
    }

    private function appendCartSummary(EventCart $cart)
    {
        $items = $cart->details->map(function ($detail) use ($cart) {
            $qty = (int) $detail->qty;
            $pricing = $this->calculateLinePricing($detail->produkPrice, $qty, $detail);

            $stock = $this->getStockSummary(
                $cart->event_id,
                $detail->produk_price_id
            );

            $detail->base_price_amount = $pricing['base_price_amount'];
            $detail->price_amount = $pricing['price_amount'];
            $detail->subtotal_amount = $pricing['subtotal_amount'];
            $detail->discount_source = $pricing['discount_source'];
            $detail->discount_type = $pricing['discount_type'];
            $detail->discount_value = $pricing['discount_value'];
            $detail->discount_amount_per_unit = $pricing['discount_amount_per_unit'];
            $detail->discount_total_amount = $pricing['discount_total_amount'];
            $detail->discount_label = $pricing['discount_label'];
            $detail->applied_discount_tier = $pricing['applied_discount_tier'];
            $detail->can_manual_discount = $pricing['discount_source'] !== 'price_tier';
            $detail->stock_masuk = $stock['stock_masuk'];
            $detail->stock_terpakai = $stock['stock_terpakai'];
            $detail->stock_terakhir = $stock['stock_terakhir'];
            $detail->stock_available_for_line = $stock['stock_available_for_line'];
            $detail->bundle_components = $stock['bundle_components'] ?? [];

            if ($detail->produkPrice) {
                $detail->produkPrice->stock_masuk = $stock['stock_masuk'];
                $detail->produkPrice->stock_terpakai = $stock['stock_terpakai'];
                $detail->produkPrice->stock_terakhir = $stock['stock_terakhir'];
                $detail->produkPrice->stock_available_for_line = $stock['stock_available_for_line'];
                $detail->produkPrice->bundle_components = $stock['bundle_components'] ?? [];
            }

            return $detail;
        });

        $cart->total_qty = $items->sum('qty');
        $cart->total_amount = $items->sum('subtotal_amount');
        $cart->transaction_type = $this->getCartType($cart);
        $cart->nota = $this->buildNotaData($cart);

        return $cart;
    }

    private function buildNotaData(EventCart $cart): array
    {
        $payment = $cart->payment;
        $paymentMethod = $payment?->payment?->payment
            ?? $payment?->payment?->nama_payment
            ?? $payment?->payment?->name
            ?? $payment?->payment?->code
            ?? '-';

        $items = $cart->details->map(function ($detail) {
            $produkPrice = $detail->produkPrice;
            $produk = $produkPrice?->produk;
            $isBundle = $produkPrice && $this->isBundlePrice($produkPrice);

            $basePrice = (float) ($detail->base_price_amount ?? $produkPrice?->harga_produk ?? 0);
            $price = (float) ($detail->price_amount ?? $basePrice);
            $qty = (int) $detail->qty;
            $subtotal = (float) ($detail->subtotal_amount ?? ($price * $qty));

            $bundleDetails = $isBundle
                ? $produkPrice->bundleDetails->map(function ($bundleDetail) {
                    return [
                        'produk_id' => $bundleDetail->produk_id,
                        'nama_produk' => $bundleDetail->produk?->nama_produk ?? '-',
                        'product_number' => $bundleDetail->produk?->product_number ?? '-',
                        'code_gs1' => $bundleDetail->produk?->code_gs1 ?? '-',
                        'qty' => (int) ($bundleDetail->qty ?? 1),
                    ];
                })->values()
                : collect();

            return [
                'produk_id' => $produkPrice?->produk_id,
                'produk_price_id' => $detail->produk_price_id,
                'tipe_harga' => $isBundle ? 'bundle' : 'single',
                'nama_bundle' => $isBundle ? ($produkPrice?->nama_bundle ?? 'Bundle Tanpa Nama') : null,
                'nama_produk' => $isBundle
                    ? ($produkPrice?->nama_bundle ?? 'Bundle Tanpa Nama')
                    : ($produk?->nama_produk ?? '-'),
                'product_number' => $isBundle ? 'BUNDLE' : ($produk?->product_number ?? '-'),
                'code_gs1' => $isBundle ? '-' : ($produk?->code_gs1 ?? '-'),
                'qty' => $qty,
                'harga_awal' => $basePrice,
                'harga' => $price,
                'subtotal' => $subtotal,
                'discount_source' => $detail->discount_source ?? 'none',
                'discount_type' => $detail->discount_type ?? null,
                'discount_value' => (float) ($detail->discount_value ?? 0),
                'discount_amount_per_unit' => (float) ($detail->discount_amount_per_unit ?? 0),
                'discount_total_amount' => (float) ($detail->discount_total_amount ?? 0),
                'discount_label' => $detail->discount_label ?? null,
                'bundle_details' => $bundleDetails,
                'bundleDetails' => $bundleDetails,
            ];
        })->values();

        return [
            'title' => 'NOTA PEMBAYARAN',
            'invoice' => [
                'id' => $cart->id,
                'no_invoice' => $cart->no_invoice,
                'tanggal' => optional($cart->tanggal_carts)->format('Y-m-d') ?: $cart->tanggal_carts,
                'status' => $cart->status,
                'customer' => $cart->customer ?: 'Walk In Customer',
            ],
            'event' => [
                'id' => $cart->event?->id,
                'nama_event' => $cart->event?->nama_event ?? '-',
                'alamat_event' => $cart->event?->alamat_event ?? '-',
            ],
            'cashier' => [
                'id' => $payment?->cashier?->id ?? auth()->id(),
                'name' => $payment?->cashier?->name ?? auth()->user()?->name ?? '-',
                'email' => $payment?->cashier?->email ?? auth()->user()?->email ?? '-',
            ],
            'payment' => [
                'payment_id' => $payment?->payment_id,
                'payment_method' => $paymentMethod,
                'payment_type' => $payment?->payment_type ?? null,
                'payment_status' => $payment?->payment_status ?? $cart->status,
                'total_amount' => (float) ($payment?->total_amount ?? $cart->total_amount ?? 0),
                'paid_amount' => (float) ($payment?->paid_amount ?? 0),
                'dp_amount' => (float) ($payment?->dp_amount ?? 0),
                'change_amount' => (float) ($payment?->change_amount ?? 0),
                'remaining_amount' => (float) ($payment?->remaining_amount ?? 0),
            ],
            'summary' => [
                'total_qty' => (int) ($cart->total_qty ?? 0),
                'total_amount' => (float) ($cart->total_amount ?? 0),
            ],
            'items' => $items,
            'printed_at' => now()->format('Y-m-d H:i:s'),
        ];
    }

    private function calculateLinePricing(?ProdukPrice $produkPrice, int $qty, ?EventCartDetail $detail = null): array
    {
        $qty = max((int) $qty, 1);
        $basePrice = (float) ($produkPrice?->harga_produk ?? 0);
        $discountSource = 'none';
        $discountType = null;
        $discountValue = 0.0;
        $discountAmountPerUnit = 0.0;
        $discountLabel = null;
        $appliedTier = null;

        if ($produkPrice) {
            $tier = $this->getProdukPriceDiscountForQty($produkPrice->id, $qty);

            if ($tier) {
                $discountSource = 'price_tier';
                $discountType = $tier->discount_type;
                $discountValue = (float) $tier->discount_value;
                $discountAmountPerUnit = $this->calculateDiscountAmount($basePrice, $discountType, $discountValue);
                $discountLabel = $this->formatDiscountLabel('Diskon Qty', $discountType, $discountValue, (int) $tier->min_qty, $tier->max_qty !== null ? (int) $tier->max_qty : null);
                $appliedTier = [
                    'id' => $tier->id,
                    'min_qty' => (int) $tier->min_qty,
                    'max_qty' => $tier->max_qty !== null ? (int) $tier->max_qty : null,
                    'discount_type' => $tier->discount_type,
                    'discount_value' => (float) $tier->discount_value,
                ];
            }
        }

        if ($discountSource !== 'price_tier' && $detail) {
            $manualType = $detail->manual_discount_type ?: null;
            $manualValue = (float) ($detail->manual_discount_value ?? 0);

            if (in_array($manualType, ['percent', 'nominal'], true) && $manualValue > 0) {
                $discountSource = 'manual';
                $discountType = $manualType;
                $discountValue = $manualValue;
                $discountAmountPerUnit = $this->calculateDiscountAmount($basePrice, $discountType, $discountValue);
                $discountLabel = $this->formatDiscountLabel('Diskon Manual', $discountType, $discountValue);
            }
        }

        $discountAmountPerUnit = min($discountAmountPerUnit, $basePrice);
        $finalPrice = max($basePrice - $discountAmountPerUnit, 0);
        $subtotal = $finalPrice * $qty;

        return [
            'base_price_amount' => $basePrice,
            'price_amount' => $finalPrice,
            'subtotal_amount' => $subtotal,
            'discount_source' => $discountSource,
            'discount_type' => $discountType,
            'discount_value' => $discountValue,
            'discount_amount_per_unit' => $discountAmountPerUnit,
            'discount_total_amount' => $discountAmountPerUnit * $qty,
            'discount_label' => $discountLabel,
            'applied_discount_tier' => $appliedTier,
        ];
    }

    private function calculateDiscountAmount(float $basePrice, ?string $discountType, float $discountValue): float
    {
        if ($basePrice <= 0 || $discountValue <= 0) {
            return 0;
        }

        if ($discountType === 'percent') {
            return round($basePrice * (min($discountValue, 100) / 100), 2);
        }

        if ($discountType === 'nominal') {
            return min($discountValue, $basePrice);
        }

        return 0;
    }

    private function getProdukPriceDiscountForQty(string $produkPriceId, int $qty): ?object
    {
        if (!$this->discountTableExists()) {
            return null;
        }

        return DB::table('produk_price_discounts')
            ->where('produk_price_id', $produkPriceId)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('min_qty', '<=', $qty)
            ->where(function ($query) use ($qty) {
                $query->whereNull('max_qty')
                    ->orWhere('max_qty', '>=', $qty);
            })
            ->orderByDesc('min_qty')
            ->first();
    }

    private function getProdukPriceDiscountTiers(string $produkPriceId)
    {
        if (!$this->discountTableExists()) {
            return collect();
        }

        return DB::table('produk_price_discounts')
            ->where('produk_price_id', $produkPriceId)
            ->whereNull('deleted_at')
            ->orderBy('min_qty')
            ->get()
            ->map(fn ($tier) => [
                'id' => $tier->id,
                'min_qty' => (int) $tier->min_qty,
                'max_qty' => $tier->max_qty !== null ? (int) $tier->max_qty : null,
                'discount_type' => $tier->discount_type,
                'discount_value' => (float) $tier->discount_value,
                'is_active' => (bool) $tier->is_active,
            ])
            ->values();
    }

    private function discountTableExists(): bool
    {
        static $exists = null;

        if ($exists === null) {
            $exists = \Illuminate\Support\Facades\Schema::hasTable('produk_price_discounts');
        }

        return $exists;
    }

    private function formatDiscountLabel(string $prefix, ?string $discountType, float $discountValue, ?int $minQty = null, ?int $maxQty = null): string
    {
        $value = $discountType === 'percent'
            ? rtrim(rtrim(number_format($discountValue, 2, ',', '.'), '0'), ',') . '%'
            : 'Rp ' . number_format($discountValue, 0, ',', '.');

        $range = '';

        if ($minQty !== null) {
            $range = $maxQty !== null
                ? " ({$minQty}-{$maxQty})"
                : " (≥{$minQty})";
        }

        return trim($prefix . $range . ' ' . $value);
    }

    private function getCartType(EventCart $cart): string
    {
        return $cart->transaction_type === self::CART_TYPE_PO
            ? self::CART_TYPE_PO
            : self::CART_TYPE_PEMBELIAN;
    }

    private function isPoCart(EventCart $cart): bool
    {
        return $this->getCartType($cart) === self::CART_TYPE_PO;
    }

    private function getStockSummary(
        string $eventId,
        string $produkPriceId,
        ?string $excludeDetailId = null
    ): array {
        $produkPrice = ProdukPrice::query()
            ->with([
                'produk:id,nama_produk,product_number,code_gs1',
                'bundleDetails:id,produk_price_id,produk_id,qty',
                'bundleDetails.produk:id,nama_produk,product_number,code_gs1',
            ])
            ->find($produkPriceId);

        if (!$produkPrice) {
            return $this->emptyStockSummary();
        }

        if ($this->isBundlePrice($produkPrice)) {
            return $this->getBundleStockSummary($eventId, $produkPrice, $excludeDetailId);
        }

        return $this->getSingleStockSummary($eventId, $produkPrice, $excludeDetailId);
    }

    private function getSingleStockSummary(
        string $eventId,
        ProdukPrice $produkPrice,
        ?string $excludeDetailId = null
    ): array {
        $produkPriceId = $produkPrice->id;
        $produkId = $produkPrice->produk_id;

        $stockMasuk = (int) DB::table('event_inbound')
            ->where('event_id', $eventId)
            ->where('produk_price_id', $produkPriceId)
            ->whereNull('deleted_at')
            ->sum('jumlah_produk');

        $stockTerpakaiTanpaItemIni = $this->getSingleStockUsed(
            $eventId,
            $produkPriceId,
            $produkId,
            $excludeDetailId
        );

        $stockTerpakaiSemua = $this->getSingleStockUsed(
            $eventId,
            $produkPriceId,
            $produkId
        );

        $stockTerakhir = max($stockMasuk - $stockTerpakaiSemua, 0);

        return [
            'stock_masuk' => $stockMasuk,
            'stock_terpakai' => $stockTerpakaiSemua,
            'stock_terakhir' => $stockTerakhir,
            'stock_available_for_line' => max($stockMasuk - $stockTerpakaiTanpaItemIni, 0),
        ];
    }

    private function getBundleStockSummary(
        string $eventId,
        ProdukPrice $bundlePrice,
        ?string $excludeDetailId = null
    ): array {
        $components = [];
        $bundleStockMasuk = null;
        $bundleStockTerakhir = null;
        $bundleAvailableForLine = null;

        foreach ($bundlePrice->bundleDetails as $bundleDetail) {
            $componentQty = max((int) ($bundleDetail->qty ?? 1), 1);

            $singleProdukPrice = ProdukPrice::query()
                ->with('produk:id,nama_produk,product_number,code_gs1')
                ->where('event_id', $eventId)
                ->where('produk_id', $bundleDetail->produk_id)
                ->where(function ($query) {
                    $query->whereNull('tipe_harga')
                        ->orWhere('tipe_harga', 'single');
                })
                ->first();

            if (!$singleProdukPrice) {
                $components[] = [
                    'produk_id' => $bundleDetail->produk_id,
                    'nama_produk' => $bundleDetail->produk?->nama_produk ?? '-',
                    'qty_per_bundle' => $componentQty,
                    'stock_masuk' => 0,
                    'stock_terpakai' => 0,
                    'stock_terakhir' => 0,
                    'stock_available_for_line' => 0,
                    'message' => 'Harga produk satuan untuk isi bundle belum tersedia pada event ini.',
                ];

                $bundleStockMasuk = 0;
                $bundleStockTerakhir = 0;
                $bundleAvailableForLine = 0;

                continue;
            }

            $componentStock = $this->getSingleStockSummary(
                $eventId,
                $singleProdukPrice,
                $excludeDetailId
            );

            $possibleMasuk = intdiv((int) $componentStock['stock_masuk'], $componentQty);
            $possibleTerakhir = intdiv((int) $componentStock['stock_terakhir'], $componentQty);
            $possibleAvailable = intdiv((int) $componentStock['stock_available_for_line'], $componentQty);

            $bundleStockMasuk = is_null($bundleStockMasuk)
                ? $possibleMasuk
                : min($bundleStockMasuk, $possibleMasuk);

            $bundleStockTerakhir = is_null($bundleStockTerakhir)
                ? $possibleTerakhir
                : min($bundleStockTerakhir, $possibleTerakhir);

            $bundleAvailableForLine = is_null($bundleAvailableForLine)
                ? $possibleAvailable
                : min($bundleAvailableForLine, $possibleAvailable);

            $components[] = [
                'produk_id' => $bundleDetail->produk_id,
                'produk_price_id' => $singleProdukPrice->id,
                'nama_produk' => $bundleDetail->produk?->nama_produk ?? $singleProdukPrice->produk?->nama_produk ?? '-',
                'product_number' => $bundleDetail->produk?->product_number ?? $singleProdukPrice->produk?->product_number ?? '-',
                'code_gs1' => $bundleDetail->produk?->code_gs1 ?? $singleProdukPrice->produk?->code_gs1 ?? '-',
                'qty_per_bundle' => $componentQty,
                'stock_masuk' => $componentStock['stock_masuk'],
                'stock_terpakai' => $componentStock['stock_terpakai'],
                'stock_terakhir' => $componentStock['stock_terakhir'],
                'stock_available_for_line' => $componentStock['stock_available_for_line'],
                'bundle_stock_masuk' => $possibleMasuk,
                'bundle_stock_terakhir' => $possibleTerakhir,
                'bundle_stock_available_for_line' => $possibleAvailable,
            ];
        }

        $stockMasuk = (int) ($bundleStockMasuk ?? 0);
        $stockTerakhir = (int) ($bundleStockTerakhir ?? 0);
        $stockAvailableForLine = (int) ($bundleAvailableForLine ?? 0);

        return [
            'stock_masuk' => $stockMasuk,
            'stock_terpakai' => max($stockMasuk - $stockTerakhir, 0),
            'stock_terakhir' => $stockTerakhir,
            'stock_available_for_line' => $stockAvailableForLine,
            'bundle_components' => $components,
        ];
    }

    private function getSingleStockUsed(
        string $eventId,
        string $singleProdukPriceId,
        ?string $produkId = null,
        ?string $excludeDetailId = null
    ): int {
        $directUsageQuery = DB::table('event_carts_detail as ecd')
            ->join('event_carts as ec', 'ec.id', '=', 'ecd.event_carts_id')
            ->where('ecd.produk_price_id', $singleProdukPriceId)
            ->where('ec.event_id', $eventId)
            ->whereIn('ec.status', [
                self::STATUS_DRAFT,
                self::STATUS_PAID,
            ])
            ->where(function ($query) {
                $query->whereNull('ec.transaction_type')
                    ->orWhere('ec.transaction_type', self::CART_TYPE_PEMBELIAN);
            })
            ->whereNull('ecd.deleted_at')
            ->whereNull('ec.deleted_at');

        if ($excludeDetailId) {
            $directUsageQuery->where('ecd.id', '!=', $excludeDetailId);
        }

        $directUsage = (int) $directUsageQuery->sum('ecd.qty');

        $bundleUsage = 0;

        if ($produkId) {
            $bundleUsageQuery = DB::table('event_carts_detail as ecd')
                ->join('event_carts as ec', 'ec.id', '=', 'ecd.event_carts_id')
                ->join('produk_price as pp', 'pp.id', '=', 'ecd.produk_price_id')
                ->join('produk_price_details as ppd', 'ppd.produk_price_id', '=', 'pp.id')
                ->where('ec.event_id', $eventId)
                ->where('ppd.produk_id', $produkId)
                ->where('pp.tipe_harga', 'bundle')
                ->whereIn('ec.status', [
                    self::STATUS_DRAFT,
                    self::STATUS_PAID,
                ])
                ->where(function ($query) {
                    $query->whereNull('ec.transaction_type')
                        ->orWhere('ec.transaction_type', self::CART_TYPE_PEMBELIAN);
                })
                ->whereNull('ecd.deleted_at')
                ->whereNull('ec.deleted_at')
                ->whereNull('pp.deleted_at')
                ->whereNull('ppd.deleted_at');

            if ($excludeDetailId) {
                $bundleUsageQuery->where('ecd.id', '!=', $excludeDetailId);
            }

            $bundleUsage = (int) $bundleUsageQuery->sum(DB::raw('ecd.qty * ppd.qty'));
        }

        return $directUsage + $bundleUsage;
    }

    private function emptyStockSummary(): array
    {
        return [
            'stock_masuk' => 0,
            'stock_terpakai' => 0,
            'stock_terakhir' => 0,
            'stock_available_for_line' => 0,
        ];
    }

    private function isBundlePrice(ProdukPrice $produkPrice): bool
    {
        return ($produkPrice->tipe_harga ?? null) === 'bundle';
    }

    private function formatProdukPriceOption(ProdukPrice $produkPrice): array
    {
        $produk = $produkPrice->produk;

        $tipeHarga = $produkPrice->tipe_harga
            ?: ($produkPrice->nama_bundle ? 'bundle' : 'single');

        $isBundle = $tipeHarga === 'bundle';

        $namaProduk = $isBundle
            ? ($produkPrice->nama_bundle ?: 'Bundle Tanpa Nama')
            : ($produk?->nama_produk ?? '-');

        $productNumber = $isBundle
            ? 'BUNDLE'
            : ($produk?->product_number ?? '-');

        $codeGs1 = $isBundle
            ? ''
            : ($produk?->code_gs1 ?? '-');

        $bundleDetails = $produkPrice->bundleDetails
            ->map(function ($detail) {
                return [
                    'id' => $detail->id,
                    'produk_price_id' => $detail->produk_price_id,
                    'produk_id' => $detail->produk_id,
                    'qty' => (int) ($detail->qty ?? 1),
                    'produk' => [
                        'id' => $detail->produk?->id,
                        'nama_produk' => $detail->produk?->nama_produk ?? '-',
                        'product_number' => $detail->produk?->product_number ?? '-',
                        'code_gs1' => $detail->produk?->code_gs1 ?? '-',
                    ],
                ];
            })
            ->values();

        return [
            'id' => $produkPrice->id,
            'produk_price_id' => $produkPrice->id,
            'product_price_id' => $produkPrice->id,

            'produk_id' => $produkPrice->produk_id,
            'event_id' => $produkPrice->event_id,

            'tipe_harga' => $tipeHarga,
            'nama_bundle' => $isBundle ? $produkPrice->nama_bundle : null,

            'harga_produk' => (float) ($produkPrice->harga_produk ?? 0),
            'price' => (float) ($produkPrice->harga_produk ?? 0),

            'nama_produk' => $namaProduk,
            'product_name' => $namaProduk,
            'product_number' => $productNumber,
            'code_gs1' => $codeGs1,

            'produk' => $isBundle
                ? null
                : [
                    'id' => $produk?->id,
                    'nama_produk' => $produk?->nama_produk ?? '-',
                    'product_number' => $produk?->product_number ?? '-',
                    'code_gs1' => $produk?->code_gs1 ?? '-',
                ],

            'discount_tiers' => $this->getProdukPriceDiscountTiers($produkPrice->id),
            'discountTiers' => $this->getProdukPriceDiscountTiers($produkPrice->id),

            'bundle_details' => $bundleDetails,
            'bundleDetails' => $bundleDetails,
        ];
    }

    private function ensureActiveEvent(string $eventId): void
    {
        $isActive = DataEvent::query()
            ->where('id', $eventId)
            ->whereDate('valid_until', '>=', now()->toDateString())
            ->exists();

        if (!$isActive) {
            abort(response()->json([
                'message' => 'Event sudah terlewat dan tidak bisa digunakan untuk transaksi POS.',
                'errors' => [
                    'event_id' => [
                        'Event sudah terlewat dan tidak bisa digunakan untuk transaksi POS.',
                    ],
                ],
            ], 422));
        }
    }

    private function autoVoidExpiredDraftCarts(): void
    {
        $today = now()->toDateString();

        EventCart::query()
            ->where('status', self::STATUS_DRAFT)
            ->whereDate('tanggal_carts', '<', $today)
            ->whereNull('deleted_at')
            ->update([
                'status' => self::STATUS_VOID_CARTS,
                'updated_at' => now(),
            ]);
    }

    private function generateInvoiceNumber(): string
    {
        $prefix = 'INV-' . now()->format('Ymd');

        $lastNumber = EventCart::query()
            ->whereDate('created_at', now()->toDateString())
            ->where('no_invoice', 'like', $prefix . '%')
            ->count() + 1;

        return $prefix . '-' . str_pad((string) $lastNumber, 4, '0', STR_PAD_LEFT);
    }
}