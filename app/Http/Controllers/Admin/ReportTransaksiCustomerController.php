<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportTransaksiCustomerController extends Controller
{
    private const STATUS_PAID = 'Paid';
    private const STATUS_DRAFT = 'Draft';
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
            'message' => 'Report transaksi customer berhasil dimuat.',
            'filters' => $filters,
            'data' => [
                'summary' => $this->getSummary($filters),
                'omzet_by_event' => $this->getOmzetByEvent($filters),
                'omzet_by_date' => $this->getOmzetByDate($filters),
                'top_customers' => $this->getTopCustomers($filters),
                'top_products' => $this->getTopProducts($filters),
                'demographics' => [
                    'customer_type' => $this->getCustomerTypeDemography($filters),
                    'transaction_type' => $this->getTransactionTypeDemography($filters),
                    'cart_status' => $this->getCartStatusDemography($filters),
                    'payment_status' => $this->getPaymentStatusDemography($filters),
                    'payment_method' => $this->getPaymentMethodDemography($filters),
                ],
                'transactions' => $this->getTransactions($filters),
                'options' => [
                    'events' => $this->getEventOptions(),
                    'statuses' => [
                        self::STATUS_PAID,
                        self::STATUS_DRAFT,
                        self::STATUS_VOID_CARTS,
                        self::STATUS_VOID_TRANSAKSI,
                        self::STATUS_VOID_OLD,
                    ],
                    'transaction_types' => [
                        self::TYPE_PEMBELIAN,
                        self::TYPE_PO,
                    ],
                ],
            ],
        ]);
    }

    private function normalizeFilters(Request $request): array
    {
        $status = trim((string) $request->query('status', self::STATUS_PAID));
        $transactionType = trim((string) $request->query('transaction_type', ''));

        if ($status === 'all' || $status === 'Semua') {
            $status = '';
        }

        if ($transactionType === 'all' || $transactionType === 'Semua') {
            $transactionType = '';
        }

        return [
            'event_id' => $request->query('event_id') ?: '',
            'date_from' => $request->query('date_from') ?: now()->subDays(30)->toDateString(),
            'date_to' => $request->query('date_to') ?: now()->toDateString(),
            'transaction_type' => $transactionType,
            'status' => $status,
            'customer' => trim((string) $request->query('customer', '')),
            'per_page' => min(max((int) $request->query('per_page', 10), 1), 100),
        ];
    }

    private function getEventOptions()
    {
        return DataEvent::query()
            ->select('id', 'nama_event', 'alamat_event', 'valid_from', 'valid_until')
            ->orderByDesc('valid_from')
            ->orderBy('nama_event')
            ->get();
    }

    /**
     * Total transaksi mengikuti logika POS:
     * total_amount = sum(qty detail x harga_produk)
     * tabel detail cart yang benar: event_carts_detail.
     */
    private function cartTotalSubQuery()
    {
        return DB::table('event_carts_detail as ecd')
            ->join('produk_price as pp', 'pp.id', '=', 'ecd.produk_price_id')
            ->whereNull('ecd.deleted_at')
            ->whereNull('pp.deleted_at')
            ->groupBy('ecd.event_carts_id')
            ->selectRaw('
                ecd.event_carts_id,
                SUM(ecd.qty) as total_qty,
                SUM(ecd.qty * COALESCE(pp.harga_produk, 0)) as total_amount
            ');
    }

    /**
     * Query utama transaksi POS.
     * Sumber transaksi: event_carts.
     * Sumber item terjual: event_carts_detail.
     * Sumber pembayaran: event_payment.
     */
    private function baseQuery(array $filters)
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

        $this->applyFilters($query, $filters);

        return $query;
    }

    private function applyFilters($query, array $filters): void
    {
        if (!empty($filters['event_id'])) {
            $query->where('ec.event_id', $filters['event_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('ec.tanggal_carts', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('ec.tanggal_carts', '<=', $filters['date_to']);
        }

        if (!empty($filters['transaction_type'])) {
            $query->where('ec.transaction_type', $filters['transaction_type']);
        }

        if (!empty($filters['status'])) {
            $query->where('ec.status', $filters['status']);
        }

        if (!empty($filters['customer'])) {
            $keyword = '%' . mb_strtolower($filters['customer']) . '%';
            $query->whereRaw("LOWER(COALESCE(ec.customer, '')) LIKE ?", [$keyword]);
        }
    }

    private function getSummary(array $filters): array
    {
        $row = $this->baseQuery($filters)
            ->selectRaw("
                COUNT(DISTINCT ec.id) as total_transactions,

                COUNT(DISTINCT CASE
                    WHEN LOWER(COALESCE(TRIM(ec.customer), '')) NOT IN (
                        '',
                        '-',
                        'walk in customer',
                        'walk-in customer',
                        'walkin customer',
                        'walkin'
                    )
                    THEN LOWER(TRIM(ec.customer))
                END) as unique_customers,

                COALESCE(SUM(COALESCE(ct.total_qty, 0)), 0) as total_qty,
                COALESCE(SUM(COALESCE(ep.total_amount, ct.total_amount, 0)), 0) as gross_omzet,
                COALESCE(SUM(COALESCE(ep.paid_amount, 0)), 0) as paid_amount,
                COALESCE(SUM(COALESCE(ep.remaining_amount, 0)), 0) as remaining_amount,
                COALESCE(AVG(NULLIF(COALESCE(ep.total_amount, ct.total_amount, 0), 0)), 0) as avg_transaction
            ")
            ->first();

        return [
            'total_transactions' => (int) ($row->total_transactions ?? 0),
            'unique_customers' => (int) ($row->unique_customers ?? 0),
            'total_qty' => (int) ($row->total_qty ?? 0),
            'gross_omzet' => (float) ($row->gross_omzet ?? 0),
            'paid_amount' => (float) ($row->paid_amount ?? 0),
            'remaining_amount' => (float) ($row->remaining_amount ?? 0),
            'avg_transaction' => (float) ($row->avg_transaction ?? 0),
        ];
    }

    private function getOmzetByEvent(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw("
                de.id as event_id,
                COALESCE(de.nama_event, '-') as nama_event,
                COALESCE(de.alamat_event, '-') as alamat_event,
                COUNT(DISTINCT ec.id) as total_transactions,
                COALESCE(SUM(COALESCE(ct.total_qty, 0)), 0) as total_qty,
                COALESCE(SUM(COALESCE(ep.total_amount, ct.total_amount, 0)), 0) as omzet,
                COALESCE(SUM(COALESCE(ep.paid_amount, 0)), 0) as paid_amount,
                COALESCE(SUM(COALESCE(ep.remaining_amount, 0)), 0) as remaining_amount
            ")
            ->groupBy('de.id', 'de.nama_event', 'de.alamat_event')
            ->orderByDesc('omzet')
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'event_id' => $row->event_id,
                'nama_event' => $row->nama_event,
                'alamat_event' => $row->alamat_event,
                'total_transactions' => (int) $row->total_transactions,
                'total_qty' => (int) $row->total_qty,
                'omzet' => (float) $row->omzet,
                'paid_amount' => (float) $row->paid_amount,
                'remaining_amount' => (float) $row->remaining_amount,
            ]);
    }

    private function getOmzetByDate(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw("
                ec.tanggal_carts::date as tanggal,
                COUNT(DISTINCT ec.id) as total_transactions,
                COALESCE(SUM(COALESCE(ct.total_qty, 0)), 0) as total_qty,
                COALESCE(SUM(COALESCE(ep.total_amount, ct.total_amount, 0)), 0) as omzet,
                COALESCE(SUM(COALESCE(ep.paid_amount, 0)), 0) as paid_amount
            ")
            ->groupByRaw('ec.tanggal_carts::date')
            ->orderByRaw('ec.tanggal_carts::date ASC')
            ->get()
            ->map(fn ($row) => [
                'tanggal' => $row->tanggal,
                'total_transactions' => (int) $row->total_transactions,
                'total_qty' => (int) $row->total_qty,
                'omzet' => (float) $row->omzet,
                'paid_amount' => (float) $row->paid_amount,
            ]);
    }

    private function getTopCustomers(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw("
                COALESCE(NULLIF(TRIM(ec.customer), ''), 'Walk In Customer') as customer,
                COUNT(DISTINCT ec.id) as total_transactions,
                COALESCE(SUM(COALESCE(ct.total_qty, 0)), 0) as total_qty,
                COALESCE(SUM(COALESCE(ep.total_amount, ct.total_amount, 0)), 0) as omzet,
                COALESCE(SUM(COALESCE(ep.paid_amount, 0)), 0) as paid_amount,
                COALESCE(SUM(COALESCE(ep.remaining_amount, 0)), 0) as remaining_amount
            ")
            ->groupByRaw("COALESCE(NULLIF(TRIM(ec.customer), ''), 'Walk In Customer')")
            ->orderByDesc('omzet')
            ->limit(20)
            ->get()
            ->map(fn ($row) => [
                'customer' => $row->customer,
                'total_transactions' => (int) $row->total_transactions,
                'total_qty' => (int) $row->total_qty,
                'omzet' => (float) $row->omzet,
                'paid_amount' => (float) $row->paid_amount,
                'remaining_amount' => (float) $row->remaining_amount,
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
            ->whereNull('pp.deleted_at');

        $this->applyFilters($query, $filters);

        return $query
            ->selectRaw("
                pp.id as produk_price_id,
                pp.tipe_harga,
                pp.nama_bundle,
                pp.harga_produk,
                p.id as produk_id,
                p.nama_produk,
                p.product_number,
                de.nama_event,
                SUM(ecd.qty) as total_qty,
                SUM(ecd.qty * COALESCE(pp.harga_produk, 0)) as omzet,
                COUNT(DISTINCT ec.id) as total_transactions
            ")
            ->groupBy(
                'pp.id',
                'pp.tipe_harga',
                'pp.nama_bundle',
                'pp.harga_produk',
                'p.id',
                'p.nama_produk',
                'p.product_number',
                'de.nama_event'
            )
            ->orderByDesc('total_qty')
            ->orderByDesc('omzet')
            ->limit(30)
            ->get()
            ->map(function ($row) {
                $isBundle = ($row->tipe_harga ?? 'single') === 'bundle';

                return [
                    'produk_price_id' => $row->produk_price_id,
                    'produk_id' => $row->produk_id,
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

    private function getCustomerTypeDemography(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw("
                CASE
                    WHEN LOWER(COALESCE(TRIM(ec.customer), '')) IN (
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
                COUNT(DISTINCT ec.id) as total_transactions,
                COALESCE(SUM(COALESCE(ep.total_amount, ct.total_amount, 0)), 0) as omzet
            ")
            ->groupByRaw("
                CASE
                    WHEN LOWER(COALESCE(TRIM(ec.customer), '')) IN (
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
            ->orderByDesc('total_transactions')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'total_transactions' => (int) $row->total_transactions,
                'omzet' => (float) $row->omzet,
            ]);
    }

    private function getTransactionTypeDemography(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw("
                COALESCE(ec.transaction_type, 'Pembelian') as label,
                COUNT(DISTINCT ec.id) as total_transactions,
                COALESCE(SUM(COALESCE(ep.total_amount, ct.total_amount, 0)), 0) as omzet
            ")
            ->groupByRaw("COALESCE(ec.transaction_type, 'Pembelian')")
            ->orderByDesc('total_transactions')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'total_transactions' => (int) $row->total_transactions,
                'omzet' => (float) $row->omzet,
            ]);
    }

    private function getCartStatusDemography(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw("
                COALESCE(ec.status, '-') as label,
                COUNT(DISTINCT ec.id) as total_transactions,
                COALESCE(SUM(COALESCE(ep.total_amount, ct.total_amount, 0)), 0) as omzet
            ")
            ->groupByRaw("COALESCE(ec.status, '-')")
            ->orderByDesc('total_transactions')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'total_transactions' => (int) $row->total_transactions,
                'omzet' => (float) $row->omzet,
            ]);
    }

    private function getPaymentStatusDemography(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw("
                COALESCE(ep.payment_status, ec.status, '-') as label,
                COUNT(DISTINCT ec.id) as total_transactions,
                COALESCE(SUM(COALESCE(ep.total_amount, ct.total_amount, 0)), 0) as omzet
            ")
            ->groupByRaw("COALESCE(ep.payment_status, ec.status, '-')")
            ->orderByDesc('total_transactions')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'total_transactions' => (int) $row->total_transactions,
                'omzet' => (float) $row->omzet,
            ]);
    }

    private function getPaymentMethodDemography(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw("
                COALESCE(pay.payment, '-') as label,
                COUNT(DISTINCT ec.id) as total_transactions,
                COALESCE(SUM(COALESCE(ep.total_amount, ct.total_amount, 0)), 0) as omzet
            ")
            ->groupByRaw("COALESCE(pay.payment, '-')")
            ->orderByDesc('total_transactions')
            ->get()
            ->map(fn ($row) => [
                'label' => $row->label,
                'total_transactions' => (int) $row->total_transactions,
                'omzet' => (float) $row->omzet,
            ]);
    }

    private function getTransactions(array $filters)
    {
        return $this->baseQuery($filters)
            ->selectRaw("
                ec.id,
                ec.no_invoice,
                COALESCE(NULLIF(TRIM(ec.customer), ''), 'Walk In Customer') as customer,
                ec.tanggal_carts,
                ec.status,
                COALESCE(ec.transaction_type, 'Pembelian') as transaction_type,
                de.nama_event,
                de.alamat_event,
                COALESCE(ct.total_qty, 0) as total_qty,
                COALESCE(ep.total_amount, ct.total_amount, 0) as total_amount,
                COALESCE(ep.paid_amount, 0) as paid_amount,
                COALESCE(ep.remaining_amount, 0) as remaining_amount,
                COALESCE(ep.payment_status, ec.status, '-') as payment_status,
                COALESCE(pay.payment, '-') as payment_method
            ")
            ->orderByDesc('ec.tanggal_carts')
            ->orderByDesc('ec.created_at')
            ->paginate($filters['per_page']);
    }
}
