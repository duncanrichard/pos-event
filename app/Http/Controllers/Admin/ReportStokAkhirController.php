<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportStokAkhirController extends Controller
{
    private const STATUS_DRAFT = 'Draft';
    private const STATUS_PAID = 'Paid';
    private const TYPE_PO = 'PO';
    private const TYPE_PEMBELIAN = 'Pembelian';

    public function options()
    {
        return response()->json([
            'success' => true,
            'message' => 'Data pilihan report stok akhir berhasil dimuat.',
            'data' => [
                'events' => DataEvent::query()
                    ->select('id', 'nama_event', 'alamat_event', 'valid_from', 'valid_until')
                    ->orderByDesc('valid_from')
                    ->orderBy('nama_event')
                    ->get(),
            ],
        ]);
    }

    public function index(Request $request)
    {
        $eventId = trim((string) $request->query('event_id', ''));
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 25);

        if ($perPage < 10) {
            $perPage = 10;
        }

        if ($perPage > 100) {
            $perPage = 100;
        }

        $query = DB::table('produk_price as pp')
            ->join('produk as p', 'p.id', '=', 'pp.produk_id')
            ->leftJoin('data_event as de', 'de.id', '=', 'pp.event_id')
            ->select([
                'pp.id as produk_price_id',
                'pp.event_id',
                'pp.produk_id',
                'pp.harga_produk',
                'p.nama_produk',
                'p.product_number',
                'p.code_gs1',
                'de.nama_event',
                'de.alamat_event',
                'de.valid_from',
                'de.valid_until',
            ])
            ->when($eventId !== '', function ($q) use ($eventId) {
                $q->where('pp.event_id', $eventId);
            })
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . $search . '%';

                $q->where(function ($sub) use ($like) {
                    $sub->where('p.nama_produk', 'like', $like)
                        ->orWhere('p.product_number', 'like', $like)
                        ->orWhere('p.code_gs1', 'like', $like)
                        ->orWhere('de.nama_event', 'like', $like);
                });
            })
            ->orderByDesc('de.valid_from')
            ->orderBy('de.nama_event')
            ->orderBy('p.nama_produk');

        $rows = $query->paginate($perPage);

        $rows->getCollection()->transform(function ($row) {
            $stock = $this->getStockSummary(
                (string) $row->event_id,
                (string) $row->produk_price_id
            );

            return [
                'produk_price_id' => $row->produk_price_id,
                'event_id' => $row->event_id,
                'produk_id' => $row->produk_id,
                'event' => [
                    'id' => $row->event_id,
                    'nama_event' => $row->nama_event ?? '-',
                    'alamat_event' => $row->alamat_event ?? '-',
                    'valid_from' => $row->valid_from,
                    'valid_until' => $row->valid_until,
                ],
                'produk' => [
                    'id' => $row->produk_id,
                    'nama_produk' => $row->nama_produk ?? '-',
                    'product_number' => $row->product_number ?? '-',
                    'code_gs1' => $row->code_gs1 ?? '-',
                ],
                'harga_produk' => (float) ($row->harga_produk ?? 0),
                'stock_masuk' => $stock['stock_masuk'],
                'stock_draft' => $stock['stock_draft'],
                'stock_paid' => $stock['stock_paid'],
                'stock_terpakai' => $stock['stock_terpakai'],
                'stock_po' => $stock['stock_po'],
                'stock_akhir' => $stock['stock_akhir'],
            ];
        });

        $collection = $rows->getCollection();

        return response()->json([
            'success' => true,
            'message' => 'Report stok akhir berhasil dimuat.',
            'filters' => [
                'event_id' => $eventId ?: null,
                'search' => $search ?: null,
                'per_page' => $perPage,
            ],
            'summary' => [
                'total_produk' => $collection->count(),
                'total_stock_masuk' => (int) $collection->sum('stock_masuk'),
                'total_stock_draft' => (int) $collection->sum('stock_draft'),
                'total_stock_paid' => (int) $collection->sum('stock_paid'),
                'total_stock_terpakai' => (int) $collection->sum('stock_terpakai'),
                'total_stock_po' => (int) $collection->sum('stock_po'),
                'total_stock_akhir' => (int) $collection->sum('stock_akhir'),
            ],
            'data' => $collection->values(),
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
                'from' => $rows->firstItem(),
                'to' => $rows->lastItem(),
            ],
        ]);
    }

    private function getStockSummary(string $eventId, string $produkPriceId): array
    {
        $stockMasuk = (int) DB::table('event_inbound')
            ->where('event_id', $eventId)
            ->where('produk_price_id', $produkPriceId)
            ->whereNull('deleted_at')
            ->sum('jumlah_produk');

        $stockDraft = (int) DB::table('event_carts_detail as ecd')
            ->join('event_carts as ec', 'ec.id', '=', 'ecd.event_carts_id')
            ->where('ec.event_id', $eventId)
            ->where('ecd.produk_price_id', $produkPriceId)
            ->where('ec.status', self::STATUS_DRAFT)
            ->where(function ($q) {
                $q->whereNull('ec.transaction_type')
                    ->orWhere('ec.transaction_type', self::TYPE_PEMBELIAN);
            })
            ->whereNull('ecd.deleted_at')
            ->whereNull('ec.deleted_at')
            ->sum('ecd.qty');

        $stockPaid = (int) DB::table('event_carts_detail as ecd')
            ->join('event_carts as ec', 'ec.id', '=', 'ecd.event_carts_id')
            ->where('ec.event_id', $eventId)
            ->where('ecd.produk_price_id', $produkPriceId)
            ->where('ec.status', self::STATUS_PAID)
            ->where(function ($q) {
                $q->whereNull('ec.transaction_type')
                    ->orWhere('ec.transaction_type', self::TYPE_PEMBELIAN);
            })
            ->whereNull('ecd.deleted_at')
            ->whereNull('ec.deleted_at')
            ->sum('ecd.qty');

        $stockPo = (int) DB::table('event_carts_detail as ecd')
            ->join('event_carts as ec', 'ec.id', '=', 'ecd.event_carts_id')
            ->where('ec.event_id', $eventId)
            ->where('ecd.produk_price_id', $produkPriceId)
            ->whereIn('ec.status', [
                self::STATUS_DRAFT,
                self::STATUS_PAID,
            ])
            ->where('ec.transaction_type', self::TYPE_PO)
            ->whereNull('ecd.deleted_at')
            ->whereNull('ec.deleted_at')
            ->sum('ecd.qty');

        $stockTerpakai = $stockDraft + $stockPaid;
        $stockAkhir = max($stockMasuk - $stockTerpakai, 0);

        return [
            'stock_masuk' => $stockMasuk,
            'stock_draft' => $stockDraft,
            'stock_paid' => $stockPaid,
            'stock_terpakai' => $stockTerpakai,
            'stock_po' => $stockPo,
            'stock_akhir' => $stockAkhir,
        ];
    }
}
