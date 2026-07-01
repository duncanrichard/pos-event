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

class PosController extends Controller
{
    private const STATUS_DRAFT = 'Draft';
    private const STATUS_PAID = 'Paid';
    private const STATUS_VOID_CARTS = 'Void Carts';
    private const STATUS_VOID_TRANSAKSI = 'Void Transaksi';
    private const STATUS_VOID_OLD = 'Void';

    private const CART_TYPE_PO = 'PO';
    private const CART_TYPE_PEMBELIAN = 'Pembelian';

    public function options()
    {
        $this->autoVoidExpiredDraftCarts();

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
            ->with([
                'produk:id,nama_produk,product_number,code_gs1',
            ])
            ->select('id', 'produk_id', 'event_id', 'harga_produk')
            ->orderBy('event_id')
            ->get()
            ->map(function ($produkPrice) {
                $produk = $produkPrice->produk;

                return [
                    'id' => $produkPrice->id,
                    'produk_price_id' => $produkPrice->id,
                    'product_price_id' => $produkPrice->id,
                    'produk_id' => $produkPrice->produk_id,
                    'event_id' => $produkPrice->event_id,
                    'harga_produk' => (float) ($produkPrice->harga_produk ?? 0),
                    'price' => (float) ($produkPrice->harga_produk ?? 0),
                    'nama_produk' => $produk?->nama_produk ?? '-',
                    'product_name' => $produk?->nama_produk ?? '-',
                    'product_number' => $produk?->product_number ?? '-',
                    'code_gs1' => $produk?->code_gs1 ?? '-',
                    'produk' => [
                        'id' => $produk?->id,
                        'nama_produk' => $produk?->nama_produk ?? '-',
                        'product_number' => $produk?->product_number ?? '-',
                        'code_gs1' => $produk?->code_gs1 ?? '-',
                    ],
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Data pilihan POS berhasil dimuat.',
            'data' => [
                'events' => DataEvent::query()
                    ->select('id', 'nama_event', 'alamat_event', 'valid_from', 'valid_until')
                    ->orderByDesc('valid_from')
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
                'details:id,event_carts_id,produk_price_id,qty',
                'details.produkPrice:id,produk_id,event_id,harga_produk',
                'details.produkPrice.produk:id,nama_produk,product_number,code_gs1',
                'payment:id,event_carts_id,payment_id,total_amount,paid_amount,change_amount,payment_status,cashier_user_id',
                'payment.payment:id,payment',
                'payment.cashier:id,name,email',
            ])
            ->where('status', $status)
            ->whereDate('tanggal_carts', $today)
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('no_invoice', 'ilike', '%' . $search . '%')
                        ->orWhere('customer', 'ilike', '%' . $search . '%')
                        ->orWhereHas('event', function ($eventQuery) use ($search) {
                            $eventQuery->where('nama_event', 'ilike', '%' . $search . '%');
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

            $produkPriceId = $validated['produk_price_id'] ?? null;
            $codeGs1 = trim((string) ($validated['code_gs1'] ?? ''));

            $produkPriceQuery = ProdukPrice::query()
                ->with('produk:id,nama_produk,product_number,code_gs1')
                ->where('event_id', $cart->event_id);

            if ($produkPriceId) {
                $produkPriceQuery->where('id', $produkPriceId);
            } else {
                $produkPriceQuery->whereHas('produk', function ($query) use ($codeGs1) {
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
                return response()->json([
                    'message' => 'Stok produk tidak mencukupi.',
                    'errors' => [
                        'code_gs1' => [
                            'Stok tidak mencukupi. Stok terakhir: ' . $stock['stock_terakhir'] .
                            '. Maksimal qty untuk item ini: ' . $stock['stock_available_for_line'],
                        ],
                    ],
                    'stock' => [
                        'stock_masuk' => $stock['stock_masuk'],
                        'stock_terpakai' => $stock['stock_terpakai'],
                        'stock_terakhir' => $stock['stock_terakhir'],
                        'stock_available_for_line' => $stock['stock_available_for_line'],
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
                'message' => 'Produk berhasil ditambahkan ke invoice.',
                'data' => $this->loadCart($cart->id),
            ]);
        });
    }

    public function updateItem(Request $request, string $cartId, string $detailId)
    {
        $this->autoVoidExpiredDraftCarts();

        $validated = $request->validate([
            'qty' => ['required', 'integer', 'min:1'],
        ], [
            'qty.required' => 'Qty wajib diisi.',
            'qty.integer' => 'Qty harus berupa angka bulat.',
            'qty.min' => 'Qty minimal 1.',
        ]);

        return DB::transaction(function () use ($cartId, $detailId, $validated) {
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

            $nextQty = (int) $validated['qty'];

            $stock = $this->getStockSummary(
                $cart->event_id,
                $detail->produk_price_id,
                $detail->id
            );

            if (!$this->isPoCart($cart) && $nextQty > $stock['stock_available_for_line']) {
                return response()->json([
                    'message' => 'Stok produk tidak mencukupi.',
                    'errors' => [
                        'qty' => [
                            'Stok tidak mencukupi. Stok terakhir: ' . $stock['stock_terakhir'] .
                            '. Maksimal qty untuk item ini: ' . $stock['stock_available_for_line'],
                        ],
                    ],
                    'stock' => [
                        'stock_masuk' => $stock['stock_masuk'],
                        'stock_terpakai' => $stock['stock_terpakai'],
                        'stock_terakhir' => $stock['stock_terakhir'],
                        'stock_available_for_line' => $stock['stock_available_for_line'],
                    ],
                ], 422);
            }

            $detail->update([
                'qty' => $nextQty,
            ]);

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
            'paid_amount' => ['required', 'numeric', 'min:0'],
        ], [
            'payment_id.required' => 'Metode pembayaran wajib dipilih.',
            'payment_id.uuid' => 'Metode pembayaran tidak valid.',
            'payment_id.exists' => 'Metode pembayaran tidak ditemukan.',
            'paid_amount.required' => 'Jumlah bayar wajib diisi.',
            'paid_amount.numeric' => 'Jumlah bayar harus berupa angka.',
            'paid_amount.min' => 'Jumlah bayar tidak boleh kurang dari 0.',
        ]);

        return DB::transaction(function () use ($id, $validated) {
            $cart = EventCart::query()
                ->where('status', self::STATUS_DRAFT)
                ->whereDate('tanggal_carts', now()->toDateString())
                ->with([
                    'details.produkPrice:id,produk_id,event_id,harga_produk',
                    'payment',
                ])
                ->lockForUpdate()
                ->findOrFail($id);

            if ($cart->payment) {
                return response()->json([
                    'message' => 'Invoice ini sudah memiliki pembayaran.',
                    'errors' => [
                        'payment' => ['Invoice ini sudah memiliki pembayaran.'],
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

            if (!$this->isPoCart($cart)) {
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

            $totalAmount = $cart->details->sum(function ($detail) {
                return (float) ($detail->produkPrice->harga_produk ?? 0) * (int) $detail->qty;
            });

            $paidAmount = (float) $validated['paid_amount'];
            $changeAmount = $paidAmount - $totalAmount;

            if ($paidAmount < $totalAmount) {
                return response()->json([
                    'message' => 'Jumlah bayar kurang dari total transaksi.',
                    'errors' => [
                        'paid_amount' => ['Jumlah bayar kurang dari total transaksi.'],
                    ],
                ], 422);
            }

            EventPayment::create([
                'event_carts_id' => $cart->id,
                'payment_id' => $validated['payment_id'],
                'cashier_user_id' => auth()->id(),
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'change_amount' => $changeAmount,
                'payment_status' => self::STATUS_PAID,
            ]);

            $cart->update([
                'status' => self::STATUS_PAID,
            ]);

            $loadedCart = $this->loadCart($cart->id);

            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil disimpan.',
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
                'details:id,event_carts_id,produk_price_id,qty',
                'details.produkPrice:id,produk_id,event_id,harga_produk',
                'details.produkPrice.produk:id,nama_produk,product_number,code_gs1',
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
            $price = (float) ($detail->produkPrice->harga_produk ?? 0);
            $qty = (int) $detail->qty;
            $subtotal = $price * $qty;

            $stock = $this->getStockSummary(
                $cart->event_id,
                $detail->produk_price_id
            );

            $detail->price_amount = $price;
            $detail->subtotal_amount = $subtotal;
            $detail->stock_masuk = $stock['stock_masuk'];
            $detail->stock_terpakai = $stock['stock_terpakai'];
            $detail->stock_terakhir = $stock['stock_terakhir'];

            if ($detail->produkPrice) {
                $detail->produkPrice->stock_masuk = $stock['stock_masuk'];
                $detail->produkPrice->stock_terpakai = $stock['stock_terpakai'];
                $detail->produkPrice->stock_terakhir = $stock['stock_terakhir'];
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
            $produk = $detail->produkPrice?->produk;
            $price = (float) ($detail->price_amount ?? $detail->produkPrice?->harga_produk ?? 0);
            $qty = (int) $detail->qty;
            $subtotal = (float) ($detail->subtotal_amount ?? ($price * $qty));

            return [
                'produk_id' => $detail->produkPrice?->produk_id,
                'produk_price_id' => $detail->produk_price_id,
                'nama_produk' => $produk?->nama_produk ?? '-',
                'product_number' => $produk?->product_number ?? '-',
                'code_gs1' => $produk?->code_gs1 ?? '-',
                'qty' => $qty,
                'harga' => $price,
                'subtotal' => $subtotal,
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
                'payment_status' => $payment?->payment_status ?? $cart->status,
                'total_amount' => (float) ($payment?->total_amount ?? $cart->total_amount ?? 0),
                'paid_amount' => (float) ($payment?->paid_amount ?? 0),
                'change_amount' => (float) ($payment?->change_amount ?? 0),
            ],
            'summary' => [
                'total_qty' => (int) ($cart->total_qty ?? 0),
                'total_amount' => (float) ($cart->total_amount ?? 0),
            ],
            'items' => $items,
            'printed_at' => now()->format('Y-m-d H:i:s'),
        ];
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
        $stockMasuk = (int) DB::table('event_inbound')
            ->where('event_id', $eventId)
            ->where('produk_price_id', $produkPriceId)
            ->whereNull('deleted_at')
            ->sum('jumlah_produk');

        $stockTerpakaiTanpaItemIniQuery = DB::table('event_carts_detail as ecd')
            ->join('event_carts as ec', 'ec.id', '=', 'ecd.event_carts_id')
            ->where('ecd.produk_price_id', $produkPriceId)
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
            $stockTerpakaiTanpaItemIniQuery->where('ecd.id', '!=', $excludeDetailId);
        }

        $stockTerpakaiTanpaItemIni = (int) $stockTerpakaiTanpaItemIniQuery->sum('ecd.qty');

        $stockTerpakaiSemua = (int) DB::table('event_carts_detail as ecd')
            ->join('event_carts as ec', 'ec.id', '=', 'ecd.event_carts_id')
            ->where('ecd.produk_price_id', $produkPriceId)
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
            ->whereNull('ec.deleted_at')
            ->sum('ecd.qty');

        $stockTerakhir = max($stockMasuk - $stockTerpakaiSemua, 0);

        return [
            'stock_masuk' => $stockMasuk,
            'stock_terpakai' => $stockTerpakaiSemua,
            'stock_terakhir' => $stockTerakhir,
            'stock_available_for_line' => max($stockMasuk - $stockTerpakaiTanpaItemIni, 0),
        ];
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