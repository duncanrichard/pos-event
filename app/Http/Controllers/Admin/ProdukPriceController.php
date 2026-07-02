<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataEvent;
use App\Models\Produk;
use App\Models\ProdukPrice;
use App\Models\ProdukPriceDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProdukPriceController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 10);

        if ($perPage <= 0) {
            $perPage = 10;
        }

        if ($perPage > 100) {
            $perPage = 100;
        }

        $rows = ProdukPrice::query()
            ->with([
                'produk:id,nama_produk,product_number,code_gs1',
                'event:id,nama_event,alamat_event,valid_from,valid_until',
                'bundleDetails:id,produk_price_id,produk_id,qty',
                'bundleDetails.produk:id,nama_produk,product_number,code_gs1',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($mainQuery) use ($search) {
                    $keyword = '%' . $search . '%';

                    $mainQuery
                        ->where('nama_bundle', 'ilike', $keyword)
                        ->orWhere('tipe_harga', 'ilike', $keyword)
                        ->orWhereHas('produk', function ($produkQuery) use ($keyword) {
                            $produkQuery
                                ->where('nama_produk', 'ilike', $keyword)
                                ->orWhere('product_number', 'ilike', $keyword)
                                ->orWhere('code_gs1', 'ilike', $keyword);
                        })
                        ->orWhereHas('bundleDetails.produk', function ($produkQuery) use ($keyword) {
                            $produkQuery
                                ->where('nama_produk', 'ilike', $keyword)
                                ->orWhere('product_number', 'ilike', $keyword)
                                ->orWhere('code_gs1', 'ilike', $keyword);
                        })
                        ->orWhereHas('event', function ($eventQuery) use ($keyword) {
                            $eventQuery
                                ->where('nama_event', 'ilike', $keyword)
                                ->orWhere('alamat_event', 'ilike', $keyword);
                        });
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data produk price berhasil dimuat.',
            'data' => $rows,
        ]);
    }

    public function options()
    {
        $today = now()->toDateString();

        return response()->json([
            'success' => true,
            'message' => 'Data pilihan produk price berhasil dimuat.',
            'data' => [
                'produk' => Produk::query()
                    ->select('id', 'nama_produk', 'product_number', 'code_gs1')
                    ->orderBy('nama_produk')
                    ->get(),

                'events' => DataEvent::query()
                    ->select('id', 'nama_event', 'alamat_event', 'valid_from', 'valid_until')
                    ->whereDate('valid_until', '>=', $today)
                    ->orderBy('valid_from')
                    ->orderBy('nama_event')
                    ->get(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatePayload($request);

        return DB::transaction(function () use ($validated) {
            $tipeHarga = $validated['tipe_harga'];

            if ($tipeHarga === 'single') {
                $this->validateSingleDuplicate(
                    produkId: $validated['produk_id'],
                    eventId: $validated['event_id']
                );
            }

            if ($tipeHarga === 'bundle') {
                $this->validateBundleDuplicate(
                    namaBundle: $validated['nama_bundle'],
                    eventId: $validated['event_id']
                );
            }

            $row = ProdukPrice::create([
                'produk_id' => $tipeHarga === 'single' ? $validated['produk_id'] : null,
                'event_id' => $validated['event_id'],
                'tipe_harga' => $tipeHarga,
                'nama_bundle' => $tipeHarga === 'bundle' ? $validated['nama_bundle'] : null,
                'harga_produk' => $validated['harga_produk'],
            ]);

            if ($tipeHarga === 'bundle') {
                $this->syncBundleItems($row, $validated['items']);
            }

            return response()->json([
                'success' => true,
                'message' => $tipeHarga === 'bundle'
                    ? 'Produk bundle berhasil ditambahkan.'
                    : 'Produk price berhasil ditambahkan.',
                'data' => $this->loadProdukPrice($row->id),
            ], 201);
        });
    }

    public function show(string $id)
    {
        $row = $this->loadProdukPrice($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail produk price berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = ProdukPrice::query()->findOrFail($id);

        $validated = $this->validatePayload($request);

        return DB::transaction(function () use ($row, $validated) {
            $tipeHarga = $validated['tipe_harga'];

            if ($tipeHarga === 'single') {
                $this->validateSingleDuplicate(
                    produkId: $validated['produk_id'],
                    eventId: $validated['event_id'],
                    ignoreId: $row->id
                );
            }

            if ($tipeHarga === 'bundle') {
                $this->validateBundleDuplicate(
                    namaBundle: $validated['nama_bundle'],
                    eventId: $validated['event_id'],
                    ignoreId: $row->id
                );
            }

            $row->update([
                'produk_id' => $tipeHarga === 'single' ? $validated['produk_id'] : null,
                'event_id' => $validated['event_id'],
                'tipe_harga' => $tipeHarga,
                'nama_bundle' => $tipeHarga === 'bundle' ? $validated['nama_bundle'] : null,
                'harga_produk' => $validated['harga_produk'],
            ]);

            if ($tipeHarga === 'bundle') {
                $this->syncBundleItems($row, $validated['items']);
            } else {
                ProdukPriceDetail::query()
                    ->where('produk_price_id', $row->id)
                    ->delete();
            }

            return response()->json([
                'success' => true,
                'message' => $tipeHarga === 'bundle'
                    ? 'Produk bundle berhasil diperbarui.'
                    : 'Produk price berhasil diperbarui.',
                'data' => $this->loadProdukPrice($row->id),
            ]);
        });
    }

    public function destroy(string $id)
    {
        $row = ProdukPrice::query()->findOrFail($id);

        DB::transaction(function () use ($row) {
            ProdukPriceDetail::query()
                ->where('produk_price_id', $row->id)
                ->delete();

            $row->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Produk price berhasil dihapus.',
        ]);
    }

    private function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'tipe_harga' => [
                'required',
                'string',
                Rule::in(['single', 'bundle']),
            ],

            'produk_id' => [
                'nullable',
                'uuid',
                'exists:produk,id',
                'required_if:tipe_harga,single',
            ],

            'event_id' => [
                'required',
                'uuid',
                'exists:data_event,id',
            ],

            'nama_bundle' => [
                'nullable',
                'string',
                'max:200',
                'required_if:tipe_harga,bundle',
            ],

            'harga_produk' => [
                'required',
                'numeric',
                'min:0',
            ],

            'items' => [
                'nullable',
                'array',
                'required_if:tipe_harga,bundle',
            ],

            'items.*.produk_id' => [
                'required_if:tipe_harga,bundle',
                'uuid',
                'exists:produk,id',
            ],

            'items.*.qty' => [
                'required_if:tipe_harga,bundle',
                'integer',
                'min:1',
            ],
        ], [
            'tipe_harga.required' => 'Tipe harga wajib dipilih.',
            'tipe_harga.in' => 'Tipe harga hanya boleh single atau bundle.',

            'produk_id.required_if' => 'Produk wajib dipilih untuk harga single.',
            'produk_id.uuid' => 'Format produk tidak valid.',
            'produk_id.exists' => 'Produk tidak ditemukan.',

            'event_id.required' => 'Event wajib dipilih.',
            'event_id.uuid' => 'Format event tidak valid.',
            'event_id.exists' => 'Event tidak ditemukan.',

            'nama_bundle.required_if' => 'Nama bundle wajib diisi.',
            'nama_bundle.max' => 'Nama bundle maksimal 200 karakter.',

            'harga_produk.required' => 'Harga produk wajib diisi.',
            'harga_produk.numeric' => 'Harga produk harus berupa angka.',
            'harga_produk.min' => 'Harga produk tidak boleh kurang dari 0.',

            'items.required_if' => 'Isi bundle wajib diisi.',
            'items.array' => 'Format isi bundle tidak valid.',

            'items.*.produk_id.required_if' => 'Produk bundle wajib dipilih.',
            'items.*.produk_id.uuid' => 'Format produk bundle tidak valid.',
            'items.*.produk_id.exists' => 'Produk bundle tidak ditemukan.',

            'items.*.qty.required_if' => 'Qty bundle wajib diisi.',
            'items.*.qty.integer' => 'Qty bundle harus berupa angka bulat.',
            'items.*.qty.min' => 'Qty bundle minimal 1.',
        ]);

        $validated['tipe_harga'] = $validated['tipe_harga'] ?? 'single';

        if ($validated['tipe_harga'] === 'single') {
            $validated['nama_bundle'] = null;
            $validated['items'] = [];
        }

        if ($validated['tipe_harga'] === 'bundle') {
            $validated['produk_id'] = null;
            $validated['nama_bundle'] = trim((string) ($validated['nama_bundle'] ?? ''));

            $items = collect($validated['items'] ?? [])
                ->filter(function ($item) {
                    return !empty($item['produk_id']) && (int) ($item['qty'] ?? 0) > 0;
                })
                ->map(function ($item) {
                    return [
                        'produk_id' => $item['produk_id'],
                        'qty' => (int) $item['qty'],
                    ];
                })
                ->values();

            if ($items->count() === 0) {
                abort(response()->json([
                    'message' => 'Isi bundle minimal 1 produk.',
                    'errors' => [
                        'items' => ['Isi bundle minimal 1 produk.'],
                    ],
                ], 422));
            }

            // Produk yang sama boleh dimasukkan lebih dari 1 baris pada bundle.
            // Data tidak digabung otomatis agar komposisi bundle tetap sesuai input user.
            $validated['items'] = $items->all();
        }

        return $validated;
    }

    private function validateSingleDuplicate(
        string $produkId,
        string $eventId,
        ?string $ignoreId = null
    ): void {
        $exists = ProdukPrice::query()
            ->where('tipe_harga', 'single')
            ->where('produk_id', $produkId)
            ->where('event_id', $eventId)
            ->when($ignoreId, function ($query) use ($ignoreId) {
                $query->where('id', '!=', $ignoreId);
            })
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            abort(response()->json([
                'message' => 'Harga untuk produk dan event ini sudah tersedia.',
                'errors' => [
                    'produk_id' => [
                        'Harga untuk produk dan event ini sudah tersedia.',
                    ],
                ],
            ], 422));
        }
    }

    private function validateBundleDuplicate(
        string $namaBundle,
        string $eventId,
        ?string $ignoreId = null
    ): void {
        $exists = ProdukPrice::query()
            ->where('tipe_harga', 'bundle')
            ->whereRaw('LOWER(nama_bundle) = ?', [mb_strtolower(trim($namaBundle))])
            ->where('event_id', $eventId)
            ->when($ignoreId, function ($query) use ($ignoreId) {
                $query->where('id', '!=', $ignoreId);
            })
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            abort(response()->json([
                'message' => 'Nama bundle untuk event ini sudah tersedia.',
                'errors' => [
                    'nama_bundle' => [
                        'Nama bundle untuk event ini sudah tersedia.',
                    ],
                ],
            ], 422));
        }
    }

    private function syncBundleItems(ProdukPrice $produkPrice, array $items): void
    {
        ProdukPriceDetail::query()
            ->where('produk_price_id', $produkPrice->id)
            ->delete();

        foreach ($items as $item) {
            ProdukPriceDetail::create([
                'produk_price_id' => $produkPrice->id,
                'produk_id' => $item['produk_id'],
                'qty' => (int) $item['qty'],
            ]);
        }
    }

    private function loadProdukPrice(string $id): ProdukPrice
    {
        return ProdukPrice::query()
            ->with([
                'produk:id,nama_produk,product_number,code_gs1',
                'event:id,nama_event,alamat_event,valid_from,valid_until',
                'bundleDetails:id,produk_price_id,produk_id,qty',
                'bundleDetails.produk:id,nama_produk,product_number,code_gs1',
            ])
            ->findOrFail($id);
    }
}