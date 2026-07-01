import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReactSelect from "react-select";
import Barcode from "react-barcode";

const initialForm = {
    kategori_produk_id: "",
    brand_id: "",
    satuan_id: "",
    package_id: "",
    nama_produk: "",
    product_number: "",
    weight: "",
    code_gs1: "",
};

const initialFilters = {
    kategori_produk_id: "",
    brand_id: "",
    satuan_id: "",
    package_id: "",
    only_has_gs1: false,
};

export default function ProdukIndexPage() {
    const [rows, setRows] = useState([]);
    const [options, setOptions] = useState({
        kategori_produk: [],
        brands: [],
        satuans: [],
        packages: [],
    });

    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });

    const [form, setForm] = useState(initialForm);
    const [filters, setFilters] = useState(initialFilters);
    const [editingId, setEditingId] = useState(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [filterOpen, setFilterOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
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
    }, [debouncedSearch, filters]);

    const requestParams = (page = 1) => ({
        page,
        search: debouncedSearch,
        per_page: pagination.per_page,
        kategori_produk_id: filters.kategori_produk_id || undefined,
        brand_id: filters.brand_id || undefined,
        satuan_id: filters.satuan_id || undefined,
        package_id: filters.package_id || undefined,
        only_has_gs1: filters.only_has_gs1 ? 1 : undefined,
    });

    const fetchOptions = async () => {
        try {
            const response = await axios.get("/admin/produk/options");
            setOptions(response.data.data || {});
        } catch (err) {
            console.error(err);
            setError("Gagal memuat pilihan data produk.");
        }
    };

    const fetchRows = async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get("/admin/produk", {
                params: requestParams(page),
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
            setError("Gagal memuat data produk.");
        } finally {
            setLoading(false);
        }
    };

    const exportGs1Pdf = async () => {
        setExporting(true);
        setError("");
        setSuccess("");

        try {
            const response = await axios.get("/admin/produk/export-gs1-pdf", {
                params: {
                    search: debouncedSearch,
                    kategori_produk_id: filters.kategori_produk_id || undefined,
                    brand_id: filters.brand_id || undefined,
                    satuan_id: filters.satuan_id || undefined,
                    package_id: filters.package_id || undefined,
                    only_has_gs1: 1,
                },
                responseType: "blob",
            });

            const blob = new Blob([response.data], {
                type: "application/pdf",
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `cetak-gs1-produk-${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            setSuccess("PDF GS1 produk berhasil dibuat.");
        } catch (err) {
            console.error(err);
            setError("Gagal export PDF GS1 produk.");
        } finally {
            setExporting(false);
        }
    };

    const resetFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setFilters(initialFilters);
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
            kategori_produk_id: row.kategori_produk_id || "",
            brand_id: row.brand_id || "",
            satuan_id: row.satuan_id || "",
            package_id: row.package_id || "",
            nama_produk: row.nama_produk || "",
            product_number: row.product_number || "",
            weight: row.weight || "",
            code_gs1: row.code_gs1 || "",
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

    const handleSelectChange = (name, selectedOption) => {
        setForm((prev) => ({
            ...prev,
            [name]: selectedOption?.value || "",
        }));
    };

    const handleFilterSelectChange = (name, selectedOption) => {
        setFilters((prev) => ({
            ...prev,
            [name]: selectedOption?.value || "",
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
            kategori_produk_id: form.kategori_produk_id || null,
            brand_id: form.brand_id || null,
            satuan_id: form.satuan_id || null,
            package_id: form.package_id || null,
            nama_produk: form.nama_produk,
            product_number: form.product_number || null,
            weight: form.weight || null,
            code_gs1: form.code_gs1 || null,
            image: null,
        };

        try {
            if (isEdit) {
                await axios.put(`/admin/produk/${editingId}`, payload);
                setSuccess("Produk berhasil diperbarui.");
            } else {
                await axios.post("/admin/produk", payload);
                setSuccess("Produk berhasil ditambahkan.");
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
        const confirmed = window.confirm(`Hapus produk "${row.nama_produk}"?`);

        if (!confirmed) return;

        setDeletingId(row.id);
        setError("");
        setSuccess("");

        try {
            await axios.delete(`/admin/produk/${row.id}`);
            setSuccess("Produk berhasil dihapus.");
            fetchRows(pagination.current_page);
        } catch (err) {
            console.error(err);
            setError("Gagal menghapus produk.");
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
                            PR
                        </div>

                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                                Data Produk
                            </p>

                            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                Produk
                            </h1>

                            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                                Kelola data produk, filter produk, barcode GS1,
                                dan export PDF barcode untuk semua produk.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={() => setFilterOpen((prev) => !prev)}
                            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                            {filterOpen ? "Tutup Filter" : "Buka Filter"}
                        </button>

                        <button
                            type="button"
                            onClick={exportGs1Pdf}
                            disabled={exporting}
                            className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {exporting ? "Membuat PDF..." : "Cetak GS1 PDF"}
                        </button>

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
                            Tambah Produk
                        </button>
                    </div>
                </div>
            </section>

            {filterOpen && (
                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                        <div className="w-full xl:w-80">
                            <Input
                                label="Cari Produk"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Nama, product number, GS1..."
                            />
                        </div>

                        <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Select2
                                label="Kategori"
                                name="kategori_produk_id"
                                value={filters.kategori_produk_id}
                                onChange={handleFilterSelectChange}
                                options={options.kategori_produk || []}
                                labelKey="kategori"
                                placeholder="Semua kategori"
                            />

                            <Select2
                                label="Brand"
                                name="brand_id"
                                value={filters.brand_id}
                                onChange={handleFilterSelectChange}
                                options={options.brands || []}
                                labelKey="brand"
                                placeholder="Semua brand"
                            />

                            <Select2
                                label="Satuan"
                                name="satuan_id"
                                value={filters.satuan_id}
                                onChange={handleFilterSelectChange}
                                options={options.satuans || []}
                                labelKey="satuan"
                                placeholder="Semua satuan"
                            />

                            <Select2
                                label="Package"
                                name="package_id"
                                value={filters.package_id}
                                onChange={handleFilterSelectChange}
                                options={options.packages || []}
                                labelKey="package"
                                placeholder="Semua package"
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="inline-flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={filters.only_has_gs1}
                                    onChange={(e) =>
                                        setFilters((prev) => ({
                                            ...prev,
                                            only_has_gs1: e.target.checked,
                                        }))
                                    }
                                    className="h-4 w-4 rounded border-slate-300"
                                />
                                Ada GS1
                            </label>

                            <button
                                type="button"
                                onClick={resetFilters}
                                className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </section>
            )}

            <section className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">
                                Daftar Produk
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Menampilkan data produk yang tersimpan.
                            </p>
                        </div>

                        {!filterOpen && (
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari produk..."
                                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white sm:w-80"
                            />
                        )}
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
                                        <TableHead>Kategori</TableHead>
                                        <TableHead>Brand</TableHead>
                                        <TableHead>Satuan</TableHead>
                                        <TableHead>Package</TableHead>
                                        <TableHead>Weight</TableHead>
                                        <TableHead>GS1 / Barcode</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead align="right">Aksi</TableHead>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loading ? (
                                        <LoadingRows colSpan={10} />
                                    ) : rows.length === 0 ? (
                                        <EmptyRow
                                            colSpan={10}
                                            title="Data produk belum tersedia"
                                            description="Tambahkan data produk pertama untuk kebutuhan transaksi POS."
                                            buttonText="Tambah Produk"
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
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-700">
                                                                {getInitial(row.nama_produk)}
                                                            </div>

                                                            <div>
                                                                <div className="font-black text-slate-950">
                                                                    {row.nama_produk}
                                                                </div>

                                                                <div className="mt-0.5 text-xs font-semibold text-slate-400">
                                                                    {row.product_number || "-"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <TableCell>
                                                        {row.kategori_produk?.kategori || "-"}
                                                    </TableCell>

                                                    <TableCell>
                                                        {row.brand?.brand || "-"}
                                                    </TableCell>

                                                    <TableCell>
                                                        {row.satuan?.satuan || "-"}
                                                    </TableCell>

                                                    <TableCell>
                                                        {row.package?.package || "-"}
                                                    </TableCell>

                                                    <TableCell>
                                                        {row.weight || "-"}
                                                    </TableCell>

                                                    <td className="min-w-[220px] px-5 py-4">
                                                        <BarcodePreview value={row.code_gs1} />
                                                    </td>

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
                <ProdukModal
                    isEdit={isEdit}
                    form={form}
                    options={options}
                    error={error}
                    saving={saving}
                    onClose={closeModal}
                    onChange={handleChange}
                    onSelectChange={handleSelectChange}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
}

function ProdukModal({
    isEdit,
    form,
    options,
    error,
    saving,
    onClose,
    onChange,
    onSelectChange,
    onSubmit,
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl">
                <div className="border-b border-slate-100 p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                Produk
                            </p>

                            <h3 className="mt-2 text-2xl font-black text-slate-950">
                                {isEdit ? "Edit Produk" : "Tambah Produk"}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Field image disembunyikan. Barcode otomatis dibuat
                                dari Code GS1.
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
                            <Input
                                label="Nama Produk"
                                name="nama_produk"
                                value={form.nama_produk}
                                onChange={onChange}
                                placeholder="Contoh: Kopi Susu"
                                disabled={saving}
                                required
                            />

                            <Input
                                label="Product Number"
                                name="product_number"
                                value={form.product_number}
                                onChange={onChange}
                                placeholder="Contoh: PRD-001"
                                disabled={saving}
                            />

                            <Select2
                                label="Kategori Produk"
                                name="kategori_produk_id"
                                value={form.kategori_produk_id}
                                onChange={onSelectChange}
                                disabled={saving}
                                options={options.kategori_produk || []}
                                labelKey="kategori"
                                placeholder="Cari / pilih kategori produk"
                            />

                            <Select2
                                label="Brand"
                                name="brand_id"
                                value={form.brand_id}
                                onChange={onSelectChange}
                                disabled={saving}
                                options={options.brands || []}
                                labelKey="brand"
                                placeholder="Cari / pilih brand"
                            />

                            <Select2
                                label="Satuan"
                                name="satuan_id"
                                value={form.satuan_id}
                                onChange={onSelectChange}
                                disabled={saving}
                                options={options.satuans || []}
                                labelKey="satuan"
                                placeholder="Cari / pilih satuan"
                            />

                            <Select2
                                label="Package"
                                name="package_id"
                                value={form.package_id}
                                onChange={onSelectChange}
                                disabled={saving}
                                options={options.packages || []}
                                labelKey="package"
                                placeholder="Cari / pilih package"
                            />

                            <Input
                                label="Weight"
                                name="weight"
                                value={form.weight}
                                onChange={onChange}
                                placeholder="Contoh: 250"
                                type="number"
                                disabled={saving}
                            />

                            <Input
                                label="Code GS1"
                                name="code_gs1"
                                value={form.code_gs1}
                                onChange={onChange}
                                placeholder="Contoh: 8991234567890"
                                disabled={saving}
                            />

                            <div className="md:col-span-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="mb-3 text-sm font-black text-slate-700">
                                        Preview Barcode GS1
                                    </p>

                                    <BarcodePreview value={form.code_gs1} large />
                                </div>
                            </div>

                            <input type="hidden" name="image" value="" />
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
    );
}

function BarcodePreview({ value, large = false }) {
    const cleanValue = String(value || "").trim();

    if (!cleanValue) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs font-bold text-slate-400">
                GS1 belum diisi
            </div>
        );
    }

    return (
        <div className="inline-flex max-w-full flex-col items-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="max-w-full overflow-hidden">
                <Barcode
                    value={cleanValue}
                    format={getBarcodeFormat(cleanValue)}
                    width={large ? 1.7 : 1.2}
                    height={large ? 70 : 44}
                    fontSize={large ? 14 : 10}
                    margin={4}
                    displayValue
                />
            </div>

            <div className="mt-1 max-w-[190px] truncate text-[11px] font-black text-slate-500">
                {cleanValue}
            </div>
        </div>
    );
}

function getBarcodeFormat(value) {
    const cleanValue = String(value || "").trim();

    if (/^\d{13}$/.test(cleanValue)) {
        return "EAN13";
    }

    return "CODE128";
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

function Select2({
    label,
    name,
    value,
    options,
    labelKey,
    placeholder,
    disabled = false,
    onChange,
}) {
    const selectOptions = useMemo(() => {
        return options.map((item) => ({
            value: item.id,
            label: item[labelKey] || "-",
        }));
    }, [options, labelKey]);

    const selectedValue = useMemo(() => {
        return selectOptions.find((item) => item.value === value) || null;
    }, [selectOptions, value]);

    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </label>

            <ReactSelect
                name={name}
                value={selectedValue}
                onChange={(selectedOption) => onChange(name, selectedOption)}
                options={selectOptions}
                isClearable
                isSearchable
                isDisabled={disabled}
                placeholder={placeholder || `Pilih ${label}`}
                noOptionsMessage={() => "Data tidak ditemukan"}
                loadingMessage={() => "Memuat data..."}
                classNamePrefix="react-select"
                styles={selectStyles}
                menuPortalTarget={document.body}
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
    dropdownIndicator: (base) => ({
        ...base,
        color: "#64748b",
    }),
    clearIndicator: (base) => ({
        ...base,
        color: "#64748b",
    }),
};

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
                        PR
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

function getInitial(value) {
    if (!value) return "PR";

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