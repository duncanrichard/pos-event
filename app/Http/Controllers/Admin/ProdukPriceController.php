<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataEvent;
use App\Models\Produk;
use App\Models\ProdukPrice;
use Illuminate\Http\Request;

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
                'produk:id,nama_produk,product_number',
                'event:id,nama_event,alamat_event,valid_from,valid_until',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($mainQuery) use ($search) {
                    $mainQuery
                        ->whereHas('produk', function ($produkQuery) use ($search) {
                            $produkQuery
                                ->where('nama_produk', 'ilike', '%' . $search . '%')
                                ->orWhere('product_number', 'ilike', '%' . $search . '%');
                        })
                        ->orWhereHas('event', function ($eventQuery) use ($search) {
                            $eventQuery
                                ->where('nama_event', 'ilike', '%' . $search . '%')
                                ->orWhere('alamat_event', 'ilike', '%' . $search . '%');
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
        return response()->json([
            'success' => true,
            'message' => 'Data pilihan produk price berhasil dimuat.',
            'data' => [
                'produk' => Produk::query()
                    ->select('id', 'nama_produk', 'product_number')
                    ->orderBy('nama_produk')
                    ->get(),

                'events' => DataEvent::query()
                    ->select('id', 'nama_event', 'alamat_event', 'valid_from', 'valid_until')
                    ->orderByDesc('valid_from')
                    ->orderBy('nama_event')
                    ->get(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'produk_id' => [
                'required',
                'uuid',
                'exists:produk,id',
            ],
            'event_id' => [
                'required',
                'uuid',
                'exists:data_event,id',
            ],
            'harga_produk' => [
                'required',
                'numeric',
                'min:0',
            ],
        ], [
            'produk_id.required' => 'Produk wajib dipilih.',
            'produk_id.uuid' => 'Format produk tidak valid.',
            'produk_id.exists' => 'Produk tidak ditemukan.',

            'event_id.required' => 'Event wajib dipilih.',
            'event_id.uuid' => 'Format event tidak valid.',
            'event_id.exists' => 'Event tidak ditemukan.',

            'harga_produk.required' => 'Harga produk wajib diisi.',
            'harga_produk.numeric' => 'Harga produk harus berupa angka.',
            'harga_produk.min' => 'Harga produk tidak boleh kurang dari 0.',
        ]);

        $exists = ProdukPrice::query()
            ->where('produk_id', $validated['produk_id'])
            ->where('event_id', $validated['event_id'])
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Harga untuk produk dan event ini sudah tersedia.',
                'errors' => [
                    'produk_id' => [
                        'Harga untuk produk dan event ini sudah tersedia.',
                    ],
                ],
            ], 422);
        }

        $row = ProdukPrice::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Produk price berhasil ditambahkan.',
            'data' => $row->load([
                'produk:id,nama_produk,product_number',
                'event:id,nama_event,alamat_event,valid_from,valid_until',
            ]),
        ], 201);
    }

    public function show(string $id)
    {
        $row = ProdukPrice::query()
            ->with([
                'produk:id,nama_produk,product_number',
                'event:id,nama_event,alamat_event,valid_from,valid_until',
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail produk price berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = ProdukPrice::findOrFail($id);

        $validated = $request->validate([
            'produk_id' => [
                'required',
                'uuid',
                'exists:produk,id',
            ],
            'event_id' => [
                'required',
                'uuid',
                'exists:data_event,id',
            ],
            'harga_produk' => [
                'required',
                'numeric',
                'min:0',
            ],
        ], [
            'produk_id.required' => 'Produk wajib dipilih.',
            'produk_id.uuid' => 'Format produk tidak valid.',
            'produk_id.exists' => 'Produk tidak ditemukan.',

            'event_id.required' => 'Event wajib dipilih.',
            'event_id.uuid' => 'Format event tidak valid.',
            'event_id.exists' => 'Event tidak ditemukan.',

            'harga_produk.required' => 'Harga produk wajib diisi.',
            'harga_produk.numeric' => 'Harga produk harus berupa angka.',
            'harga_produk.min' => 'Harga produk tidak boleh kurang dari 0.',
        ]);

        $exists = ProdukPrice::query()
            ->where('produk_id', $validated['produk_id'])
            ->where('event_id', $validated['event_id'])
            ->where('id', '!=', $row->id)
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Harga untuk produk dan event ini sudah tersedia.',
                'errors' => [
                    'produk_id' => [
                        'Harga untuk produk dan event ini sudah tersedia.',
                    ],
                ],
            ], 422);
        }

        $row->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Produk price berhasil diperbarui.',
            'data' => $row->fresh()->load([
                'produk:id,nama_produk,product_number',
                'event:id,nama_event,alamat_event,valid_from,valid_until',
            ]),
        ]);
    }

    public function destroy(string $id)
    {
        $row = ProdukPrice::findOrFail($id);
        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Produk price berhasil dihapus.',
        ]);
    }
}