import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const initialForm = {
    package: "",
};

export default function PackageIndexPage() {
    const [rows, setRows] = useState([]);
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
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isEdit = useMemo(() => Boolean(editingId), [editingId]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);

        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        fetchRows(1);
    }, [debouncedSearch]);

    const fetchRows = async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get("/admin/package", {
                params: {
                    page,
                    search: debouncedSearch,
                    per_page: pagination.per_page,
                },
            });

            const payload = response.data.data;

            setRows(payload.data || []);
            setPagination({
                current_page: payload.current_page || 1,
                last_page: payload.last_page || 1,
                per_page: payload.per_page || 10,
                total: payload.total || 0,
            });
        } catch (err) {
            console.error(err);
            setError("Gagal memuat data package.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm(initialForm);
        setEditingId(null);
        setError("");
    };

    const openCreateModal = () => {
        resetForm();
        setModalOpen(true);
    };

    const openEditModal = (row) => {
        setEditingId(row.id);
        setForm({
            package: row.package || "",
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

        try {
            if (isEdit) {
                await axios.put(`/admin/package/${editingId}`, form);
                setSuccess("Package berhasil diperbarui.");
            } else {
                await axios.post("/admin/package", form);
                setSuccess("Package berhasil ditambahkan.");
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
            `Hapus package "${row.package}"?`
        );

        if (!confirmed) return;

        setDeletingId(row.id);
        setError("");
        setSuccess("");

        try {
            await axios.delete(`/admin/package/${row.id}`);
            setSuccess("Package berhasil dihapus.");
            fetchRows(pagination.current_page);
        } catch (err) {
            console.error(err);
            setError("Gagal menghapus package.");
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
                            PK
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                Master Data
                            </p>

                            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                Package
                            </h1>

                            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                                Kelola data package atau kemasan produk yang
                                digunakan pada master produk dan transaksi POS.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={() => fetchRows(1)}
                            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800"
                        >
                            Tambah Package
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">
                                Daftar Package
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Menampilkan data package yang tersimpan.
                            </p>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari package..."
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white sm:w-80"
                            />

                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                                /
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {error && !modalOpen && (
                        <Alert type="error" message={error} />
                    )}

                    {success && (
                        <Alert type="success" message={success} />
                    )}

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                        <th className="w-16 whitespace-nowrap px-5 py-4 text-xs font-black uppercase tracking-wider">
                                            No
                                        </th>

                                        <th className="whitespace-nowrap px-5 py-4 text-xs font-black uppercase tracking-wider">
                                            Nama Package
                                        </th>

                                      
                                        <th className="whitespace-nowrap px-5 py-4 text-xs font-black uppercase tracking-wider">
                                            Tanggal Dibuat
                                        </th>

                                        <th className="w-44 whitespace-nowrap px-5 py-4 text-right text-xs font-black uppercase tracking-wider">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loading ? (
                                        <LoadingRows />
                                    ) : rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="5"
                                                className="px-5 py-14 text-center"
                                            >
                                                <div className="mx-auto flex max-w-md flex-col items-center">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-500">
                                                        PK
                                                    </div>

                                                    <h3 className="mt-4 text-base font-black text-slate-950">
                                                        Data package belum tersedia
                                                    </h3>

                                                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                                                        Tambahkan data package
                                                        pertama untuk kebutuhan
                                                        master produk.
                                                    </p>

                                                    <button
                                                        type="button"
                                                        onClick={openCreateModal}
                                                        className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                                                    >
                                                        Tambah Package
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
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

                                                    <td className="whitespace-nowrap px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-700">
                                                                {getInitial(row.package)}
                                                            </div>

                                                            <div>
                                                                <div className="font-black text-slate-950">
                                                                    {row.package}
                                                                </div>

                                                               
                                                            </div>
                                                        </div>
                                                    </td>

                                                  

                                                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">
                                                        {formatDate(row.created_at)}
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditModal(row)
                                                            }
                                                            className="mr-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDelete(row)
                                                            }
                                                            disabled={
                                                                deletingId === row.id
                                                            }
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

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-500">
                            Menampilkan{" "}
                            <span className="font-black text-slate-950">
                                {fromData}
                            </span>{" "}
                            -{" "}
                            <span className="font-black text-slate-950">
                                {toData}
                            </span>{" "}
                            dari{" "}
                            <span className="font-black text-slate-950">
                                {pagination.total}
                            </span>{" "}
                            data
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={pagination.current_page <= 1 || loading}
                                onClick={() =>
                                    fetchRows(pagination.current_page - 1)
                                }
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
                                    pagination.current_page >=
                                        pagination.last_page || loading
                                }
                                onClick={() =>
                                    fetchRows(pagination.current_page + 1)
                                }
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
                        <div className="border-b border-slate-100 p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                        Package
                                    </p>

                                    <h3 className="mt-2 text-2xl font-black text-slate-950">
                                        {isEdit
                                            ? "Edit Package"
                                            : "Tambah Package"}
                                    </h3>

                                    <p className="mt-1 text-sm font-semibold text-slate-500">
                                        {isEdit
                                            ? "Perbarui nama package."
                                            : "Tambahkan package baru."}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-600 hover:bg-slate-200"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {error && modalOpen && (
                                <Alert type="error" message={error} />
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-black text-slate-700">
                                        Nama Package
                                    </label>

                                    <input
                                        type="text"
                                        name="package"
                                        value={form.package}
                                        onChange={handleChange}
                                        placeholder="Contoh: Box, Pcs, Dus"
                                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
                                        disabled={saving}
                                    />

                                    <p className="mt-2 text-xs font-semibold text-slate-400">
                                        Package digunakan sebagai informasi kemasan
                                        atau bentuk satuan produk.
                                    </p>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        disabled={saving}
                                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Batal
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={saving}
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
            )}
        </div>
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

function LoadingRows() {
    return Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="animate-pulse border-t border-slate-100">
            <td className="px-5 py-4">
                <div className="h-4 w-6 rounded bg-slate-100"></div>
            </td>

            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100"></div>
                    <div>
                        <div className="h-4 w-40 rounded bg-slate-100"></div>
                        <div className="mt-2 h-3 w-24 rounded bg-slate-100"></div>
                    </div>
                </div>
            </td>

            <td className="px-5 py-4">
                <div className="h-6 w-16 rounded-full bg-slate-100"></div>
            </td>

            <td className="px-5 py-4">
                <div className="h-4 w-24 rounded bg-slate-100"></div>
            </td>

            <td className="px-5 py-4">
                <div className="ml-auto h-8 w-24 rounded bg-slate-100"></div>
            </td>
        </tr>
    ));
}

function getInitial(value) {
    if (!value) return "PK";

    return value
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
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