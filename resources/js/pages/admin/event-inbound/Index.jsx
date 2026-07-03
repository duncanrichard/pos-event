import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReactSelect from "react-select";

const initialForm = {
    supplier_id: "",
    event_id: "",
    produk_price_id: "",
    jumlah_produk: "",
    tanggal_inbound: "",
};

export default function EventInboundIndexPage() {
    const [rows, setRows] = useState([]);
    const [supplierOptions, setSupplierOptions] = useState([]);
    const [eventOptions, setEventOptions] = useState([]);
    const [produkPriceOptions, setProdukPriceOptions] = useState([]);

    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });

    const [form, setForm] = useState(initialForm);
    const [editingId, setEditingId] = useState(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [loading, setLoading] = useState(false);
    const [optionLoading, setOptionLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isEdit = useMemo(() => Boolean(editingId), [editingId]);

    const singleProdukPriceOptions = useMemo(() => {
        return produkPriceOptions.filter((item) => isSingleProdukPrice(item));
    }, [produkPriceOptions]);

    useEffect(() => {
        fetchOptions();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);

        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        fetchRows(1);
    }, [debouncedSearch]);

    const fetchOptions = async (eventId = "") => {
        setOptionLoading(true);

        try {
            const response = await axios.get("/admin/event-inbound/options", {
                params: {
                    event_id: eventId || undefined,
                },
            });

            const payload = response.data?.data || {};

            setSupplierOptions(
                Array.isArray(payload.suppliers) ? payload.suppliers : []
            );
            const nextEvents = Array.isArray(payload.events)
                ? payload.events.filter((item) => isActiveEvent(item))
                : [];

            setEventOptions(nextEvents);
            const nextProdukPrices = Array.isArray(payload.produk_prices)
                ? payload.produk_prices.filter((item) => isSingleProdukPrice(item))
                : [];

            setProdukPriceOptions(nextProdukPrices);
        } catch (err) {
            console.error(err);
            setError("Gagal memuat pilihan event inbound.");
            setSupplierOptions([]);
            setEventOptions([]);
            setProdukPriceOptions([]);
        } finally {
            setOptionLoading(false);
        }
    };

    const fetchRows = async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get("/admin/event-inbound", {
                params: {
                    page,
                    search: debouncedSearch,
                    per_page: pagination.per_page,
                },
            });

            const payload = response.data?.data || {};

            setRows(payload.data || []);
            setPagination({
                current_page: payload.current_page || 1,
                last_page: payload.last_page || 1,
                per_page: payload.per_page || 10,
                total: payload.total || 0,
            });
        } catch (err) {
            console.error(err);
            setError("Gagal memuat data event inbound.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm(initialForm);
        setEditingId(null);
        setError("");
    };

    const openCreateModal = async () => {
        resetForm();
        await fetchOptions();
        setModalOpen(true);
    };

    const openEditModal = async (row) => {
        await fetchOptions(row.event_id);

        setEditingId(row.id);
        setForm({
            supplier_id: row.supplier_id || "",
            event_id: row.event_id || "",
            produk_price_id: row.produk_price_id || "",
            jumlah_produk: row.jumlah_produk || "",
            tanggal_inbound: formatInputDate(row.tanggal_inbound),
        });
        setError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        resetForm();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = async (name, selectedOption) => {
        const value = selectedOption?.value || "";

        setForm((prev) => {
            const nextForm = {
                ...prev,
                [name]: value,
            };

            if (name === "event_id") {
                nextForm.produk_price_id = "";
            }

            return nextForm;
        });

        if (name === "event_id") {
            await fetchOptions(value);
        }
    };

    const getValidationMessage = (err) => {
        if (err.response?.data?.errors) {
            const errors = err.response.data.errors;
            const firstKey = Object.keys(errors)[0];

            if (firstKey && errors[firstKey]?.[0]) {
                return errors[firstKey][0];
            }
        }

        if (err.response?.data?.message) {
            return err.response.data.message;
        }

        return "Terjadi kesalahan. Silakan coba lagi.";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setSaving(true);
        setError("");
        setSuccess("");

        const payload = {
            supplier_id: form.supplier_id || null,
            event_id: form.event_id,
            produk_price_id: form.produk_price_id,
            jumlah_produk: form.jumlah_produk,
            tanggal_inbound: form.tanggal_inbound,
        };

        try {
            if (isEdit) {
                await axios.put(`/admin/event-inbound/${editingId}`, payload);
                setSuccess("Event inbound berhasil diperbarui.");
            } else {
                await axios.post("/admin/event-inbound", payload);
                setSuccess("Event inbound berhasil ditambahkan.");
            }

            closeModal();
            fetchRows(isEdit ? pagination.current_page : 1);
        } catch (err) {
            console.error(err);
            setError(getValidationMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (row) => {
        const productName = getProdukPriceName(row.produk_price) || "produk ini";

        const confirmed = window.confirm(
            `Hapus inbound untuk "${productName}"?`
        );

        if (!confirmed) return;

        setDeletingId(row.id);
        setError("");
        setSuccess("");

        try {
            await axios.delete(`/admin/event-inbound/${row.id}`);
            setSuccess("Event inbound berhasil dihapus.");
            fetchRows(pagination.current_page);
        } catch (err) {
            console.error(err);
            setError("Gagal menghapus event inbound.");
        } finally {
            setDeletingId(null);
        }
    };

    const fromData =
        pagination.total === 0
            ? 0
            : (pagination.current_page - 1) * pagination.per_page + 1;

    const toData = Math.min(
        pagination.current_page * pagination.per_page,
        pagination.total
    );

    return (
        <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-lg">
                            EI
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                Event
                            </p>

                            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                Event Stok
                            </h1>

                            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                                Kelola stok masuk produk berdasarkan event,
                                supplier, dan produk price.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={() => {
                                fetchOptions();
                                fetchRows(1);
                            }}
                            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
                        >
                            Tambah Inbound
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">
                                Daftar Event Stok
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Menampilkan data stok masuk event.
                            </p>
                        </div>

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari event, produk, supplier..."
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white sm:w-96"
                        />
                    </div>
                </div>

                <div className="p-6">
                    {error && !modalOpen && <Alert type="error" message={error} />}
                    {success && <Alert type="success" message={success} />}

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                        <TableHead>No</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Produk</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Harga</TableHead>
                                        <TableHead>Jumlah</TableHead>
                                        <TableHead>Tanggal Inbound</TableHead>
                                        <TableHead align="right">Aksi</TableHead>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loading ? (
                                        <LoadingRows colSpan={8} />
                                    ) : rows.length === 0 ? (
                                        <EmptyRow
                                            colSpan={8}
                                            title="Data event inbound belum tersedia"
                                            description="Tambahkan stok masuk produk untuk event."
                                            buttonText="Tambah Inbound"
                                            onClick={openCreateModal}
                                        />
                                    ) : (
                                        rows.map((row, index) => {
                                            const number =
                                                (pagination.current_page - 1) *
                                                    pagination.per_page +
                                                index +
                                                1;

                                            return (
                                                <tr
                                                    key={row.id}
                                                    className="text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-400">
                                                        {number}
                                                    </td>

                                                    <td className="min-w-[220px] px-5 py-4">
                                                        <div className="font-black text-slate-950">
                                                            {row.event?.nama_event || "-"}
                                                        </div>
                                                        <div className="mt-0.5 text-xs font-semibold text-slate-400">
                                                            {row.event?.alamat_event || "-"}
                                                        </div>
                                                    </td>

                                                    <td className="min-w-[240px] px-5 py-4">
                                                        <div className="font-black text-slate-950">
                                                            {getProdukPriceName(row.produk_price)}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                                                                Single
                                                            </span>
                                                            <span className="text-xs font-semibold text-slate-400">
                                                                {getProdukPriceCode(row.produk_price)}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <TableCell>
                                                        {row.supplier?.nama_supplier || "-"}
                                                    </TableCell>

                                                    <TableCell>
                                                        {formatRupiah(
                                                            row.produk_price?.harga_produk
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        {row.jumlah_produk}
                                                    </TableCell>

                                                    <TableCell>
                                                        {formatDate(row.tanggal_inbound)}
                                                    </TableCell>

                                                    <td className="whitespace-nowrap px-5 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(row)}
                                                            className="mr-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(row)}
                                                            disabled={deletingId === row.id}
                                                            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {deletingId === row.id
                                                                ? "Menghapus..."
                                                                : "Hapus"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <PaginationInfo
                        fromData={fromData}
                        toData={toData}
                        pagination={pagination}
                        loading={loading}
                        onPrev={() => fetchRows(pagination.current_page - 1)}
                        onNext={() => fetchRows(pagination.current_page + 1)}
                    />
                </div>
            </section>

            {modalOpen && (
                <EventInboundModal
                    isEdit={isEdit}
                    form={form}
                    supplierOptions={supplierOptions}
                    eventOptions={eventOptions}
                    produkPriceOptions={singleProdukPriceOptions}
                    optionLoading={optionLoading}
                    error={error}
                    saving={saving}
                    onClose={closeModal}
                    onChange={handleChange}
                    onSelectChange={handleSelectChange}
                    onSubmit={handleSubmit}
                    onReloadOptions={() => fetchOptions(form.event_id)}
                />
            )}
        </div>
    );
}

function EventInboundModal({
    isEdit,
    form,
    supplierOptions,
    eventOptions,
    produkPriceOptions,
    optionLoading,
    error,
    saving,
    onClose,
    onChange,
    onSelectChange,
    onSubmit,
    onReloadOptions,
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                Event Inbound
                            </p>

                            <h3 className="mt-2 text-2xl font-black text-slate-950">
                                {isEdit ? "Edit Event Inbound" : "Tambah Event Inbound"}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Pilih supplier, event, produk price, dan jumlah masuk.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-slate-200"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {error && <Alert type="error" message={error} />}

                    <form onSubmit={onSubmit} className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-2">
                            <Select2
                                label="Supplier"
                                name="supplier_id"
                                value={form.supplier_id}
                                onChange={onSelectChange}
                                disabled={saving || optionLoading}
                                options={supplierOptions.map((item) => ({
                                    value: item.id,
                                    label: `${item.nama_supplier}${
                                        item.contact_supplier
                                            ? ` - ${item.contact_supplier}`
                                            : ""
                                    }`,
                                }))}
                                placeholder="Cari / pilih supplier"
                            />

                            <Select2
                                label="Event"
                                name="event_id"
                                value={form.event_id}
                                onChange={onSelectChange}
                                disabled={saving || optionLoading}
                                options={eventOptions
                                    .filter((item) => isActiveEvent(item))
                                    .map((item) => ({
                                        value: item.id,
                                        label: `${item.nama_event} - ${formatDate(
                                            item.valid_from
                                        )} s/d ${formatDate(item.valid_until)}`,
                                    }))}
                                placeholder="Cari / pilih event"
                                required
                            />

                            <div className="md:col-span-2">
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="block text-sm font-black text-slate-700">
                                        Produk Price{" "}
                                        <span className="text-red-500">*</span>
                                    </label>

                                    <button
                                        type="button"
                                        onClick={onReloadOptions}
                                        disabled={saving || optionLoading}
                                        className="text-xs font-black text-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {optionLoading ? "Memuat..." : "Reload"}
                                    </button>
                                </div>

                                <Select2
                                    label=""
                                    name="produk_price_id"
                                    value={form.produk_price_id}
                                    onChange={onSelectChange}
                                    disabled={
                                        saving ||
                                        optionLoading ||
                                        !form.event_id
                                    }
                                    options={produkPriceOptions
                                        .filter((item) => isSingleProdukPrice(item))
                                        .map((item) => ({
                                            value: item.id,
                                            label: `${getProdukPriceName(item)} - ${getProdukPriceCode(item)} | ${formatRupiah(item.harga_produk)}`,
                                        }))}
                                    placeholder={
                                        form.event_id
                                            ? "Cari / pilih produk price"
                                            : "Pilih event terlebih dahulu"
                                    }
                                />
                            </div>

                            <Input
                                label="Jumlah Produk"
                                name="jumlah_produk"
                                type="number"
                                value={form.jumlah_produk}
                                onChange={onChange}
                                placeholder="Contoh: 100"
                                disabled={saving}
                                required
                            />

                            <Input
                                label="Tanggal Inbound"
                                name="tanggal_inbound"
                                type="date"
                                value={form.tanggal_inbound}
                                onChange={onChange}
                                disabled={saving}
                                required
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={saving}
                                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                disabled={saving || optionLoading}
                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving
                                    ? "Menyimpan..."
                                    : isEdit
                                    ? "Simpan Perubahan"
                                    : "Simpan"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function Select2({
    label,
    name,
    value,
    options,
    placeholder,
    disabled,
    onChange,
}) {
    const selectedValue = useMemo(() => {
        return options.find((item) => item.value === value) || null;
    }, [options, value]);

    return (
        <div>
            {label && (
                <label className="mb-2 block text-sm font-black text-slate-700">
                    {label}
                </label>
            )}

            <ReactSelect
                name={name}
                value={selectedValue}
                onChange={(selectedOption) => onChange(name, selectedOption)}
                options={options}
                isClearable
                isSearchable
                isDisabled={disabled}
                placeholder={placeholder}
                noOptionsMessage={() => "Data tidak ditemukan"}
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
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
        fontWeight: 600,
        ":hover": {
            borderColor: state.isFocused ? "#020617" : "#cbd5e1",
        },
    }),
    valueContainer: (base) => ({
        ...base,
        paddingLeft: "1rem",
        paddingRight: "0.5rem",
    }),
    placeholder: (base) => ({
        ...base,
        color: "#94a3b8",
        fontWeight: 600,
    }),
    singleValue: (base) => ({
        ...base,
        color: "#334155",
        fontWeight: 700,
    }),
    input: (base) => ({
        ...base,
        color: "#334155",
        fontWeight: 700,
    }),
    menu: (base) => ({
        ...base,
        zIndex: 9999,
        borderRadius: "1rem",
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        boxShadow:
            "0 20px 25px -5px rgb(15 23 42 / 0.1), 0 8px 10px -6px rgb(15 23 42 / 0.1)",
    }),
    menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
    }),
    option: (base, state) => ({
        ...base,
        fontSize: "0.875rem",
        fontWeight: 700,
        color: state.isSelected ? "#ffffff" : "#334155",
        backgroundColor: state.isSelected
            ? "#020617"
            : state.isFocused
            ? "#f1f5f9"
            : "#ffffff",
        cursor: "pointer",
        ":active": {
            backgroundColor: state.isSelected ? "#020617" : "#e2e8f0",
        },
    }),
    indicatorSeparator: () => ({
        display: "none",
    }),
};

function Input({ label, required = false, ...props }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            <input
                {...props}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            />
        </div>
    );
}

function TableHead({ children, align = "left" }) {
    return (
        <th
            className={`whitespace-nowrap px-5 py-4 text-xs font-black uppercase tracking-wider ${
                align === "right" ? "text-right" : "text-left"
            }`}
        >
            {children}
        </th>
    );
}

function TableCell({ children }) {
    return (
        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">
            {children}
        </td>
    );
}

function EmptyRow({ colSpan, title, description, buttonText, onClick }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-5 py-14 text-center">
                <div className="mx-auto flex max-w-md flex-col items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-500">
                        EI
                    </div>

                    <h3 className="mt-4 text-base font-black text-slate-950">
                        {title}
                    </h3>

                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        {description}
                    </p>

                    <button
                        type="button"
                        onClick={onClick}
                        className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                    >
                        {buttonText}
                    </button>
                </div>
            </td>
        </tr>
    );
}

function Alert({ type, message }) {
    const styles =
        type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700";

    const label = type === "success" ? "Berhasil" : "Perhatian";

    return (
        <div
            className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${styles}`}
        >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black">
                !
            </div>

            <div>
                <div className="font-black">{label}</div>
                <div className="mt-0.5 font-semibold">{message}</div>
            </div>
        </div>
    );
}

function LoadingRows({ colSpan }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-5 py-10 text-center">
                <div className="font-black text-slate-500">Memuat data...</div>
            </td>
        </tr>
    );
}

function PaginationInfo({
    fromData,
    toData,
    pagination,
    loading,
    onPrev,
    onNext,
}) {
    return (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-500">
                Menampilkan{" "}
                <span className="font-black text-slate-950">{fromData}</span> -{" "}
                <span className="font-black text-slate-950">{toData}</span> dari{" "}
                <span className="font-black text-slate-950">
                    {pagination.total}
                </span>{" "}
                data
            </p>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={pagination.current_page <= 1 || loading}
                    onClick={onPrev}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Sebelumnya
                </button>

                <div className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                    {pagination.current_page} / {pagination.last_page}
                </div>

                <button
                    type="button"
                    disabled={
                        pagination.current_page >= pagination.last_page || loading
                    }
                    onClick={onNext}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Berikutnya
                </button>
            </div>
        </div>
    );
}



function isActiveEvent(event) {
    if (!event || !event.valid_until) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validUntil = new Date(event.valid_until);
    validUntil.setHours(0, 0, 0, 0);

    return validUntil >= today;
}

function isSingleProdukPrice(item) {
    if (!item) return false;

    const tipeHarga = String(
        item.tipe_harga ||
            item.type ||
            (item.nama_bundle ? "bundle" : "single")
    ).toLowerCase();

    if (tipeHarga === "bundle") {
        return false;
    }

    if (item.nama_bundle) {
        return false;
    }

    const produkId = item.produk_id || item.produk?.id || item.product?.id;

    return Boolean(produkId);
}

function getProdukPriceName(item) {
    if (!item) return "-";

    return (
        item.produk?.nama_produk ||
        item.produk?.name ||
        item.product?.nama_produk ||
        item.product?.name ||
        item.nama_produk ||
        item.product_name ||
        "-"
    );
}

function getProdukPriceCode(item) {
    if (!item) return "-";

    return (
        item.produk?.product_number ||
        item.product?.product_number ||
        item.product_number ||
        item.produk?.code_gs1 ||
        item.product?.code_gs1 ||
        item.code_gs1 ||
        "-"
    );
}

function formatRupiah(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(number);
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

function formatInputDate(value) {
    if (!value) return "";

    return String(value).slice(0, 10);
}