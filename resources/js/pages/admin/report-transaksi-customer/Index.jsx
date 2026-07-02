import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReactSelect from "react-select";

const initialFilters = {
    event_id: "",
    date_from: firstDayOfMonth(),
    date_to: todayDate(),
    transaction_type: "",
    status: "Paid",
    customer: "",
    per_page: 10,
};

const transactionTypeOptions = [
    { value: "", label: "Semua Jenis" },
    { value: "Pembelian", label: "Pembelian" },
    { value: "PO", label: "PO" },
];

const statusOptions = [
    { value: "Paid", label: "Paid" },
    { value: "all", label: "Semua Status" },
    { value: "Draft", label: "Draft" },
    { value: "Void Transaksi", label: "Void Transaksi" },
    { value: "Void Carts", label: "Void Carts" },
];

export default function ReportTransaksiCustomerIndexPage() {
    const [filters, setFilters] = useState(initialFilters);
    const [events, setEvents] = useState([]);
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({});
    const [charts, setCharts] = useState({});
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const eventOptions = useMemo(() => {
        return [
            { value: "", label: "Semua Event" },
            ...events.map((event) => ({
                value: event.id,
                label: `${event.nama_event || "-"} - ${formatDate(event.valid_from)} s/d ${formatDate(event.valid_until)}`,
                raw: event,
            })),
        ];
    }, [events]);

    const selectedEvent = useMemo(() => {
        return eventOptions.find((item) => item.value === filters.event_id) || eventOptions[0];
    }, [eventOptions, filters.event_id]);

    const selectedTransactionType = useMemo(() => {
        return transactionTypeOptions.find((item) => item.value === filters.transaction_type) || transactionTypeOptions[0];
    }, [filters.transaction_type]);

    const selectedStatus = useMemo(() => {
        return statusOptions.find((item) => item.value === filters.status) || statusOptions[0];
    }, [filters.status]);

    useEffect(() => {
        fetchReport(1);
    }, []);

    const fetchReport = async (page = 1, nextFilters = filters) => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get("/admin/report-transaksi-customer", {
                params: {
                    ...nextFilters,
                    page,
                },
            });

            const root = response.data || {};
            const report = root.data || {};
            const transactions = report.transactions || root.transactions || {};

            const nextEvents =
                report.options?.events ||
                root.options?.events ||
                [];

            setEvents(Array.isArray(nextEvents) ? nextEvents : []);
            setSummary(report.summary || root.summary || {});
            setCharts({
                daily_omzet: report.omzet_by_date || root.charts?.daily_omzet || [],
                event_breakdown: report.omzet_by_event || root.charts?.event_breakdown || [],
                customer_breakdown: report.top_customers || root.charts?.customer_breakdown || [],
                product_breakdown: report.top_products || root.charts?.product_breakdown || [],
                demographics: report.demographics || root.charts?.demographics || {},
            });

            setRows(Array.isArray(transactions.data) ? transactions.data : []);
            setPagination({
                current_page: transactions.current_page || 1,
                last_page: transactions.last_page || 1,
                per_page: transactions.per_page || nextFilters.per_page || 10,
                total: transactions.total || 0,
            });
        } catch (err) {
            console.error(err);
            setError(getValidationMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;

        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (name, selectedOption) => {
        setFilters((prev) => ({
            ...prev,
            [name]: selectedOption?.value || "",
        }));
    };

    const applyFilter = (event) => {
        event.preventDefault();
        fetchReport(1);
    };

    const resetFilter = () => {
        setFilters(initialFilters);
        fetchReport(1, initialFilters);
    };

    const dailyOmzet = charts.daily_omzet || [];
    const eventBreakdown = charts.event_breakdown || [];
    const customerBreakdown = charts.customer_breakdown || [];
    const productBreakdown = charts.product_breakdown || [];
    const demographics = charts.demographics || {};

    const maxDailyOmzet = getMaxValue(dailyOmzet, "omzet");
    const maxEventOmzet = getMaxValue(eventBreakdown, "omzet");
    const maxCustomerOmzet = getMaxValue(customerBreakdown, "omzet");
    const maxProductQty = getMaxValue(productBreakdown, "total_qty");

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="bg-slate-950 p-8 text-white">
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                                Report
                            </p>
                            <h1 className="mt-3 text-3xl font-black tracking-tight">
                                Report Transaksi Customer
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
                                Analisa transaksi customer berdasarkan event, omset, jenis transaksi, metode pembayaran, dan produk terjual terbanyak.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <HeroMetric label="Transaksi" value={formatNumber(summary.total_transactions)} />
                            <HeroMetric label="Omset Paid" value={formatRupiah(summary.gross_omzet)} />
                            <HeroMetric label="Customer Unik" value={formatNumber(summary.unique_customers)} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <form onSubmit={applyFilter} className="space-y-5">
                    <div className="grid gap-4 xl:grid-cols-5">
                        <Select2
                            label="Event"
                            value={selectedEvent}
                            options={eventOptions}
                            onChange={(selected) => handleSelectChange("event_id", selected)}
                            placeholder="Pilih event"
                            disabled={loading}
                        />

                        <Input
                            label="Tanggal Dari"
                            type="date"
                            name="date_from"
                            value={filters.date_from}
                            onChange={handleInputChange}
                            disabled={loading}
                        />

                        <Input
                            label="Tanggal Sampai"
                            type="date"
                            name="date_to"
                            value={filters.date_to}
                            onChange={handleInputChange}
                            disabled={loading}
                        />

                        <Select2
                            label="Jenis Transaksi"
                            value={selectedTransactionType}
                            options={transactionTypeOptions}
                            onChange={(selected) => handleSelectChange("transaction_type", selected)}
                            placeholder="Jenis transaksi"
                            disabled={loading}
                        />

                        <Select2
                            label="Status"
                            value={selectedStatus}
                            options={statusOptions}
                            onChange={(selected) => handleSelectChange("status", selected)}
                            placeholder="Status"
                            disabled={loading}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                        <Input
                            label="Customer"
                            type="text"
                            name="customer"
                            value={filters.customer}
                            onChange={handleInputChange}
                            placeholder="Cari nama customer / walk in customer..."
                            disabled={loading}
                        />

                        <button
                            type="button"
                            onClick={resetFilter}
                            disabled={loading}
                            className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                            Reset
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="h-12 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            {loading ? "Memuat..." : "Terapkan Filter"}
                        </button>
                    </div>
                </form>
            </section>

            {error && <Alert message={error} />}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Total Qty" value={formatNumber(summary.total_qty)} description="Total qty produk/bundle terjual" />
                <SummaryCard label="Rata-rata Transaksi" value={formatRupiah(summary.avg_transaction)} description="Rata-rata transaksi paid" />
                <SummaryCard label="Sudah Dibayar" value={formatRupiah(summary.paid_amount)} description="Total nominal pembayaran" tone="emerald" />
                <SummaryCard label="Sisa Tagihan" value={formatRupiah(summary.remaining_amount)} description="Sisa PO / belum lunas" tone="amber" />
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <Panel title="Omset Harian" description="Pergerakan omset berdasarkan tanggal transaksi.">
                    <BarList
                        data={dailyOmzet}
                        maxValue={maxDailyOmzet}
                        labelKey="date"
                        valueKey="omzet"
                        valueFormatter={formatRupiah}
                        emptyText="Belum ada omset pada periode ini."
                    />
                </Panel>

                <Panel title="Omset per Event" description="Event dengan kontribusi omset terbesar.">
                    <BarList
                        data={eventBreakdown}
                        maxValue={maxEventOmzet}
                        labelKey="nama_event"
                        valueKey="omzet"
                        valueFormatter={formatRupiah}
                        emptyText="Belum ada data event."
                    />
                </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <Panel title="Produk Terjual Terbanyak" description="Diurutkan berdasarkan qty terjual terbanyak.">
                    <BarList
                        data={productBreakdown}
                        maxValue={maxProductQty}
                        labelKey="nama_produk"
                        valueKey="total_qty"
                        valueFormatter={(value) => `${formatNumber(value)} qty`}
                        subFormatter={(item) => `${item.tipe_harga === "bundle" ? "Bundle" : "Single"} • ${formatRupiah(item.omzet)}`}
                        emptyText="Belum ada produk terjual."
                    />
                </Panel>

                <Panel title="Top Customer" description="Customer dengan nilai transaksi terbesar.">
                    <BarList
                        data={customerBreakdown}
                        maxValue={maxCustomerOmzet}
                        labelKey="customer"
                        valueKey="omzet"
                        valueFormatter={formatRupiah}
                        subFormatter={(item) => `${formatNumber(item.total_transactions)} transaksi • ${formatNumber(item.total_qty)} qty`}
                        emptyText="Belum ada data customer."
                    />
                </Panel>
            </section>

            <section className="grid gap-6 xl:grid-cols-4">
                <MiniPanel title="Demografi Customer">
                    <MiniList data={demographics.customer_type || []} />
                </MiniPanel>

                <MiniPanel title="Jenis Transaksi">
                    <MiniList data={demographics.transaction_type || []} />
                </MiniPanel>

                <MiniPanel title="Status Pembayaran">
                    <MiniList data={demographics.payment_status || []} />
                </MiniPanel>

                <MiniPanel title="Metode Pembayaran">
                    <MiniList data={demographics.payment_method || []} />
                </MiniPanel>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">Detail Transaksi</h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Daftar transaksi customer sesuai filter yang dipilih.
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-600 ring-1 ring-slate-200">
                            {formatNumber(pagination.total)} data
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                        <TableHead>No</TableHead>
                                        <TableHead>Invoice</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Jenis</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Omset</TableHead>
                                        <TableHead>Dibayar</TableHead>
                                        <TableHead>Sisa</TableHead>
                                        <TableHead>Metode</TableHead>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={11} className="px-5 py-10 text-center font-black text-slate-400">
                                                Memuat data...
                                            </td>
                                        </tr>
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="px-5 py-14 text-center">
                                                <div className="font-black text-slate-700">Data transaksi belum tersedia</div>
                                                <div className="mt-1 text-sm font-semibold text-slate-400">Ubah filter untuk melihat data lain.</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, index) => {
                                            const number =
                                                (pagination.current_page - 1) * pagination.per_page +
                                                index +
                                                1;

                                            return (
                                                <tr key={row.id} className="text-slate-700 hover:bg-slate-50">
                                                    <TableCell>{number}</TableCell>
                                                    <td className="min-w-[180px] px-5 py-4">
                                                        <div className="font-black text-slate-950">{row.no_invoice}</div>
                                                        <div className="text-xs font-semibold text-slate-400">{formatDate(row.tanggal_carts)}</div>
                                                    </td>
                                                    <TableCell>{row.customer || "Walk In Customer"}</TableCell>
                                                    <td className="min-w-[220px] px-5 py-4">
                                                        <div className="font-black text-slate-950">{row.nama_event || "-"}</div>
                                                        <div className="text-xs font-semibold text-slate-400">{row.alamat_event || "-"}</div>
                                                    </td>
                                                    <TableCell>{row.transaction_type || "-"}</TableCell>
                                                    <td className="whitespace-nowrap px-5 py-4">
                                                        <StatusBadge status={row.payment_status || row.status} />
                                                    </td>
                                                    <TableCell>{formatNumber(row.total_qty)}</TableCell>
                                                    <TableCell>{formatRupiah(row.total_amount)}</TableCell>
                                                    <TableCell>{formatRupiah(row.paid_amount)}</TableCell>
                                                    <TableCell>{formatRupiah(row.remaining_amount)}</TableCell>
                                                    <TableCell>{row.payment_method || "-"}</TableCell>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <PaginationInfo
                        pagination={pagination}
                        loading={loading}
                        onPrev={() => fetchReport(pagination.current_page - 1)}
                        onNext={() => fetchReport(pagination.current_page + 1)}
                    />
                </div>
            </section>
        </div>
    );
}

function HeroMetric({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">{label}</p>
            <p className="mt-1 text-xl font-black text-white">{value}</p>
        </div>
    );
}

function SummaryCard({ label, value, description, tone = "slate" }) {
    const tones = {
        slate: "bg-white text-slate-950",
        emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        amber: "bg-amber-50 text-amber-700 ring-amber-100",
    };

    return (
        <div className={`rounded-[1.5rem] border border-slate-200 p-5 shadow-sm ring-1 ring-slate-100 ${tones[tone] || tones.slate}`}>
            <p className="text-xs font-black uppercase tracking-wide opacity-60">{label}</p>
            <p className="mt-2 break-words text-2xl font-black">{value}</p>
            <p className="mt-1 text-xs font-semibold opacity-70">{description}</p>
        </div>
    );
}

function Panel({ title, description, children }) {
    return (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
                <h2 className="text-lg font-black text-slate-950">{title}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
            </div>
            {children}
        </div>
    );
}

function MiniPanel({ title, children }) {
    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-950">{title}</h3>
            <div className="mt-4">{children}</div>
        </div>
    );
}

function BarList({ data, maxValue, labelKey, valueKey, valueFormatter, subFormatter, emptyText }) {
    if (!Array.isArray(data) || data.length === 0) {
        return <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">{emptyText}</div>;
    }

    return (
        <div className="space-y-4">
            {data.map((item, index) => {
                const value = Number(item[valueKey] || 0);
                const width = maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 4;

                return (
                    <div key={`${item[labelKey] || index}-${index}`}>
                        <div className="mb-2 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">{item[labelKey] || "-"}</p>
                                {subFormatter && (
                                    <p className="mt-0.5 text-xs font-semibold text-slate-400">{subFormatter(item)}</p>
                                )}
                            </div>
                            <div className="shrink-0 text-sm font-black text-slate-700">{valueFormatter(value)}</div>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-slate-950" style={{ width: `${width}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function MiniList({ data }) {
    if (!Array.isArray(data) || data.length === 0) {
        return <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">Belum ada data</div>;
    }

    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={`${item.label || index}-${index}`} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 font-black text-slate-950">{item.label || "-"}</div>
                        <div className="shrink-0 rounded-xl bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                            {formatNumber(item.total_transactions)} trx
                        </div>
                    </div>
                    <div className="mt-2 text-sm font-black text-emerald-600">{formatRupiah(item.omzet)}</div>
                </div>
            ))}
        </div>
    );
}

function Select2({ label, value, options, onChange, placeholder, disabled }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">{label}</label>
            <ReactSelect
                value={value}
                options={options}
                onChange={onChange}
                isDisabled={disabled}
                isSearchable
                isClearable
                placeholder={placeholder}
                noOptionsMessage={() => "Data tidak ditemukan"}
                classNamePrefix="react-select"
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                styles={selectStyles}
            />
        </div>
    );
}

const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: "48px",
        borderRadius: "1rem",
        borderColor: state.isFocused ? "#020617" : "#e2e8f0",
        backgroundColor: state.isDisabled ? "#f1f5f9" : "#f8fafc",
        boxShadow: "none",
        fontSize: "0.875rem",
        fontWeight: 700,
        ":hover": {
            borderColor: state.isFocused ? "#020617" : "#cbd5e1",
        },
    }),
    valueContainer: (base) => ({ ...base, paddingLeft: "1rem" }),
    placeholder: (base) => ({ ...base, color: "#94a3b8", fontWeight: 700 }),
    singleValue: (base) => ({ ...base, color: "#334155", fontWeight: 800 }),
    menu: (base) => ({ ...base, zIndex: 9999, borderRadius: "1rem", overflow: "hidden" }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
        ...base,
        fontSize: "0.875rem",
        fontWeight: state.isSelected ? 900 : 700,
        color: state.isSelected ? "#ffffff" : "#334155",
        backgroundColor: state.isSelected ? "#020617" : state.isFocused ? "#f1f5f9" : "#ffffff",
        cursor: "pointer",
    }),
    indicatorSeparator: () => ({ display: "none" }),
};

function Input({ label, ...props }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">{label}</label>
            <input
                {...props}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white disabled:opacity-60"
            />
        </div>
    );
}

function Alert({ message }) {
    return (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {message}
        </div>
    );
}

function StatusBadge({ status }) {
    const value = status || "-";
    const className =
        value === "Lunas" || value === "Paid"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : value === "Belum Lunas" || value === "Draft"
            ? "bg-amber-50 text-amber-700 ring-amber-100"
            : "bg-red-50 text-red-700 ring-red-100";

    return <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>{value}</span>;
}

function TableHead({ children }) {
    return <th className="whitespace-nowrap px-5 py-4 text-xs font-black uppercase tracking-wider">{children}</th>;
}

function TableCell({ children }) {
    return <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{children}</td>;
}

function PaginationInfo({ pagination, loading, onPrev, onNext }) {
    return (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-500">
                Halaman <span className="font-black text-slate-950">{pagination.current_page}</span> dari{" "}
                <span className="font-black text-slate-950">{pagination.last_page}</span>
            </p>
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={pagination.current_page <= 1 || loading}
                    onClick={onPrev}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    Sebelumnya
                </button>
                <button
                    type="button"
                    disabled={pagination.current_page >= pagination.last_page || loading}
                    onClick={onNext}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    Berikutnya
                </button>
            </div>
        </div>
    );
}

function getValidationMessage(err) {
    if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const firstKey = Object.keys(errors)[0];

        if (firstKey && errors[firstKey]?.[0]) {
            return errors[firstKey][0];
        }
    }

    return err.response?.data?.message || "Gagal memuat report transaksi customer.";
}

function getMaxValue(data, key) {
    if (!Array.isArray(data) || data.length === 0) return 0;

    return Math.max(...data.map((item) => Number(item[key] || 0)), 0);
}

function formatRupiah(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(number);
}

function formatNumber(value) {
    return new Intl.NumberFormat("id-ID").format(Number(value || 0));
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

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}
