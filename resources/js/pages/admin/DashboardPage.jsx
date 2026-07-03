import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const initialFilters = {
    event_id: "",
    date_from: getDefaultDateFrom(),
    date_to: getToday(),
};

export default function DashboardPage() {
    const [filters, setFilters] = useState(initialFilters);
    const [events, setEvents] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const summary = dashboard?.summary || {};
    const stockSummary = dashboard?.stock_summary || {};
    const demographics = dashboard?.demographics || {};
    const topEvents = dashboard?.top_events || [];
    const topProducts = dashboard?.top_products || [];
    const recentTransactions = dashboard?.recent_transactions || [];

    const selectedEvent = useMemo(() => {
        return events.find((event) => event.id === filters.event_id) || null;
    }, [events, filters.event_id]);

    useEffect(() => {
        fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDashboard = async (nextFilters = filters) => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get("/admin/dashboard", {
                params: {
                    event_id: nextFilters.event_id || undefined,
                    date_from: nextFilters.date_from || undefined,
                    date_to: nextFilters.date_to || undefined,
                },
            });

            const payload = response.data?.data || {};

            setDashboard(payload);
            setEvents(Array.isArray(payload.options?.events) ? payload.options.events : []);
        } catch (err) {
            console.error(err);
            setError("Gagal memuat data dashboard.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        fetchDashboard(filters);
    };

    const handleReset = () => {
        setFilters(initialFilters);
        fetchDashboard(initialFilters);
    };

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-sm">
                <div className="relative p-8 text-white sm:p-10">
                    <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute bottom-0 left-20 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl" />

                    <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-300">
                                EVORA POS
                            </p>

                            <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">
                                Dashboard Operasional, Omset & Demografi Penjualan
                            </h1>

                            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
                                Menampilkan ringkasan transaksi POS, omzet, stok akhir,
                                produk terjual, metode pembayaran, customer, dan performa event.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Filter Aktif
                            </p>
                            <div className="mt-2 max-w-xs text-sm font-black text-white">
                                {selectedEvent?.nama_event || "Semua Event"}
                            </div>
                            <p className="mt-1 text-xs font-semibold text-slate-300">
                                {formatDate(filters.date_from)} - {formatDate(filters.date_to)}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-4">
                        <label className="mb-2 block text-sm font-black text-slate-700">
                            Event
                        </label>
                        <select
                            name="event_id"
                            value={filters.event_id}
                            onChange={handleChange}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-950 focus:bg-white"
                        >
                            <option value="">Semua Event</option>
                            {events.map((event) => (
                                <option key={event.id} value={event.id}>
                                    {event.nama_event} - {formatDate(event.valid_from)} s/d {formatDate(event.valid_until)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="lg:col-span-2">
                        <label className="mb-2 block text-sm font-black text-slate-700">
                            Dari Tanggal
                        </label>
                        <input
                            type="date"
                            name="date_from"
                            value={filters.date_from}
                            onChange={handleChange}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-950 focus:bg-white"
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <label className="mb-2 block text-sm font-black text-slate-700">
                            Sampai Tanggal
                        </label>
                        <input
                            type="date"
                            name="date_to"
                            value={filters.date_to}
                            onChange={handleChange}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-950 focus:bg-white"
                        />
                    </div>

                    <div className="flex gap-3 lg:col-span-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-12 flex-1 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Memuat..." : "Tampilkan"}
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={loading}
                            className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </section>

            {error && <Alert message={error} />}

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Omset" value={formatRupiah(summary.omzet)} description="Total transaksi paid" code="OMS" />
                <StatCard title="Transaksi Paid" value={formatNumber(summary.paid_transactions)} description={`${formatNumber(summary.total_transactions)} total transaksi`} code="TRX" />
                <StatCard title="Produk Terjual" value={formatNumber(summary.total_qty_sold)} description="Qty dari detail POS" code="QTY" />
                <StatCard title="Rata-rata Transaksi" value={formatRupiah(summary.average_transaction)} description="Omset dibagi transaksi paid" code="AVG" />
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Stock Akhir" value={formatNumber(stockSummary.total_stock_akhir)} description={`${formatNumber(stockSummary.total_stock_masuk)} stok masuk`} code="STK" />
                <StatCard title="Terpakai" value={formatNumber(stockSummary.total_stock_terpakai)} description={`${formatNumber(stockSummary.total_stock_paid)} paid, ${formatNumber(stockSummary.total_stock_draft)} draft`} code="OUT" />
                <StatCard title="Sisa Tagihan" value={formatRupiah(summary.remaining_amount)} description={`${formatRupiah(summary.paid_amount)} terbayar`} code="AR" />
                <StatCard title="Total Event" value={formatNumber(summary.total_events)} description={`${formatNumber(summary.active_events)} berjalan`} code="EV" />
            </section>

            <section className="grid gap-6 xl:grid-cols-4">
                {(demographics.sales_overview || []).map((item) => (
                    <SalesOverviewCard key={item.label} item={item} />
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                    <SectionTitle
                        title="Grafik Omset Harian"
                        subtitle="Demografi penjualan berdasarkan tanggal transaksi paid."
                    />
                    <BarChart
                        items={demographics.sales_by_date || []}
                        valueKey="omzet"
                        valueFormatter={formatRupiah}
                        emptyText="Belum ada data omset harian."
                    />
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionTitle
                        title="Jam Transaksi Ramai"
                        subtitle="Distribusi transaksi paid berdasarkan jam."
                    />
                    <BarChart
                        items={demographics.sales_by_hour || []}
                        valueKey="total"
                        valueFormatter={formatNumber}
                        emptyText="Belum ada data jam transaksi."
                    />
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <DemographyCard title="Metode Pembayaran" subtitle="Omset dan transaksi per metode bayar" items={demographics.payment_method || []} />
                <DemographyCard title="Jenis Transaksi" subtitle="Pembelian dan PO" items={demographics.transaction_type || []} />
                <DemographyCard title="Status Pembayaran" subtitle="Lunas, DP, Draft, dan status lain" items={demographics.payment_status || []} />
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <DemographyCard title="Tipe Customer" subtitle="Walk in vs customer bernama" items={demographics.customer_type || []} />
                <DemographyCard title="Tipe Produk" subtitle="Single dan bundle" items={demographics.product_type || []} />
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionTitle title="Komposisi Event" subtitle="Status tanggal event saat ini." />
                    <StackList items={demographics.event_status || []} valueKey="total" />
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                    <SectionTitle title="Demografi Stok" subtitle="Distribusi status stok berdasarkan stok akhir produk event." />
                    <div className="grid gap-4 md:grid-cols-3">
                        {(demographics.stock_status || []).map((item) => (
                            <DemographyItem
                                key={item.label}
                                label={item.label}
                                value={formatNumber(item.total)}
                                percent={`${formatNumber(item.percent)}%`}
                                width={item.percent}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionTitle title="Ringkasan Master" subtitle="Jumlah master event dan produk." />
                    <div className="grid gap-3">
                        <MiniInfo label="Event Aktif" value={formatNumber(summary.active_events)} />
                        <MiniInfo label="Event Akan Datang" value={formatNumber(summary.upcoming_events)} />
                        <MiniInfo label="Event Terlewat" value={formatNumber(summary.expired_events)} />
                        <MiniInfo label="Total Produk" value={formatNumber(summary.total_products)} />
                        <MiniInfo label="Harga Produk" value={formatNumber(summary.total_product_prices)} />
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionTitle title="Event Omset Terbesar" subtitle="Event dengan kontribusi omzet tertinggi." />
                    <SimpleTable
                        headers={["Event", "Transaksi", "Qty", "Omset"]}
                        rows={topEvents.map((row) => [
                            row.nama_event,
                            formatNumber(row.total_transactions),
                            formatNumber(row.total_qty),
                            formatRupiah(row.omzet),
                        ])}
                        emptyText="Belum ada data event."
                    />
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionTitle title="Produk Terjual Terbanyak" subtitle="Produk atau bundle dengan qty penjualan tertinggi." />
                    <SimpleTable
                        headers={["Produk", "Tipe", "Qty", "Omset"]}
                        rows={topProducts.map((row) => [
                            row.nama_produk,
                            row.tipe_harga === "bundle" ? "Bundle" : "Single",
                            formatNumber(row.total_qty),
                            formatRupiah(row.omzet),
                        ])}
                        emptyText="Belum ada produk terjual."
                    />
                </div>
            </section>

            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <SectionTitle title="Transaksi Terbaru" subtitle="Data transaksi terbaru dari POS." />
                <SimpleTable
                    headers={["Invoice", "Customer", "Event", "Jenis", "Status", "Payment", "Qty", "Total"]}
                    rows={recentTransactions.map((row) => [
                        row.no_invoice || "-",
                        row.customer || "Walk In Customer",
                        row.nama_event || "-",
                        row.transaction_type || "-",
                        row.payment_status || row.status || "-",
                        row.payment_method || "-",
                        formatNumber(row.total_qty),
                        formatRupiah(row.total_amount),
                    ])}
                    emptyText="Belum ada transaksi."
                />
            </section>
        </div>
    );
}

function SectionTitle({ title, subtitle }) {
    return (
        <div className="mb-6">
            <h2 className="text-xl font-black tracking-tight text-slate-950">{title}</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{subtitle}</p>
        </div>
    );
}

function StatCard({ title, value, description, code }) {
    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-slate-500">{title}</p>
                    <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</h3>
                    <p className="mt-2 text-xs font-bold text-slate-400">{description}</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                    {code}
                </div>
            </div>
        </div>
    );
}

function SalesOverviewCard({ item }) {
    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-black text-slate-500">{item.label}</p>
            <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                {formatNumber(item.total)}
            </h3>
            <p className="mt-2 text-xs font-bold text-slate-400">
                Omset: {formatRupiah(item.omzet)}
            </p>
        </div>
    );
}

function DemographyItem({ label, value, percent, width }) {
    const safeWidth = Math.max(0, Math.min(Number(width || 0), 100));

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-slate-700">{label}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Total data</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-slate-950">{value}</div>
                    <div className="text-xs font-black text-slate-500">{percent}</div>
                </div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                <div className="h-2.5 rounded-full bg-slate-950" style={{ width: `${safeWidth}%` }} />
            </div>
        </div>
    );
}

function DemographyCard({ title, subtitle, items }) {
    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionTitle title={title} subtitle={subtitle} />
            <StackList items={items} valueKey="total" />
        </div>
    );
}

function StackList({ items, valueKey = "total" }) {
    const safeItems = Array.isArray(items) ? items : [];

    const total = Math.max(
        safeItems.reduce((sum, item) => sum + Number(item[valueKey] || 0), 0),
        1
    );

    if (!safeItems.length) {
        return <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400">Belum ada data.</div>;
    }

    return (
        <div className="space-y-4">
            {safeItems.map((item) => {
                const value = Number(item[valueKey] || 0);
                const percent = (value / total) * 100;

                return (
                    <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                            <span className="font-black text-slate-700">{item.label}</span>
                            <span className="font-black text-slate-950">{formatNumber(value)}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-3 rounded-full bg-slate-950" style={{ width: `${Math.max(percent, 3)}%` }} />
                        </div>
                        {item.omzet !== undefined && (
                            <p className="mt-1 text-xs font-bold text-slate-400">{formatRupiah(item.omzet)}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function BarChart({ items, valueKey = "total", valueFormatter = formatNumber, emptyText = "Belum ada data." }) {
    const safeItems = Array.isArray(items) ? items : [];
    const maxValue = Math.max(...safeItems.map((item) => Number(item[valueKey] || 0)), 0);

    if (!safeItems.length || maxValue <= 0) {
        return <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-400">{emptyText}</div>;
    }

    return (
        <div className="space-y-4">
            {safeItems.map((item) => {
                const value = Number(item[valueKey] || 0);
                const width = Math.max((value / maxValue) * 100, 4);

                return (
                    <div key={item.label}>
                        <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                            <span className="font-black text-slate-700">{formatShortLabel(item.label)}</span>
                            <span className="font-black text-slate-950">{valueFormatter(value)}</span>
                        </div>
                        <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-4 rounded-full bg-slate-950" style={{ width: `${width}%` }} />
                        </div>
                        {item.qty !== undefined && (
                            <p className="mt-1 text-xs font-bold text-slate-400">
                                Qty: {formatNumber(item.qty)} | Transaksi: {formatNumber(item.total)}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function MiniInfo({ label, value }) {
    return (
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-black text-slate-600">{label}</span>
            <span className="text-sm font-black text-slate-950">{value}</span>
        </div>
    );
}

function SimpleTable({ headers, rows, emptyText = "Belum ada data." }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-950 text-white">
                            {headers.map((header) => (
                                <th key={header} className="whitespace-nowrap px-5 py-4 font-black">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={headers.length} className="px-5 py-10 text-center font-bold text-slate-400">
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t border-slate-100 text-slate-700 hover:bg-slate-50">
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} className="whitespace-nowrap px-5 py-4 font-semibold">
                                            {renderCell(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Alert({ message }) {
    return (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {message}
        </div>
    );
}

function renderCell(value) {
    const statusClass = {
        "Stok Aman": "bg-emerald-100 text-emerald-700",
        "Stok Menipis": "bg-amber-100 text-amber-700",
        "Stok Kosong": "bg-red-100 text-red-700",
        Lunas: "bg-emerald-100 text-emerald-700",
        "Belum Lunas": "bg-amber-100 text-amber-700",
        Paid: "bg-emerald-100 text-emerald-700",
        Draft: "bg-slate-100 text-slate-700",
        "Void Carts": "bg-red-100 text-red-700",
        "Void Transaksi": "bg-red-100 text-red-700",
        Bundle: "bg-blue-100 text-blue-700",
        Single: "bg-emerald-100 text-emerald-700",
        PO: "bg-purple-100 text-purple-700",
        Pembelian: "bg-slate-100 text-slate-700",
    };

    if (statusClass[value]) {
        return <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass[value]}`}>{value}</span>;
    }

    return value;
}

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function getDefaultDateFrom() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
}

function formatDate(value) {
    if (!value) return "-";

    try {
        return new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(value));
    } catch {
        return "-";
    }
}

function formatShortLabel(value) {
    if (!value) return "-";

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return formatDate(value);
    }

    return value;
}

function formatNumber(value) {
    return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}