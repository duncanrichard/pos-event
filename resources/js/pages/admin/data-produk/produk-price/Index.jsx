import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const initialForm = {
    produk_id: "",
    event_id: "",
    harga_produk: "",
};

export default function ProdukPriceIndexPage() {
    const [rows, setRows] = useState([]);
    const [produkOptions, setProdukOptions] = useState([]);
    const [eventOptions, setEventOptions] = useState([]);

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

    const fetchOptions = async () => {
        setOptionLoading(true);

        try {
            const response = await axios.get("/admin/produk-price/options");
            const payload = response.data?.data || {};

            setProdukOptions(Array.isArray(payload.produk) ? payload.produk : []);
            setEventOptions(Array.isArray(payload.events) ? payload.events : []);
        } catch (err) {
            console.error(err);
            setProdukOptions([]);
            setEventOptions([]);
            setError(
                "Gagal memuat pilihan produk dan event. Pastikan route /admin/produk-price/options sudah benar."
            );
        } finally {
            setOptionLoading(false);
        }
    };

    const fetchRows = async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get("/admin/produk-price", {
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
            setError("Gagal memuat data produk price.");
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
        await fetchOptions();

        setEditingId(row.id);
        setForm({
            produk_id: row.produk_id || "",
            event_id: row.event_id || "",
            harga_produk: row.harga_produk || "",
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
            produk_id: form.produk_id,
            event_id: form.event_id,
            harga_produk: form.harga_produk,
        };

        try {
            if (isEdit) {
                await axios.put(`/admin/produk-price/${editingId}`, payload);
                setSuccess("Produk price berhasil diperbarui.");
            } else {
                await axios.post("/admin/produk-price", payload);
                setSuccess("Produk price berhasil ditambahkan.");
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
        const confirmed = window.confirm(
            `Hapus harga produk "${row.produk?.nama_produk || "-"}" untuk event "${
                row.event?.nama_event || "-"
            }"?`
        );

        if (!confirmed) return;

        setDeletingId(row.id);
        setError("");
        setSuccess("");

        try {
            await axios.delete(`/admin/produk-price/${row.id}`);
            setSuccess("Produk price berhasil dihapus.");
            fetchRows(pagination.current_page);
        } catch (err) {
            console.error(err);
            setError("Gagal menghapus produk price.");
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
                            HP
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                Data Produk
                            </p>

                            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                Produk Price
                            </h1>

                            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                                Kelola harga produk berdasarkan event yang sedang
                                berjalan.
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
                            Tambah Harga
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">
                                Daftar Produk Price
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Menampilkan harga produk per event.
                            </p>
                        </div>

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari produk atau event..."
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white sm:w-80"
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
                                        <TableHead>Produk</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Periode Event</TableHead>
                                        <TableHead>Harga</TableHead>
                                        <TableHead>Tanggal Dibuat</TableHead>
                                        <TableHead align="right">Aksi</TableHead>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loading ? (
                                        <LoadingRows colSpan={7} />
                                    ) : rows.length === 0 ? (
                                        <EmptyRow
                                            colSpan={7}
                                            title="Data produk price belum tersedia"
                                            description="Tambahkan harga produk per event."
                                            buttonText="Tambah Harga"
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

                                                    <td className="min-w-[260px] px-5 py-4">
                                                        <div className="font-black text-slate-950">
                                                            {row.produk?.nama_produk || "-"}
                                                        </div>
                                                        <div className="mt-0.5 text-xs font-semibold text-slate-400">
                                                            {row.produk?.product_number || "-"}
                                                        </div>
                                                    </td>

                                                    <td className="min-w-[220px] px-5 py-4">
                                                        <div className="font-black text-slate-950">
                                                            {row.event?.nama_event || "-"}
                                                        </div>
                                                        <div className="mt-0.5 text-xs font-semibold text-slate-400">
                                                            {row.event?.alamat_event || "-"}
                                                        </div>
                                                    </td>

                                                    <TableCell>
                                                        {formatDate(row.event?.valid_from)} -{" "}
                                                        {formatDate(row.event?.valid_until)}
                                                    </TableCell>

                                                    <TableCell>
                                                        {formatRupiah(row.harga_produk)}
                                                    </TableCell>

                                                    <TableCell>
                                                        {formatDate(row.created_at)}
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
                <ProdukPriceModal
                    isEdit={isEdit}
                    form={form}
                    produkOptions={produkOptions}
                    eventOptions={eventOptions}
                    optionLoading={optionLoading}
                    error={error}
                    saving={saving}
                    onClose={closeModal}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    onReloadOptions={fetchOptions}
                />
            )}
        </div>
    );
}

function ProdukPriceModal({
    isEdit,
    form,
    produkOptions,
    eventOptions,
    optionLoading,
    error,
    saving,
    onClose,
    onChange,
    onSubmit,
    onReloadOptions,
}) {
    const hasProduk = produkOptions.length > 0;
    const hasEvent = eventOptions.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                Produk Price
                            </p>

                            <h3 className="mt-2 text-2xl font-black text-slate-950">
                                {isEdit ? "Edit Harga Produk" : "Tambah Harga Produk"}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Pilih produk dan event lalu isi harga.
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

                    {!optionLoading && !hasProduk && (
                        <Alert
                            type="error"
                            message="Data produk belum tersedia. Tambahkan produk terlebih dahulu di menu Data Produk > Produk."
                        />
                    )}

                    {!optionLoading && !hasEvent && (
                        <Alert
                            type="error"
                            message="Data event belum tersedia. Tambahkan event terlebih dahulu di menu Data Event."
                        />
                    )}

                    <form onSubmit={onSubmit} className="space-y-5">
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="block text-sm font-black text-slate-700">
                                    Produk <span className="text-red-500">*</span>
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

                            <select
                                name="produk_id"
                                value={form.produk_id}
                                onChange={onChange}
                                disabled={saving || optionLoading || !hasProduk}
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <option value="">
                                    {optionLoading
                                        ? "Memuat produk..."
                                        : hasProduk
                                        ? "Pilih Produk"
                                        : "Produk belum tersedia"}
                                </option>

                                {produkOptions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nama_produk}
                                        {item.product_number
                                            ? ` - ${item.product_number}`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                Event <span className="text-red-500">*</span>
                            </label>

                            <select
                                name="event_id"
                                value={form.event_id}
                                onChange={onChange}
                                disabled={saving || optionLoading || !hasEvent}
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <option value="">
                                    {optionLoading
                                        ? "Memuat event..."
                                        : hasEvent
                                        ? "Pilih Event"
                                        : "Event belum tersedia"}
                                </option>

                                {eventOptions.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nama_event} - {formatDate(item.valid_from)} s/d{" "}
                                        {formatDate(item.valid_until)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Input
                            label="Harga Produk"
                            name="harga_produk"
                            type="number"
                            value={form.harga_produk}
                            onChange={onChange}
                            placeholder="Contoh: 25000"
                            disabled={saving}
                            required
                        />

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
                                disabled={
                                    saving ||
                                    optionLoading ||
                                    !hasProduk ||
                                    !hasEvent
                                }
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
                        HP
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