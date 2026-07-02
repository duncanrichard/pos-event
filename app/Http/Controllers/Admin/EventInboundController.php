<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataEvent;
use App\Models\EventInbound;
use App\Models\ProdukPrice;
use App\Models\Supplier;
use Illuminate\Http\Request;

class EventInboundController extends Controller
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

        $rows = EventInbound::query()
            ->with([
                'supplier:id,nama_supplier,contact_supplier',
                'event:id,nama_event,alamat_event,valid_from,valid_until',
                'produkPrice:id,produk_id,event_id,tipe_harga,nama_bundle,harga_produk',
                'produkPrice.produk:id,nama_produk,product_number,code_gs1',
            ])
            ->whereHas('produkPrice', function ($query) {
                $query->where('tipe_harga', 'single')
                    ->whereNotNull('produk_id');
            })
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($mainQuery) use ($search) {
                    $keyword = '%' . $search . '%';

                    $mainQuery
                        ->whereHas('supplier', function ($supplierQuery) use ($keyword) {
                            $supplierQuery
                                ->where('nama_supplier', 'ilike', $keyword)
                                ->orWhere('contact_supplier', 'ilike', $keyword);
                        })
                        ->orWhereHas('event', function ($eventQuery) use ($keyword) {
                            $eventQuery
                                ->where('nama_event', 'ilike', $keyword)
                                ->orWhere('alamat_event', 'ilike', $keyword)
                                ->orWhereRaw("TO_CHAR(valid_from, 'YYYY-MM-DD') ILIKE ?", [$keyword])
                                ->orWhereRaw("TO_CHAR(valid_until, 'YYYY-MM-DD') ILIKE ?", [$keyword]);
                        })
                        ->orWhereHas('produkPrice.produk', function ($produkQuery) use ($keyword) {
                            $produkQuery
                                ->where('nama_produk', 'ilike', $keyword)
                                ->orWhere('product_number', 'ilike', $keyword)
                                ->orWhere('code_gs1', 'ilike', $keyword);
                        });
                });
            })
            ->orderByDesc('tanggal_inbound')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data event inbound berhasil dimuat.',
            'data' => $rows,
        ]);
    }

    public function options(Request $request)
    {
        $eventId = $request->query('event_id');
        $today = now()->toDateString();

        $activeEvents = DataEvent::query()
            ->select('id', 'nama_event', 'alamat_event', 'valid_from', 'valid_until')
            ->whereDate('valid_until', '>=', $today)
            ->orderBy('valid_from')
            ->orderBy('nama_event')
            ->get();

        $produkPrices = ProdukPrice::query()
            ->with([
                'produk:id,nama_produk,product_number,code_gs1',
                'event:id,nama_event,valid_from,valid_until',
            ])
            ->where('tipe_harga', 'single')
            ->whereNotNull('produk_id')
            ->whereHas('event', function ($query) use ($today) {
                $query->whereDate('valid_until', '>=', $today);
            })
            ->when($eventId, function ($query) use ($eventId) {
                $query->where('event_id', $eventId);
            })
            ->orderByDesc('created_at')
            ->get([
                'id',
                'produk_id',
                'event_id',
                'tipe_harga',
                'nama_bundle',
                'harga_produk',
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Data pilihan event inbound berhasil dimuat.',
            'data' => [
                'suppliers' => Supplier::query()
                    ->select('id', 'nama_supplier', 'contact_supplier')
                    ->orderBy('nama_supplier')
                    ->get(),

                'events' => $activeEvents,

                'produk_prices' => $produkPrices,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatePayload($request);

        $this->validateActiveEvent($validated['event_id']);

        $this->validateProdukPriceMatchEvent(
            $validated['produk_price_id'],
            $validated['event_id']
        );

        $validated['supplier_id'] = $validated['supplier_id'] ?: null;

        $row = EventInbound::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Event inbound berhasil ditambahkan.',
            'data' => $this->loadInbound($row->id),
        ], 201);
    }

    public function show(string $id)
    {
        $row = $this->loadInbound($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail event inbound berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = EventInbound::query()->findOrFail($id);

        $validated = $this->validatePayload($request);

        $this->validateActiveEvent($validated['event_id']);

        $this->validateProdukPriceMatchEvent(
            $validated['produk_price_id'],
            $validated['event_id']
        );

        $validated['supplier_id'] = $validated['supplier_id'] ?: null;

        $row->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Event inbound berhasil diperbarui.',
            'data' => $this->loadInbound($row->id),
        ]);
    }

    public function destroy(string $id)
    {
        $row = EventInbound::query()->findOrFail($id);
        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Event inbound berhasil dihapus.',
        ]);
    }

    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'supplier_id' => ['nullable', 'uuid', 'exists:suppliers,id'],
            'event_id' => ['required', 'uuid', 'exists:data_event,id'],
            'produk_price_id' => ['required', 'uuid', 'exists:produk_price,id'],
            'jumlah_produk' => ['required', 'integer', 'min:1'],
            'tanggal_inbound' => ['required', 'date'],
        ], [
            'supplier_id.uuid' => 'Format supplier tidak valid.',
            'supplier_id.exists' => 'Supplier tidak ditemukan.',

            'event_id.required' => 'Event wajib dipilih.',
            'event_id.uuid' => 'Format event tidak valid.',
            'event_id.exists' => 'Event tidak ditemukan.',

            'produk_price_id.required' => 'Produk price wajib dipilih.',
            'produk_price_id.uuid' => 'Format produk price tidak valid.',
            'produk_price_id.exists' => 'Produk price tidak ditemukan.',

            'jumlah_produk.required' => 'Jumlah produk wajib diisi.',
            'jumlah_produk.integer' => 'Jumlah produk harus berupa angka bulat.',
            'jumlah_produk.min' => 'Jumlah produk minimal 1.',

            'tanggal_inbound.required' => 'Tanggal inbound wajib diisi.',
            'tanggal_inbound.date' => 'Tanggal inbound tidak valid.',
        ]);
    }

    private function validateActiveEvent(string $eventId): void
    {
        $exists = DataEvent::query()
            ->where('id', $eventId)
            ->whereDate('valid_until', '>=', now()->toDateString())
            ->whereNull('deleted_at')
            ->exists();

        if (!$exists) {
            abort(response()->json([
                'message' => 'Event sudah terlewat dan tidak bisa dipilih untuk inbound.',
                'errors' => [
                    'event_id' => [
                        'Event sudah terlewat dan tidak bisa dipilih untuk inbound.',
                    ],
                ],
            ], 422));
        }
    }

    private function validateProdukPriceMatchEvent(string $produkPriceId, string $eventId): void
    {
        $exists = ProdukPrice::query()
            ->where('id', $produkPriceId)
            ->where('event_id', $eventId)
            ->where('tipe_harga', 'single')
            ->whereNotNull('produk_id')
            ->whereHas('event', function ($query) {
                $query->whereDate('valid_until', '>=', now()->toDateString());
            })
            ->whereNull('deleted_at')
            ->exists();

        if (!$exists) {
            abort(response()->json([
                'message' => 'Produk price tidak sesuai dengan event yang dipilih atau bukan produk single.',
                'errors' => [
                    'produk_price_id' => [
                        'Produk price tidak sesuai dengan event yang dipilih atau bukan produk single.',
                    ],
                ],
            ], 422));
        }
    }

    private function loadInbound(string $id): EventInbound
    {
        return EventInbound::query()
            ->with([
                'supplier:id,nama_supplier,contact_supplier',
                'event:id,nama_event,alamat_event,valid_from,valid_until',
                'produkPrice:id,produk_id,event_id,tipe_harga,nama_bundle,harga_produk',
                'produkPrice.produk:id,nama_produk,product_number,code_gs1',
            ])
            ->findOrFail($id);
    }
}
