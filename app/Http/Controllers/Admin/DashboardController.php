<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private const STATUS_DRAFT = 'Draft';
    private const STATUS_PAID = 'Paid';
    private const STATUS_VOID_CARTS = 'Void Carts';
    private const STATUS_VOID_TRANSAKSI = 'Void Transaksi';
    private const STATUS_VOID_OLD = 'Void';

    private const TYPE_PO = 'PO';
    private const TYPE_PEMBELIAN = 'Pembelian';

    public function index(Request $request)
    {
        $filters = $this->normalizeFilters($request);

        return response()->json([
            'success' => true,
            'message' => 'Dashboard berhasil dimuat.',
            'filters' => $filters,
            'data' => [
                'summary' => $this->getSummary($filters),
                'stock_summary' => $this->getStockSummary($filters),
                'demographics' => [
                    'event_status' => $this->getEventStatusDemography(),
                    'stock_status' => $this->getStockStatusDemography($filters),
                    'transaction_type' => $this->getTransactionTypeDemography($filters),
                    'payment_status' => $this->getPaymentStatusDemography($filters),
                    'customer_type' => $this->getCustomerTypeDemography($filters),
                ],
                'top_events' => $this->getTopEvents($filters),
                'top_products' => $this->getTopProducts($filters),
                'recent_transactions' => $this->getRecentTransactions($filters),
                'options' => [
                    'events' => DataEvent::query()
                        ->select('id', 'nama_event', 'alamat_event', 'valid_from', 'valid_until')
                        ->whereNull('deleted_at')
                        ->orderByDesc('valid_from')
                        ->orderBy('nama_event')
                        ->get(),
                ],
            ],
        ]);
    }

    private function normalizeFilters(Request $request): array
    {
        return [
            'event_id' => trim((string) $request->query('event_id', '')) ?: null,
            'date_from' => $request->query('date_from') ?: now()->subDays(30)->toDateString(),
            'date_to' => $request->query('date_to') ?: now()->toDateString(),
        ];
    }

    private function cartTotalSubQuery()
    {
        return DB::table('event_carts_detail as ecd')
            ->join('produk_price as pp', 'pp.id', '=', 'ecd.produk_price_id')
            ->whereNull('ecd.deleted_at')
            ->whereNull('pp.deleted_at')
            ->groupBy('ecd.event_carts_id')
            ->selectRaw('
                ecd.event_carts_id,
                COALESCE(SUM(ecd.qty), 0) as total_qty,
                COALESCE(SUM(ecd.qty * COALESCE(pp.harga_produk, 0)), 0) as total_amount
            ');
    }

    private function cartBaseQuery(array $filters)
    {
        $query = DB::table('event_carts as ec')
            ->leftJoin('data_event as de', 'de.id', '=', 'ec.event_id')
            ->leftJoin('event_payment as ep', function ($join) {
                $join->on('ep.event_carts_id', '=', 'ec.id')
                    ->whereNull('ep.deleted_at');
            })
            ->leftJoin('payments as pay', 'pay.id', '=', 'ep.payment_id')
            ->leftJoinSub($this->cartTotalSubQuery(), 'ct', function ($join) {
                $join->on('ct.event_carts_id', '=', 'ec.id');
            })
            ->whereNull('ec.deleted_at');

        if (!empty($filters['event_id'])) {
            $query->where('ec.event_id', $filters['event_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('ec.tanggal_carts', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('ec.tanggal_carts', '<=', $filters['date_to']);
        }

        return $query;
    }

    private function stockRowsQuery(array $filters)
    {
        $inboundSub = DB::table('event_inbound')
            ->selectRaw('
                event_id,
                produk_price_id,
                COALESCE(SUM(jumlah_produk), 0) as stock_masuk
            ')
            ->whereNull('deleted_at')
            ->groupBy('event_id', 'produk_price_id');

        $usedSub = DB::table('event_carts_detail as ecd')
            ->join('event_carts as ec', 'ec.id', '=', 'ecd.event_carts_id')
            ->selectRaw('
                ec.event_id,
                ecd.produk_price_id,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status = ? AND (ec.transaction_type IS NULL OR ec.transaction_type = ?)
                        THEN ecd.qty
                        ELSE 0
                    END
                ), 0) as stock_draft,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status = ? AND (ec.transaction_type IS NULL OR ec.transaction_type = ?)
                        THEN ecd.qty
                        ELSE 0
                    END
                ), 0) as stock_paid,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status IN (?, ?) AND ec.transaction_type = ?
                        THEN ecd.qty
                        ELSE 0
                    END
                ), 0) as stock_po
            ', [
                self::STATUS_DRAFT,
                self::TYPE_PEMBELIAN,
                self::STATUS_PAID,
                self::TYPE_PEMBELIAN,
                self::STATUS_DRAFT,
                self::STATUS_PAID,
                self::TYPE_PO,
            ])
            ->whereNull('ecd.deleted_at')
            ->whereNull('ec.deleted_at')
            ->groupBy('ec.event_id', 'ecd.produk_price_id');

        $query = DB::table('produk_price as pp')
            ->join('produk as p', 'p.id', '=', 'pp.produk_id')
            ->leftJoin('data_event as de', 'de.id', '=', 'pp.event_id')
            ->leftJoinSub($inboundSub, 'ib', function ($join) {
                $join->on('ib.produk_price_id', '=', 'pp.id')
                    ->on('ib.event_id', '=', 'pp.event_id');
            })
            ->leftJoinSub($usedSub, 'us', function ($join) {
                $join->on('us.produk_price_id', '=', 'pp.id')
                    ->on('us.event_id', '=', 'pp.event_id');
            })
            ->whereNull('pp.deleted_at')
            ->whereNull('p.deleted_at')
            ->where(function ($q) {
                $q->whereNull('pp.tipe_harga')
                    ->orWhere('pp.tipe_harga', 'single');
            })
            ->selectRaw('
                pp.id as produk_price_id,
                pp.event_id,
                pp.produk_id,
                pp.harga_produk,
                p.nama_produk,
                p.product_number,
                p.code_gs1,
                de.nama_event,
                de.alamat_event,
                COALESCE(ib.stock_masuk, 0) as stock_masuk,
                COALESCE(us.stock_draft, 0) as stock_draft,
                COALESCE(us.stock_paid, 0) as stock_paid,
                COALESCE(us.stock_po, 0) as stock_po,
                CASE
                    WHEN (
                        COALESCE(ib.stock_masuk, 0)
                        - COALESCE(us.stock_draft, 0)
                        - COALESCE(us.stock_paid, 0)
                    ) < 0 THEN 0
                    ELSE (
                        COALESCE(ib.stock_masuk, 0)
                        - COALESCE(us.stock_draft, 0)
                        - COALESCE(us.stock_paid, 0)
                    )
                END as stock_akhir
            ');

        if (!empty($filters['event_id'])) {
            $query->where('pp.event_id', $filters['event_id']);
        }

        return $query;
    }

    private function getSummary(array $filters): array
    {
        $today = now()->toDateString();

        $master = [
            'total_events' => (int) DB::table('data_event')
                ->whereNull('deleted_at')
                ->count(),

            'active_events' => (int) DB::table('data_event')
                ->whereNull('deleted_at')
                ->whereDate('valid_from', '<=', $today)
                ->whereDate('valid_until', '>=', $today)
                ->count(),

            'upcoming_events' => (int) DB::table('data_event')
                ->whereNull('deleted_at')
                ->whereDate('valid_from', '>', $today)
                ->count(),

            'expired_events' => (int) DB::table('data_event')
                ->whereNull('deleted_at')
                ->whereDate('valid_until', '<', $today)
                ->count(),

            'total_products' => (int) DB::table('produk')
                ->whereNull('deleted_at')
                ->count(),

            'total_product_prices' => (int) DB::table('produk_price')
                ->whereNull('deleted_at')
                ->count(),
        ];

        $trx = $this->cartBaseQuery($filters)
            ->selectRaw("
                COUNT(DISTINCT ec.id) as total_transactions,
                COUNT(DISTINCT CASE WHEN ec.status = ? THEN ec.id END) as paid_transactions,
                COUNT(DISTINCT CASE WHEN ec.status = ? THEN ec.id END) as draft_transactions,
                COUNT(DISTINCT CASE WHEN ec.status IN (?, ?, ?) THEN ec.id END) as void_transactions,
                COALESCE(SUM(ct.total_qty), 0) as total_qty_sold,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status = ?
                        THEN COALESCE(ep.total_amount, ct.total_amount, 0)
                        ELSE 0
                    END
                ), 0) as omzet,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status = ?
                        THEN COALESCE(ep.paid_amount, 0)
                        ELSE 0
                    END
                ), 0) as paid_amount,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status = ?
                        THEN COALESCE(ep.remaining_amount, 0)
                        ELSE 0
                    END
                ), 0) as remaining_amount
            ", [
                self::STATUS_PAID,
                self::STATUS_DRAFT,
                self::STATUS_VOID_CARTS,
                self::STATUS_VOID_TRANSAKSI,
                self::STATUS_VOID_OLD,
                self::STATUS_PAID,
                self::STATUS_PAID,
                self::STATUS_PAID,
            ])
            ->first();

        return array_merge($master, [
            'total_transactions' => (int) ($trx->total_transactions ?? 0),
            'paid_transactions' => (int) ($trx->paid_transactions ?? 0),
            'draft_transactions' => (int) ($trx->draft_transactions ?? 0),
            'void_transactions' => (int) ($trx->void_transactions ?? 0),
            'total_qty_sold' => (int) ($trx->total_qty_sold ?? 0),
            'omzet' => (float) ($trx->omzet ?? 0),
            'paid_amount' => (float) ($trx->paid_amount ?? 0),
            'remaining_amount' => (float) ($trx->remaining_amount ?? 0),
        ]);
    }

    private function getStockSummary(array $filters): array
    {
        $rows = $this->stockRowsQuery($filters)->get();

        return [
            'total_produk_price' => $rows->count(),
            'total_stock_masuk' => (int) $rows->sum('stock_masuk'),
            'total_stock_draft' => (int) $rows->sum('stock_draft'),
            'total_stock_paid' => (int) $rows->sum('stock_paid'),
            'total_stock_terpakai' => (int) ($rows->sum('stock_draft') + $rows->sum('stock_paid')),
            'total_stock_po' => (int) $rows->sum('stock_po'),
            'total_stock_akhir' => (int) $rows->sum('stock_akhir'),
            'stock_kosong' => $rows->filter(fn ($row) => (int) $row->stock_akhir <= 0)->count(),
            'stock_menipis' => $rows->filter(fn ($row) => (int) $row->stock_akhir > 0 && (int) $row->stock_akhir <= 10)->count(),
            'stock_aman' => $rows->filter(fn ($row) => (int) $row->stock_akhir > 10)->count(),
        ];
    }

    private function getEventStatusDemography()
    {
        $today = now()->toDateString();

        return DB::table('data_event')
            ->whereNull('deleted_at')
            ->selectRaw("
                CASE
                    WHEN valid_until < ? THEN 'Terlewat'
                    WHEN valid_from > ? THEN 'Akan Datang'
                    ELSE 'Berjalan'
                END as label,
                COUNT(*) as total
            ", [$today, $today])
            ->groupByRaw("
                CASE
                    WHEN valid_until < ? THEN 'Terlewat'
                    WHEN valid_from > ? THEN 'Akan Datang'
                    ELSE 'Berjalan'
                END
            ", [$today, $today])
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'total' => (int) $row->total,
            ]);
    }

    private function getStockStatusDemography(array $filters)
    {
        $rows = $this->stockRowsQuery($filters)->get();
        $total = max($rows->count(), 1);

        $items = collect([
            [
                'label' => 'Stok Aman',
                'total' => $rows->filter(fn ($row) => (int) $row->stock_akhir > 10)->count(),
            ],
            [
                'label' => 'Stok Menipis',
                'total' => $rows->filter(fn ($row) => (int) $row->stock_akhir > 0 && (int) $row->stock_akhir <= 10)->count(),
            ],
            [
                'label' => 'Stok Kosong',
                'total' => $rows->filter(fn ($row) => (int) $row->stock_akhir <= 0)->count(),
            ],
        ]);

        return $items->map(function ($item) use ($total) {
            return [
                'label' => $item['label'],
                'total' => (int) $item['total'],
                'percent' => round(((int) $item['total'] / $total) * 100, 2),
            ];
        })->values();
    }

    private function getTransactionTypeDemography(array $filters)
    {
        return $this->cartBaseQuery($filters)
            ->selectRaw("
                COALESCE(ec.transaction_type, ?) as label,
                COUNT(DISTINCT ec.id) as total,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status = ?
                        THEN COALESCE(ep.total_amount, ct.total_amount, 0)
                        ELSE 0
                    END
                ), 0) as omzet
            ", [self::TYPE_PEMBELIAN, self::STATUS_PAID])
            ->groupByRaw('COALESCE(ec.transaction_type, ?)', [self::TYPE_PEMBELIAN])
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'total' => (int) $row->total,
                'omzet' => (float) $row->omzet,
            ]);
    }

    private function getPaymentStatusDemography(array $filters)
    {
        return $this->cartBaseQuery($filters)
            ->selectRaw("
                COALESCE(ep.payment_status, ec.status, '-') as label,
                COUNT(DISTINCT ec.id) as total,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status = ?
                        THEN COALESCE(ep.total_amount, ct.total_amount, 0)
                        ELSE 0
                    END
                ), 0) as omzet
            ", [self::STATUS_PAID])
            ->groupByRaw("COALESCE(ep.payment_status, ec.status, '-')")
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'total' => (int) $row->total,
                'omzet' => (float) $row->omzet,
            ]);
    }

    private function getCustomerTypeDemography(array $filters)
    {
        return $this->cartBaseQuery($filters)
            ->selectRaw("
                CASE
                    WHEN LOWER(COALESCE(ec.customer, '')) IN (
                        '',
                        '-',
                        'walk in customer',
                        'walk-in customer',
                        'walkin customer',
                        'walkin'
                    )
                    THEN 'Walk In Customer'
                    ELSE 'Customer Bernama'
                END as label,
                COUNT(DISTINCT ec.id) as total,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status = ?
                        THEN COALESCE(ep.total_amount, ct.total_amount, 0)
                        ELSE 0
                    END
                ), 0) as omzet
            ", [self::STATUS_PAID])
            ->groupByRaw("
                CASE
                    WHEN LOWER(COALESCE(ec.customer, '')) IN (
                        '',
                        '-',
                        'walk in customer',
                        'walk-in customer',
                        'walkin customer',
                        'walkin'
                    )
                    THEN 'Walk In Customer'
                    ELSE 'Customer Bernama'
                END
            ")
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'total' => (int) $row->total,
                'omzet' => (float) $row->omzet,
            ]);
    }

    private function getTopEvents(array $filters)
    {
        return $this->cartBaseQuery($filters)
            ->selectRaw("
                de.id as event_id,
                COALESCE(de.nama_event, '-') as nama_event,
                COALESCE(de.alamat_event, '-') as alamat_event,
                COUNT(DISTINCT ec.id) as total_transactions,
                COALESCE(SUM(ct.total_qty), 0) as total_qty,
                COALESCE(SUM(
                    CASE
                        WHEN ec.status = ?
                        THEN COALESCE(ep.total_amount, ct.total_amount, 0)
                        ELSE 0
                    END
                ), 0) as omzet
            ", [self::STATUS_PAID])
            ->groupBy('de.id', 'de.nama_event', 'de.alamat_event')
            ->orderByDesc('omzet')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'event_id' => $row->event_id,
                'nama_event' => $row->nama_event,
                'alamat_event' => $row->alamat_event,
                'total_transactions' => (int) $row->total_transactions,
                'total_qty' => (int) $row->total_qty,
                'omzet' => (float) $row->omzet,
            ]);
    }

    private function getTopProducts(array $filters)
    {
        $query = DB::table('event_carts_detail as ecd')
            ->join('event_carts as ec', 'ec.id', '=', 'ecd.event_carts_id')
            ->join('produk_price as pp', 'pp.id', '=', 'ecd.produk_price_id')
            ->leftJoin('produk as p', 'p.id', '=', 'pp.produk_id')
            ->leftJoin('data_event as de', 'de.id', '=', 'ec.event_id')
            ->whereNull('ecd.deleted_at')
            ->whereNull('ec.deleted_at')
            ->whereNull('pp.deleted_at')
            ->where('ec.status', self::STATUS_PAID);

        if (!empty($filters['event_id'])) {
            $query->where('ec.event_id', $filters['event_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('ec.tanggal_carts', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('ec.tanggal_carts', '<=', $filters['date_to']);
        }

        return $query
            ->selectRaw("
                pp.id as produk_price_id,
                pp.tipe_harga,
                pp.nama_bundle,
                pp.harga_produk,
                p.nama_produk,
                p.product_number,
                de.nama_event,
                COALESCE(SUM(ecd.qty), 0) as total_qty,
                COALESCE(SUM(ecd.qty * COALESCE(pp.harga_produk, 0)), 0) as omzet,
                COUNT(DISTINCT ec.id) as total_transactions
            ")
            ->groupBy(
                'pp.id',
                'pp.tipe_harga',
                'pp.nama_bundle',
                'pp.harga_produk',
                'p.nama_produk',
                'p.product_number',
                'de.nama_event'
            )
            ->orderByDesc('total_qty')
            ->orderByDesc('omzet')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $isBundle = ($row->tipe_harga ?? 'single') === 'bundle';

                return [
                    'produk_price_id' => $row->produk_price_id,
                    'nama_produk' => $isBundle
                        ? ($row->nama_bundle ?: 'Bundle Tanpa Nama')
                        : ($row->nama_produk ?: '-'),
                    'product_number' => $isBundle ? 'BUNDLE' : ($row->product_number ?: '-'),
                    'tipe_harga' => $row->tipe_harga ?: 'single',
                    'nama_event' => $row->nama_event ?: '-',
                    'harga_produk' => (float) ($row->harga_produk ?? 0),
                    'total_qty' => (int) ($row->total_qty ?? 0),
                    'omzet' => (float) ($row->omzet ?? 0),
                    'total_transactions' => (int) ($row->total_transactions ?? 0),
                ];
            });
    }

    private function getRecentTransactions(array $filters)
    {
        return $this->cartBaseQuery($filters)
            ->selectRaw("
                ec.id,
                ec.no_invoice,
                COALESCE(NULLIF(TRIM(ec.customer), ''), 'Walk In Customer') as customer,
                ec.tanggal_carts,
                ec.status,
                COALESCE(ec.transaction_type, ?) as transaction_type,
                de.nama_event,
                COALESCE(ct.total_qty, 0) as total_qty,
                COALESCE(ep.total_amount, ct.total_amount, 0) as total_amount,
                COALESCE(ep.payment_status, ec.status, '-') as payment_status,
                COALESCE(pay.payment, '-') as payment_method
            ", [self::TYPE_PEMBELIAN])
            ->orderByDesc('ec.tanggal_carts')
            ->orderByDesc('ec.created_at')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'no_invoice' => $row->no_invoice,
                'customer' => $row->customer,
                'tanggal_carts' => $row->tanggal_carts,
                'status' => $row->status,
                'transaction_type' => $row->transaction_type,
                'nama_event' => $row->nama_event ?: '-',
                'total_qty' => (int) $row->total_qty,
                'total_amount' => (float) $row->total_amount,
                'payment_status' => $row->payment_status,
                'payment_method' => $row->payment_method,
            ]);
    }
}
