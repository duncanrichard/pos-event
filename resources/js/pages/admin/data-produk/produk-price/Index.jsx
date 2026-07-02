import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReactSelect from "react-select";

const initialForm = {
    tipe_harga: "single",
    produk_id: "",
    event_id: "",
    nama_bundle: "",
    harga_produk: "",
    items: [
        {
            produk_id: "",
            qty: 1,
        },
    ],
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
    const isBundle = form.tipe_harga === "bundle";
    const isSingle = form.tipe_harga === "single";

    const produkSelectOptions = useMemo(() => {
        return produkOptions.map((item) => ({
            value: item.id,
            label: `${item.nama_produk || "-"}${
                item.product_number ? ` - ${item.product_number}` : ""
            }${item.code_gs1 ? ` - ${item.code_gs1}` : ""}`,
            raw: item,
        }));
    }, [produkOptions]);

    const eventSelectOptions = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return eventOptions
            .filter((item) => {
                if (!item.valid_until) {
                    return false;
                }

                const validUntil = new Date(item.valid_until);
                validUntil.setHours(0, 0, 0, 0);

                return validUntil >= today;
            })
            .map((item) => ({
                value: item.id,
                label: `${item.nama_event || "-"} - ${formatDate(
                    item.valid_from
                )} s/d ${formatDate(item.valid_until)}`,
                raw: item,
            }));
    }, [eventOptions]);

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

        const tipeHarga = row.tipe_harga || (row.nama_bundle ? "bundle" : "single");

        setEditingId(row.id);
        setForm({
            tipe_harga: tipeHarga,
            produk_id: row.produk_id || "",
            event_id: row.event_id || "",
            nama_bundle: row.nama_bundle || "",
            harga_produk: row.harga_produk || "",
            items:
                Array.isArray(row.bundle_details) && row.bundle_details.length > 0
                    ? row.bundle_details.map((detail) => ({
                          produk_id: detail.produk_id || detail.produk?.id || "",
                          qty: detail.qty || 1,
                      }))
                    : Array.isArray(row.bundleDetails) && row.bundleDetails.length > 0
                    ? row.bundleDetails.map((detail) => ({
                          produk_id: detail.produk_id || detail.produk?.id || "",
                          qty: detail.qty || 1,
                      }))
                    : [
                          {
                              produk_id: "",
                              qty: 1,
                          },
                      ],
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

        setForm((prev) => {
            if (name === "tipe_harga") {
                return {
                    ...prev,
                    tipe_harga: value,
                    produk_id: value === "bundle" ? "" : prev.produk_id,
                    nama_bundle: value === "single" ? "" : prev.nama_bundle,
                    items:
                        value === "bundle"
                            ? prev.items?.length
                                ? prev.items
                                : [{ produk_id: "", qty: 1 }]
                            : [{ produk_id: "", qty: 1 }],
                };
            }

            return {
                ...prev,
                [name]: value,
            };
        });
    };

    const handleSelectChange = (name, selectedOption) => {
        setForm((prev) => ({
            ...prev,
            [name]: selectedOption?.value || "",
        }));
    };

    const handleBundleItemChange = (index, field, value) => {
        setForm((prev) => {
            const nextItems = [...prev.items];

            nextItems[index] = {
                ...nextItems[index],
                [field]: field === "qty" ? Number(value || 1) : value,
            };

            return {
                ...prev,
                items: nextItems,
            };
        });
    };

    const handleBundleItemSelectChange = (index, selectedOption) => {
        setForm((prev) => {
            const nextItems = [...prev.items];

            nextItems[index] = {
                ...nextItems[index],
                produk_id: selectedOption?.value || "",
            };

            return {
                ...prev,
                items: nextItems,
            };
        });
    };

    const addBundleItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    produk_id: "",
                    qty: 1,
                },
            ],
        }));
    };

    const removeBundleItem = (index) => {
        setForm((prev) => {
            const nextItems = prev.items.filter((_, itemIndex) => itemIndex !== index);

            return {
                ...prev,
                items: nextItems.length > 0 ? nextItems : [{ produk_id: "", qty: 1 }],
            };
        });
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

    const validateBeforeSubmit = () => {
        if (!form.event_id) {
            return "Event wajib dipilih.";
        }

        if (!form.harga_produk || Number(form.harga_produk) < 0) {
            return "Harga wajib diisi dan tidak boleh kurang dari 0.";
        }

        if (isSingle && !form.produk_id) {
            return "Produk wajib dipilih untuk harga single.";
        }

        if (isBundle) {
            if (!String(form.nama_bundle || "").trim()) {
                return "Nama bundle wajib diisi.";
            }

            const validItems = form.items.filter(
                (item) => item.produk_id && Number(item.qty || 0) > 0
            );

            if (validItems.length === 0) {
                return "Isi bundle minimal 1 produk.";
            }

            // Produk yang sama boleh dimasukkan lebih dari 1 baris.
            // Contoh: Produk A x1 dan Produk A x2 tetap disimpan sebagai item terpisah.
        }

        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationMessage = validateBeforeSubmit();

        if (validationMessage) {
            setError(validationMessage);
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        const payload = {
            tipe_harga: form.tipe_harga,
            event_id: form.event_id,
            harga_produk: form.harga_produk,
            produk_id: isSingle ? form.produk_id : null,
            nama_bundle: isBundle ? form.nama_bundle : null,
            items: isBundle
                ? form.items
                      .filter((item) => item.produk_id && Number(item.qty || 0) > 0)
                      .map((item) => ({
                          produk_id: item.produk_id,
                          qty: Number(item.qty || 1),
                      }))
                : [],
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
        const label = getRowName(row);

        const confirmed = window.confirm(
            `Hapus harga "${label}" untuk event "${row.event?.nama_event || "-"}"?`
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
                                Kelola harga produk berdasarkan event, termasuk harga single produk dan bundle.
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
                                Menampilkan harga single produk dan bundle per event.
                            </p>
                        </div>

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari produk, bundle, atau event..."
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
                                        <TableHead>Nama / Produk</TableHead>
                                        <TableHead>Tipe</TableHead>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Periode Event</TableHead>
                                        <TableHead>Isi Bundle</TableHead>
                                        <TableHead>Harga</TableHead>
                                        <TableHead>Tanggal Dibuat</TableHead>
                                        <TableHead align="right">Aksi</TableHead>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {loading ? (
                                        <LoadingRows colSpan={9} />
                                    ) : rows.length === 0 ? (
                                        <EmptyRow
                                            colSpan={9}
                                            title="Data produk price belum tersedia"
                                            description="Tambahkan harga single produk atau bundle per event."
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

                                            const tipeHarga = getRowType(row);
                                            const bundleDetails = getBundleDetails(row);

                                            return (
                                                <tr
                                                    key={row.id}
                                                    className="text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-400">
                                                        {number}
                                                    </td>

                                                    <td className="min-w-[280px] px-5 py-4">
                                                        <div className="font-black text-slate-950">
                                                            {getRowName(row)}
                                                        </div>

                                                        <div className="mt-0.5 text-xs font-semibold text-slate-400">
                                                            {tipeHarga === "bundle"
                                                                ? row.nama_bundle || "-"
                                                                : row.produk?.product_number || "-"}
                                                        </div>
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4">
                                                        <TypeBadge type={tipeHarga} />
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

                                                    <td className="min-w-[260px] px-5 py-4">
                                                        {tipeHarga === "bundle" ? (
                                                            bundleDetails.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {bundleDetails
                                                                        .slice(0, 4)
                                                                        .map((detail, detailIndex) => (
                                                                            <div
                                                                                key={detail.id || detailIndex}
                                                                                className="text-xs font-bold text-slate-500"
                                                                            >
                                                                                {detail.produk?.nama_produk || "-"}{" "}
                                                                                <span className="font-black text-slate-950">
                                                                                    x{detail.qty || 1}
                                                                                </span>
                                                                            </div>
                                                                        ))}

                                                                    {bundleDetails.length > 4 && (
                                                                        <div className="text-xs font-black text-slate-400">
                                                                            +{bundleDetails.length - 4} produk lain
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm font-semibold text-slate-400">
                                                                    Belum ada item
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-sm font-semibold text-slate-400">
                                                                -
                                                            </span>
                                                        )}
                                                    </td>

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
                    produkSelectOptions={produkSelectOptions}
                    eventSelectOptions={eventSelectOptions}
                    optionLoading={optionLoading}
                    error={error}
                    saving={saving}
                    isBundle={isBundle}
                    isSingle={isSingle}
                    onClose={closeModal}
                    onChange={handleChange}
                    onSelectChange={handleSelectChange}
                    onSubmit={handleSubmit}
                    onReloadOptions={fetchOptions}
                    onBundleItemChange={handleBundleItemChange}
                    onBundleItemSelectChange={handleBundleItemSelectChange}
                    onAddBundleItem={addBundleItem}
                    onRemoveBundleItem={removeBundleItem}
                />
            )}
        </div>
    );
}

function ProdukPriceModal({
    isEdit,
    form,
    produkSelectOptions,
    eventSelectOptions,
    optionLoading,
    error,
    saving,
    isBundle,
    isSingle,
    onClose,
    onChange,
    onSelectChange,
    onSubmit,
    onReloadOptions,
    onBundleItemChange,
    onBundleItemSelectChange,
    onAddBundleItem,
    onRemoveBundleItem,
}) {
    const hasProduk = produkSelectOptions.length > 0;
    const hasEvent = eventSelectOptions.length > 0;

    const selectedEvent =
        eventSelectOptions.find((item) => item.value === form.event_id) || null;

    const selectedProduk =
        produkSelectOptions.find((item) => item.value === form.produk_id) || null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] bg-white shadow-2xl">
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
                                Pilih tipe harga single produk atau bundle.
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
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                Tipe Harga <span className="text-red-500">*</span>
                            </label>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label
                                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                                        isSingle
                                            ? "border-slate-950 bg-slate-950 text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="tipe_harga"
                                        value="single"
                                        checked={isSingle}
                                        onChange={onChange}
                                        disabled={saving}
                                        className="sr-only"
                                    />

                                    <div className="text-sm font-black">
                                        Single Produk
                                    </div>
                                    <div
                                        className={`mt-1 text-xs font-semibold ${
                                            isSingle ? "text-slate-300" : "text-slate-400"
                                        }`}
                                    >
                                        1 produk memiliki 1 harga event.
                                    </div>
                                </label>

                                <label
                                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                                        isBundle
                                            ? "border-slate-950 bg-slate-950 text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="tipe_harga"
                                        value="bundle"
                                        checked={isBundle}
                                        onChange={onChange}
                                        disabled={saving}
                                        className="sr-only"
                                    />

                                    <div className="text-sm font-black">
                                        Bundle Produk
                                    </div>
                                    <div
                                        className={`mt-1 text-xs font-semibold ${
                                            isBundle ? "text-slate-300" : "text-slate-400"
                                        }`}
                                    >
                                        Beberapa produk menjadi 1 harga paket.
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                Event <span className="text-red-500">*</span>
                            </label>

                            <Select2
                                value={selectedEvent}
                                options={eventSelectOptions}
                                onChange={(selected) =>
                                    onSelectChange("event_id", selected)
                                }
                                placeholder={
                                    optionLoading
                                        ? "Memuat event..."
                                        : hasEvent
                                        ? "Pilih Event"
                                        : "Event belum tersedia"
                                }
                                disabled={saving || optionLoading || !hasEvent}
                            />
                        </div>

                        {isSingle && (
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

                                <Select2
                                    value={selectedProduk}
                                    options={produkSelectOptions}
                                    onChange={(selected) =>
                                        onSelectChange("produk_id", selected)
                                    }
                                    placeholder={
                                        optionLoading
                                            ? "Memuat produk..."
                                            : hasProduk
                                            ? "Pilih Produk"
                                            : "Produk belum tersedia"
                                    }
                                    disabled={saving || optionLoading || !hasProduk}
                                />
                            </div>
                        )}

                        {isBundle && (
                            <>
                                <Input
                                    label="Nama Bundle"
                                    name="nama_bundle"
                                    value={form.nama_bundle}
                                    onChange={onChange}
                                    placeholder="Contoh: Paket Skincare Hemat"
                                    disabled={saving}
                                    required
                                />

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-950">
                                                Isi Bundle
                                            </h4>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                Tambahkan produk yang masuk ke dalam paket bundle.
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={onAddBundleItem}
                                            disabled={saving || optionLoading || !hasProduk}
                                            className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Tambah Item
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {form.items.map((item, index) => {
                                            const selectedBundleProduk =
                                                produkSelectOptions.find(
                                                    (produk) =>
                                                        produk.value === item.produk_id
                                                ) || null;

                                            return (
                                                <div
                                                    key={index}
                                                    className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end"
                                                >
                                                    <div>
                                                        <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                                            Produk
                                                        </label>

                                                        <Select2
                                                            value={selectedBundleProduk}
                                                            options={produkSelectOptions}
                                                            onChange={(selected) =>
                                                                onBundleItemSelectChange(
                                                                    index,
                                                                    selected
                                                                )
                                                            }
                                                            placeholder={
                                                                optionLoading
                                                                    ? "Memuat produk..."
                                                                    : hasProduk
                                                                    ? "Pilih Produk"
                                                                    : "Produk belum tersedia"
                                                            }
                                                            disabled={
                                                                saving ||
                                                                optionLoading ||
                                                                !hasProduk
                                                            }
                                                        />
                                                    </div>

                                                    <Input
                                                        label="Qty"
                                                        type="number"
                                                        min="1"
                                                        value={item.qty}
                                                        onChange={(e) =>
                                                            onBundleItemChange(
                                                                index,
                                                                "qty",
                                                                e.target.value
                                                            )
                                                        }
                                                        disabled={saving}
                                                        required
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onRemoveBundleItem(index)
                                                        }
                                                        disabled={
                                                            saving ||
                                                            form.items.length <= 1
                                                        }
                                                        className="h-12 rounded-2xl bg-red-50 px-4 text-xs font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        <Input
                            label={isBundle ? "Harga Bundle" : "Harga Produk"}
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

function Select2({
    value,
    options,
    onChange,
    placeholder = "Pilih data",
    disabled = false,
}) {
    return (
        <ReactSelect
            value={value}
            options={options}
            onChange={onChange}
            isDisabled={disabled}
            isClearable
            isSearchable
            placeholder={placeholder}
            noOptionsMessage={() => "Data tidak ditemukan"}
            classNamePrefix="react-select"
            styles={{
                control: (base, state) => ({
                    ...base,
                    minHeight: 48,
                    borderRadius: 16,
                    borderColor: state.isFocused ? "#020617" : "#e2e8f0",
                    backgroundColor: disabled ? "#f1f5f9" : "#f8fafc",
                    boxShadow: "none",
                    paddingLeft: 4,
                    paddingRight: 4,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#334155",
                    ":hover": {
                        borderColor: state.isFocused ? "#020617" : "#cbd5e1",
                    },
                }),
                valueContainer: (base) => ({
                    ...base,
                    padding: "0 10px",
                }),
                placeholder: (base) => ({
                    ...base,
                    color: "#94a3b8",
                    fontWeight: 700,
                }),
                singleValue: (base) => ({
                    ...base,
                    color: "#0f172a",
                    fontWeight: 800,
                }),
                menu: (base) => ({
                    ...base,
                    zIndex: 9999,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    boxShadow:
                        "0 20px 25px -5px rgb(15 23 42 / 0.12), 0 8px 10px -6px rgb(15 23 42 / 0.12)",
                }),
                menuPortal: (base) => ({
                    ...base,
                    zIndex: 9999,
                }),
                option: (base, state) => ({
                    ...base,
                    fontSize: 14,
                    fontWeight: state.isSelected ? 900 : 700,
                    backgroundColor: state.isSelected
                        ? "#020617"
                        : state.isFocused
                        ? "#f1f5f9"
                        : "#ffffff",
                    color: state.isSelected ? "#ffffff" : "#334155",
                    cursor: "pointer",
                }),
                indicatorSeparator: () => ({
                    display: "none",
                }),
            }}
            menuPortalTarget={
                typeof document !== "undefined" ? document.body : null
            }
        />
    );
}

function TypeBadge({ type }) {
    const isBundle = type === "bundle";

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                isBundle
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
            }`}
        >
            {isBundle ? "Bundle" : "Single"}
        </span>
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

function getRowType(row) {
    return row.tipe_harga || (row.nama_bundle ? "bundle" : "single");
}

function getRowName(row) {
    const type = getRowType(row);

    if (type === "bundle") {
        return row.nama_bundle || row.display_name || "Bundle Tanpa Nama";
    }

    return row.produk?.nama_produk || row.display_name || "-";
}

function getBundleDetails(row) {
    if (Array.isArray(row.bundle_details)) {
        return row.bundle_details;
    }

    if (Array.isArray(row.bundleDetails)) {
        return row.bundleDetails;
    }

    if (Array.isArray(row.bundle_products)) {
        return row.bundle_products.map((produk) => ({
            id: produk.id,
            produk,
            produk_id: produk.id,
            qty: produk.pivot?.qty || 1,
        }));
    }

    if (Array.isArray(row.bundleProducts)) {
        return row.bundleProducts.map((produk) => ({
            id: produk.id,
            produk,
            produk_id: produk.id,
            qty: produk.pivot?.qty || 1,
        }));
    }

    return [];
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