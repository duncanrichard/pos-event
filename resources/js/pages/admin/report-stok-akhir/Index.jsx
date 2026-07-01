import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReactSelect from "react-select";

const initialMeta = {
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
    from: null,
    to: null,
};

const initialSummary = {
    total_produk: 0,
    total_stock_masuk: 0,
    total_stock_draft: 0,
    total_stock_paid: 0,
    total_stock_terpakai: 0,
    total_stock_po: 0,
    total_stock_akhir: 0,
};

export default function ReportStokAkhirIndexPage() {
    const [events, setEvents] = useState([]);
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState(initialSummary);
    const [meta, setMeta] = useState(initialMeta);

    const [eventId, setEventId] = useState("");
    const [search, setSearch] = useState("");
    const [perPage, setPerPage] = useState(25);

    const [loading, setLoading] = useState(false);
    const [optionLoading, setOptionLoading] = useState(false);
    const [error, setError] = useState("");

    const eventOptions = useMemo(() => {
        return events.map((event) => ({
            value: event.id,
            label: `${event.nama_event || "-"}${event.valid_from ? ` - ${formatDate(event.valid_from)}` : ""}${event.valid_until ? ` s/d ${formatDate(event.valid_until)}` : ""}`,
            raw: event,
        }));
    }, [events]);

    const selectedEvent = useMemo(() => {
        return eventOptions.find((item) => item.value === eventId) || null;
    }, [eventOptions, eventId]);

    useEffect(() => {
        fetchOptions();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchRows(1);
        }, 350);

        return () => clearTimeout(timeout);
    }, [eventId, search, perPage]);

    const fetchOptions = async () => {
        setOptionLoading(true);

        try {
            const response = await axios.get("/admin/report-stok-akhir/options");
            setEvents(response.data?.data?.events || []);
        } catch (err) {
            console.error(err);
            setError("Gagal memuat pilihan event.");
        } finally {
            setOptionLoading(false);
        }
    };

    const fetchRows = async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get("/admin/report-stok-akhir", {
                params: {
                    event_id: eventId || undefined,
                    search: search || undefined,
                    per_page: perPage,
                    page,
                },
            });

            setRows(response.data?.data || []);
            setSummary(response.data?.summary || initialSummary);
            setMeta(response.data?.meta || initialMeta);
        } catch (err) {
            console.error(err);
            setRows([]);
            setSummary(initialSummary);
            setMeta(initialMeta);
            setError(err.response?.data?.message || "Gagal memuat report stok akhir.");
        } finally {
            setLoading(false);
        }
    };

    const resetFilter = () => {
        setEventId("");
        setSearch("");
        setPerPage(25);
    };

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="relative bg-slate-950 p-7 text-white sm:p-8">
                    <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl"></div>
                    <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl"></div>

                    <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
                                Report Event
                            </p>

                            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                                Report Stok Akhir
                            </h1>

                            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-300">
                                Monitoring stok akhir setiap event berdasarkan stok masuk,
                                transaksi draft, transaksi paid, dan PO. PO hanya sebagai
                                informasi dan tidak mengurangi stok akhir.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                            <SummaryCard
                                label="Stok Masuk"
                                value={summary.total_stock_masuk}
                                tone="blue"
                            />
                            <SummaryCard
                                label="Terpakai"
                                value={summary.total_stock_terpakai}
                                tone="amber"
                            />
                            <SummaryCard
                                label="Stok Akhir"
                                value={summary.total_stock_akhir}
                                tone="emerald"
                            />
                        </div>
                    </div>
                </div>

                <div className="border-b border-slate-200 bg-white p-5">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,380px)_140px_auto] xl:items-end">
                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                Event
                            </label>
                            <ReactSelect
                                value={selectedEvent}
                                options={eventOptions}
                                onChange={(selected) => setEventId(selected?.value || "")}
                                isClearable
                                isSearchable
                                isLoading={optionLoading}
                                placeholder="Semua event"
                                noOptionsMessage={() => "Event tidak ditemukan"}
                                menuPortalTarget={document.body}
                                styles={selectStyles}
                            />
                        </div>

                        <Input
                            label="Cari Produk / GS1 / Event"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari nama produk, barcode, GS1, event..."
                        />

                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                Per Page
                            </label>
                            <select
                                value={perPage}
                                onChange={(e) => setPerPage(Number(e.target.value))}
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none focus:border-slate-950 focus:bg-white"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={resetFilter}
                            className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800"
                        >
                            Reset
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className="grid gap-4 border-b border-slate-200 bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-6">
                    <SmallMetric label="Produk" value={summary.total_produk} />
                    <SmallMetric label="Draft Pembelian" value={summary.total_stock_draft} />
                    <SmallMetric label="Paid Pembelian" value={summary.total_stock_paid} />
                    <SmallMetric label="Total Terpakai" value={summary.total_stock_terpakai} />
                    <SmallMetric label="Qty PO" value={summary.total_stock_po} />
                    <SmallMetric label="Stok Akhir" value={summary.total_stock_akhir} highlight />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-[1100px] w-full text-left">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <Th>Event</Th>
                                <Th>Produk</Th>
                                <Th className="text-right">Harga</Th>
                                <Th className="text-center">Masuk</Th>
                                <Th className="text-center">Draft</Th>
                                <Th className="text-center">Paid</Th>
                                <Th className="text-center">Terpakai</Th>
                                <Th className="text-center">PO</Th>
                                <Th className="text-center">Stok Akhir</Th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-16 text-center">
                                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950"></div>
                                        <p className="mt-4 text-sm font-black text-slate-400">
                                            Memuat report stok akhir...
                                        </p>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-16 text-center">
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-xl font-black text-slate-400">
                                            SA
                                        </div>
                                        <p className="mt-4 text-base font-black text-slate-700">
                                            Data stok akhir belum tersedia
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-slate-400">
                                            Pilih event lain atau ubah kata kunci pencarian.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr key={row.produk_price_id} className="hover:bg-slate-50/80">
                                        <Td>
                                            <div className="max-w-[260px]">
                                                <p className="truncate text-sm font-black text-slate-950">
                                                    {row.event?.nama_event || "-"}
                                                </p>
                                                <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">
                                                    {row.event?.alamat_event || "-"}
                                                </p>
                                            </div>
                                        </Td>

                                        <Td>
                                            <div className="max-w-[360px]">
                                                <p className="truncate text-sm font-black text-slate-950">
                                                    {row.produk?.nama_produk || "-"}
                                                </p>
                                                <p className="mt-1 text-xs font-bold text-slate-400">
                                                    PN: {row.produk?.product_number || "-"} · GS1: {row.produk?.code_gs1 || "-"}
                                                </p>
                                            </div>
                                        </Td>

                                        <Td className="text-right font-black text-slate-700">
                                            {formatRupiah(row.harga_produk)}
                                        </Td>

                                        <Td className="text-center">
                                            <StockPill value={row.stock_masuk} tone="blue" />
                                        </Td>

                                        <Td className="text-center">
                                            <StockPill value={row.stock_draft} tone="amber" />
                                        </Td>

                                        <Td className="text-center">
                                            <StockPill value={row.stock_paid} tone="emerald" />
                                        </Td>

                                        <Td className="text-center">
                                            <StockPill value={row.stock_terpakai} tone="red" />
                                        </Td>

                                        <Td className="text-center">
                                            <StockPill value={row.stock_po} tone="slate" />
                                        </Td>

                                        <Td className="text-center">
                                            <StockPill
                                                value={row.stock_akhir}
                                                tone={Number(row.stock_akhir || 0) <= 0 ? "red" : "emerald"}
                                                large
                                            />
                                        </Td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-slate-500">
                        Menampilkan{" "}
                        <span className="font-black text-slate-950">{meta.from || 0}</span>
                        {" - "}
                        <span className="font-black text-slate-950">{meta.to || 0}</span>
                        {" dari "}
                        <span className="font-black text-slate-950">{meta.total || 0}</span>
                        {" data"}
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fetchRows(Number(meta.current_page || 1) - 1)}
                            disabled={loading || Number(meta.current_page || 1) <= 1}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Prev
                        </button>

                        <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                            {meta.current_page || 1} / {meta.last_page || 1}
                        </div>

                        <button
                            type="button"
                            onClick={() => fetchRows(Number(meta.current_page || 1) + 1)}
                            disabled={
                                loading ||
                                Number(meta.current_page || 1) >= Number(meta.last_page || 1)
                            }
                            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

function SummaryCard({ label, value, tone = "slate" }) {
    const tones = {
        blue: "bg-blue-500/15 text-blue-100 ring-blue-400/20",
        amber: "bg-amber-500/15 text-amber-100 ring-amber-400/20",
        emerald: "bg-emerald-500/15 text-emerald-100 ring-emerald-400/20",
        slate: "bg-white/10 text-white ring-white/10",
    };

    return (
        <div className={`rounded-2xl px-4 py-3 ring-1 ${tones[tone] || tones.slate}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                {label}
            </p>
            <p className="mt-1 text-2xl font-black">{formatNumber(value)}</p>
        </div>
    );
}

function SmallMetric({ label, value, highlight = false }) {
    return (
        <div
            className={`rounded-2xl border px-4 py-4 ${
                highlight
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
            }`}
        >
            <p
                className={`text-[10px] font-black uppercase tracking-wide ${
                    highlight ? "text-emerald-600" : "text-slate-400"
                }`}
            >
                {label}
            </p>
            <p
                className={`mt-1 text-2xl font-black ${
                    highlight ? "text-emerald-700" : "text-slate-950"
                }`}
            >
                {formatNumber(value)}
            </p>
        </div>
    );
}

function StockPill({ value, tone = "slate", large = false }) {
    const tones = {
        blue: "bg-blue-50 text-blue-700 ring-blue-100",
        amber: "bg-amber-50 text-amber-700 ring-amber-100",
        emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        red: "bg-red-50 text-red-700 ring-red-100",
        slate: "bg-slate-100 text-slate-700 ring-slate-200",
    };

    return (
        <span
            className={`inline-flex min-w-[58px] items-center justify-center rounded-xl px-3 py-1 font-black ring-1 ${
                large ? "text-base" : "text-sm"
            } ${tones[tone] || tones.slate}`}
        >
            {formatNumber(value)}
        </span>
    );
}

function Input({ label, ...props }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </label>
            <input
                {...props}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-950 focus:bg-white"
            />
        </div>
    );
}

function Th({ children, className = "" }) {
    return (
        <th className={`whitespace-nowrap px-5 py-4 text-xs font-black uppercase tracking-wide text-slate-500 ${className}`}>
            {children}
        </th>
    );
}

function Td({ children, className = "" }) {
    return (
        <td className={`px-5 py-4 align-top text-sm ${className}`}>
            {children}
        </td>
    );
}

const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: "48px",
        borderRadius: "1rem",
        borderColor: state.isFocused ? "#020617" : "#e2e8f0",
        backgroundColor: "#f8fafc",
        boxShadow: "none",
        fontSize: "0.875rem",
        fontWeight: 700,
        maxWidth: "100%",
    }),
    container: (base) => ({
        ...base,
        maxWidth: "100%",
    }),
    menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
    }),
    option: (base, state) => ({
        ...base,
        fontWeight: 700,
        color: state.isSelected ? "#ffffff" : "#334155",
        backgroundColor: state.isSelected
            ? "#020617"
            : state.isFocused
            ? "#f1f5f9"
            : "#ffffff",
    }),
};

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
