import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactSelect from "react-select";

const initialNewInvoice = {
    event_id: "",
    customer: "",
    transaction_type: "Pembelian",
};

const INVOICE_TABS = [
    {
        label: "Draft",
        value: "Draft",
    },
    {
        label: "Payment",
        value: "Paid",
    },
    {
        label: "Void Transaksi",
        value: "Void Transaksi",
    },
    {
        label: "Void Carts",
        value: "Void Carts",
    },
];

const TRANSACTION_TYPES = [
    {
        label: "PO",
        value: "PO",
        title: "PO",
        description: "Pilih produk tanpa mengurangi stok.",
    },
    {
        label: "Pembelian",
        value: "Pembelian",
        title: "Pembelian",
        description: "Transaksi penjualan normal dan mengurangi stok.",
    },
];

export default function PosIndexPage() {
    const scanInputRef = useRef(null);

    const [events, setEvents] = useState([]);
    const [payments, setPayments] = useState([]);
    const [products, setProducts] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [cart, setCart] = useState(null);

    const [newInvoice, setNewInvoice] = useState(initialNewInvoice);
    const [scanCode, setScanCode] = useState("");
    const [paidAmount, setPaidAmount] = useState("");
    const [paymentId, setPaymentId] = useState("");
    const [paymentType, setPaymentType] = useState("Lunas");
    const [poProductId, setPoProductId] = useState("");
    const [poQty, setPoQty] = useState(1);
    const [bundleProductId, setBundleProductId] = useState("");
    const [bundleQty, setBundleQty] = useState(1);
    const [invoiceSearch, setInvoiceSearch] = useState("");
    const [invoiceTab, setInvoiceTab] = useState("Draft");

    const [loading, setLoading] = useState(false);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isDraftCart = cart?.status === "Draft";
    const isPaidCart = cart?.status === "Paid";
    const isVoidCarts = cart?.status === "Void Carts";
    const isVoidTransaksi = cart?.status === "Void Transaksi";
    const isVoidCart = isVoidCarts || isVoidTransaksi || cart?.status === "Void";
    const isPoCart = cart?.transaction_type === "PO";

    const eventOptions = useMemo(() => {
        return events.map((item) => ({
            value: item.id,
            label: `${item.nama_event} - ${formatDate(item.valid_from)} s/d ${formatDate(
                item.valid_until
            )}`,
        }));
    }, [events]);

    const paymentOptions = useMemo(() => {
        return payments.map((item) => ({
            value: item.id,
            label: item.payment || item.nama_payment || item.name || "Metode Pembayaran",
        }));
    }, [payments]);

    const productOptions = useMemo(() => {
        const eventId = cart?.event_id || cart?.event?.id || newInvoice.event_id || "";

        return products
            .filter((item) => {
                if (!eventId) return true;

                const itemEventId = item.event_id || item.event?.id || item.data_event_id;

                return !itemEventId || itemEventId === eventId;
            })
            .map((item) => {
                const produk = item.produk || item.product || {};
                const tipeHarga = item.tipe_harga || (item.nama_bundle ? "bundle" : "single");
                const isBundle = tipeHarga === "bundle";

                const name = isBundle
                    ? item.nama_bundle || item.nama_produk || item.product_name || "Bundle Tanpa Nama"
                    : item.nama_produk ||
                      item.product_name ||
                      produk.nama_produk ||
                      produk.name ||
                      "-";

                const codeGs1 = isBundle
                    ? ""
                    : item.code_gs1 ||
                      item.gs1 ||
                      produk.code_gs1 ||
                      produk.gs1 ||
                      "";

                const productNumber = isBundle
                    ? "BUNDLE"
                    : item.product_number ||
                      produk.product_number ||
                      produk.kode_produk ||
                      "";

                const price = Number(
                    item.harga_produk ||
                        item.price ||
                        item.harga ||
                        item.selling_price ||
                        0
                );

                const bundleDetails =
                    item.bundle_details ||
                    item.bundleDetails ||
                    item.bundle_products ||
                    item.bundleProducts ||
                    [];

                const typeLabel = isBundle ? "Bundle" : "Satuan";

                return {
                    value: item.id || item.produk_price_id || item.product_price_id,
                    label: `${typeLabel} - ${name}${codeGs1 ? ` - ${codeGs1}` : ""}${price ? ` - ${formatRupiah(price)}` : ""}`,
                    nama_produk: name,
                    code_gs1: codeGs1,
                    product_number: productNumber,
                    harga_produk: price,
                    tipe_harga: tipeHarga,
                    nama_bundle: item.nama_bundle || "",
                    bundle_details: bundleDetails,
                    raw: item,
                };
            });
    }, [products, cart?.event_id, cart?.event?.id, newInvoice.event_id]);

    const singleProductOptions = useMemo(() => {
        return productOptions.filter((item) => item.tipe_harga !== "bundle");
    }, [productOptions]);

    const bundleProductOptions = useMemo(() => {
        return productOptions.filter((item) => item.tipe_harga === "bundle");
    }, [productOptions]);

    const selectedEvent = useMemo(() => {
        return eventOptions.find((item) => item.value === newInvoice.event_id) || null;
    }, [eventOptions, newInvoice.event_id]);

    const selectedPayment = useMemo(() => {
        return paymentOptions.find((item) => item.value === paymentId) || null;
    }, [paymentOptions, paymentId]);

    const selectedPoProduct = useMemo(() => {
        return productOptions.find((item) => item.value === poProductId) || null;
    }, [productOptions, poProductId]);

    const selectedBundleProduct = useMemo(() => {
        return bundleProductOptions.find((item) => item.value === bundleProductId) || null;
    }, [bundleProductOptions, bundleProductId]);

    const totalAmount = Number(cart?.total_amount || 0);
    const totalQty = Number(cart?.total_qty || 0);
    const paidNumber = Number(paidAmount || 0);

    const paymentPaidAmount = Number(cart?.payment?.paid_amount || 0);
    const paymentRemainingAmount = Number(
        cart?.payment?.remaining_amount ?? Math.max(totalAmount - paymentPaidAmount, 0)
    );

    const isPoUnpaid =
        isPoCart &&
        isPaidCart &&
        cart?.payment?.payment_status === "Belum Lunas";

    const canReceivePayment = isDraftCart || isPoUnpaid;
    const paymentTargetAmount = isPoUnpaid ? paymentRemainingAmount : totalAmount;

    const remainingAfterPayment = isPoUnpaid
        ? Math.max(paymentRemainingAmount - paidNumber, 0)
        : Math.max(totalAmount - paidNumber, 0);

    const changeAmount = Math.max(paidNumber - paymentTargetAmount, 0);

    useEffect(() => {
        fetchOptions();
        fetchInvoices();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchInvoices();
        }, 400);

        return () => clearTimeout(timeout);
    }, [invoiceSearch, invoiceTab]);

    useEffect(() => {
        if (cart?.id && cart?.status === "Draft" && cart?.transaction_type !== "PO") {
            setTimeout(() => {
                scanInputRef.current?.focus();
            }, 150);
        }
    }, [cart?.id, cart?.status, cart?.transaction_type]);

    const fetchOptions = async () => {
        try {
            const response = await axios.get("/admin/pos/options");

            const data = response.data?.data || {};

            setEvents(data.events || []);
            setPayments(data.payments || []);

            setProducts(
                data.products ||
                    data.produk_prices ||
                    data.product_prices ||
                    data.produkPrice ||
                    []
            );
        } catch (err) {
            console.error(err);
            setError("Gagal memuat data pilihan POS.");
        }
    };

    const fetchInvoices = async () => {
        setInvoiceLoading(true);

        try {
            const response = await axios.get("/admin/pos/drafts", {
                params: {
                    search: invoiceSearch,
                    status: invoiceTab,
                },
            });

            setInvoices(response.data?.data || []);
        } catch (err) {
            console.error(err);
            setError("Gagal memuat data invoice.");
        } finally {
            setInvoiceLoading(false);
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

    const startInvoice = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await axios.post("/admin/pos/cart/start", {
                event_id: newInvoice.event_id,
                customer: newInvoice.customer || null,
                transaction_type: newInvoice.transaction_type,
            });

            setCart(response.data.data);
            setNewInvoice(initialNewInvoice);
            setPaidAmount("");
            setPaymentId("");
            setPaymentType("Lunas");
            setPoProductId("");
            setPoQty(1);
            setBundleProductId("");
            setBundleQty(1);
            setScanCode("");
            setSuccess("Invoice baru berhasil dibuat.");
            setInvoiceTab("Draft");
            fetchInvoices();
        } catch (err) {
            console.error(err);
            setError(getValidationMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const loadInvoice = async (invoice) => {
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const response = await axios.get(`/admin/pos/cart/${invoice.id}`);

            setCart(response.data.data);
            setPaidAmount("");
            setPaymentId("");
            setPaymentType("Lunas");
            setPoProductId("");
            setPoQty(1);
            setBundleProductId("");
            setBundleQty(1);
            setScanCode("");

            if (invoice.status === "Paid") {
                setSuccess(`Invoice ${invoice.no_invoice} berhasil dibuka. Anda bisa melakukan Void Transaksi.`);
            } else if (invoice.status === "Void Transaksi") {
                setSuccess(`Invoice ${invoice.no_invoice} adalah histori Void Transaksi.`);
            } else if (invoice.status === "Void Carts") {
                setSuccess(`Invoice ${invoice.no_invoice} adalah histori Void Carts.`);
            } else {
                setSuccess(`Invoice ${invoice.no_invoice} berhasil dilanjutkan.`);
            }
        } catch (err) {
            console.error(err);
            setError("Gagal membuka invoice.");
        } finally {
            setLoading(false);
        }
    };

    const holdCurrentInvoice = () => {
        if (!cart) return;

        setSuccess(`Invoice ${cart.no_invoice} disimpan sebagai Draft.`);
        setCart(null);
        setPaidAmount("");
        setPaymentId("");
        setPaymentType("Lunas");
        setPoProductId("");
        setPoQty(1);
        setScanCode("");
        setInvoiceTab("Draft");
        fetchInvoices();
    };

    const handleScanSubmit = async (e) => {
        e.preventDefault();

        if (!cart?.id) {
            setError("Buat atau pilih invoice draft terlebih dahulu.");
            return;
        }

        if (!isDraftCart) {
            setError("Invoice sudah tidak bisa ditambah produk karena bukan Draft.");
            return;
        }

        const code = scanCode.trim();

        if (!code) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await axios.post(`/admin/pos/cart/${cart.id}/scan`, {
                code_gs1: code,
                qty: 1,
            });

            setCart(response.data.data);
            setScanCode("");
            setSuccess("Produk berhasil ditambahkan.");
            fetchInvoices();

            setTimeout(() => {
                scanInputRef.current?.focus();
            }, 100);
        } catch (err) {
            console.error(err);
            setError(getValidationMessage(err));
            setScanCode("");

            setTimeout(() => {
                scanInputRef.current?.focus();
            }, 100);
        } finally {
            setSaving(false);
        }
    };


    const addPoProduct = async () => {
        if (!cart?.id) {
            setError("Buat atau pilih invoice PO draft terlebih dahulu.");
            return;
        }

        if (!isDraftCart) {
            setError("Invoice sudah tidak bisa ditambah produk karena bukan Draft.");
            return;
        }

        if (!isPoCart) {
            setError("Pilih produk manual hanya untuk transaksi PO.");
            return;
        }

        if (!selectedPoProduct) {
            setError("Pilih produk PO terlebih dahulu.");
            return;
        }

        const qty = Number(poQty || 0);

        if (!Number.isFinite(qty) || qty < 1) {
            setError("Qty PO minimal 1.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await axios.post(`/admin/pos/cart/${cart.id}/scan`, {
                produk_price_id: selectedPoProduct.value,
                code_gs1: selectedPoProduct.code_gs1,
                qty,
            });

            setCart(response.data.data);
            setPoProductId("");
            setPoQty(1);
            setSuccess("Produk PO berhasil ditambahkan.");
            fetchInvoices();
        } catch (err) {
            console.error(err);
            setError(getValidationMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const addBundleProduct = async () => {
        if (!cart?.id) {
            setError("Buat atau pilih invoice draft terlebih dahulu.");
            return;
        }

        if (!isDraftCart) {
            setError("Invoice sudah tidak bisa ditambah bundle karena bukan Draft.");
            return;
        }

        if (!selectedBundleProduct) {
            setError("Pilih bundle terlebih dahulu.");
            return;
        }

        const qty = Number(bundleQty || 0);

        if (!Number.isFinite(qty) || qty < 1) {
            setError("Qty bundle minimal 1.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await axios.post(`/admin/pos/cart/${cart.id}/scan`, {
                produk_price_id: selectedBundleProduct.value,
                qty,
            });

            setCart(response.data.data);
            setBundleProductId("");
            setBundleQty(1);
            setSuccess("Bundle berhasil ditambahkan.");
            fetchInvoices();
        } catch (err) {
            console.error(err);
            setError(getValidationMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const updateQty = async (detail, qty) => {
        if (!cart?.id || !isDraftCart) return;

        const nextQty = Number(qty);

        if (nextQty < 1) return;

        setSaving(true);
        setError("");

        try {
            const response = await axios.patch(
                `/admin/pos/cart/${cart.id}/item/${detail.id}`,
                {
                    qty: nextQty,
                }
            );

            setCart(response.data.data);
            fetchInvoices();
        } catch (err) {
            console.error(err);
            setError(getValidationMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const deleteItem = async (detail) => {
        if (!cart?.id || !isDraftCart) return;

        const confirmed = window.confirm("Hapus produk dari invoice?");

        if (!confirmed) return;

        setSaving(true);
        setError("");

        try {
            const response = await axios.delete(
                `/admin/pos/cart/${cart.id}/item/${detail.id}`
            );

            setCart(response.data.data);
            fetchInvoices();
        } catch (err) {
            console.error(err);
            setError("Gagal menghapus produk.");
        } finally {
            setSaving(false);
        }
    };

    const voidInvoice = async () => {
        if (!cart?.id) return;

        const confirmed = window.confirm(
            `${isPaidCart ? "Void Transaksi" : "Void Carts"} ${cart.no_invoice}? Stok akan otomatis kembali.`
        );

        if (!confirmed) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await axios.post(`/admin/pos/cart/${cart.id}/void`);
            const nextCart = response.data?.data || null;

            setCart(nextCart);
            setPaidAmount("");
            setPaymentId("");
            setPaymentType("Lunas");
            setPoProductId("");
            setPoQty(1);
            setBundleProductId("");
            setBundleQty(1);
            setScanCode("");
            setSuccess(response.data?.message || "Invoice berhasil di-void.");

            if (nextCart?.status === "Void Transaksi") {
                setInvoiceTab("Void Transaksi");
            } else if (nextCart?.status === "Void Carts") {
                setInvoiceTab("Void Carts");
            }

            fetchInvoices();
        } catch (err) {
            console.error(err);
            setError(getValidationMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const payInvoice = async () => {
        if (!cart?.id || !canReceivePayment) return;

        const notaWindow = openNotaLoadingWindow();

        if (!notaWindow) {
            setError("Popup preview nota diblokir browser. Izinkan popup, lalu klik Bayar Sekarang lagi.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await axios.post(`/admin/pos/cart/${cart.id}/pay`, {
                payment_id: paymentId,
                paid_amount: paidAmount,
                payment_type: isPoCart ? paymentType : "Lunas",
            });

            const paidCart = response.data?.data || null;
            setCart(paidCart);

            let nota = response.data?.nota || paidCart?.nota || null;

            if (!nota && paidCart?.id) {
                const notaResponse = await axios.get(`/admin/pos/cart/${paidCart.id}/nota`);
                nota = notaResponse.data?.data || null;
            }

            if (nota) {
                const notaWithType = attachNotaTransactionType(
                    nota,
                    paidCart?.transaction_type || cart?.transaction_type
                );

                openNotaPdfPreview(notaWithType, notaWindow, true);
            } else {
                showNotaWindowError(notaWindow, "Pembayaran berhasil, tetapi data nota tidak ditemukan.");
            }

            setSuccess(response.data?.message || `Pembayaran invoice ${cart.no_invoice} berhasil.`);

            setPaidAmount("");
            setPaymentId("");
            setPaymentType("Lunas");
            setScanCode("");
            setInvoiceTab("Paid");
            fetchInvoices();
        } catch (err) {
            console.error(err);
            showNotaWindowError(notaWindow, getValidationMessage(err));
            setError(getValidationMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const previewNota = async () => {
        if (!cart?.id) return;

        const notaWindow = openNotaLoadingWindow();

        if (!notaWindow) {
            setError("Popup preview nota diblokir browser. Izinkan popup untuk membuka nota.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const response = await axios.get(`/admin/pos/cart/${cart.id}/nota`);
            const notaWithType = attachNotaTransactionType(
                response.data?.data,
                cart?.transaction_type
            );

            openNotaPdfPreview(notaWithType, notaWindow, false);
        } catch (err) {
            console.error(err);
            showNotaWindowError(notaWindow, getValidationMessage(err));
            setError(getValidationMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const newTransaction = () => {
        setCart(null);
        setPaidAmount("");
        setPaymentId("");
        setPaymentType("Lunas");
        setPoProductId("");
        setPoQty(1);
        setScanCode("");
        setError("");
        setSuccess("");
        fetchInvoices();
    };

    return (
        <div className="w-full max-w-full pb-8">
            <div className="grid w-full max-w-full gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
                <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                    <CashierTopBar
                        cart={cart}
                        isDraftCart={isDraftCart}
                        isPaidCart={isPaidCart}
                        isVoidCart={isVoidCart}
                        newTransaction={newTransaction}
                    />

                    <div className="bg-slate-50 p-4">
                        {error && <Alert type="error" message={error} />}
                        {success && <Alert type="success" message={success} />}

                        {!cart && (
                            <CreateInvoiceCard
                                selectedEvent={selectedEvent}
                                eventOptions={eventOptions}
                                newInvoice={newInvoice}
                                setNewInvoice={setNewInvoice}
                                saving={saving}
                                startInvoice={startInvoice}
                            />
                        )}

                        {cart && (
                            <div className="space-y-4">
                                <ScannerCard
                                    cart={cart}
                                    saving={saving}
                                    scanCode={scanCode}
                                    setScanCode={setScanCode}
                                    scanInputRef={scanInputRef}
                                    handleScanSubmit={handleScanSubmit}
                                    productOptions={productOptions}
                                    singleProductOptions={singleProductOptions}
                                    bundleProductOptions={bundleProductOptions}
                                    selectedPoProduct={selectedPoProduct}
                                    setPoProductId={setPoProductId}
                                    poQty={poQty}
                                    setPoQty={setPoQty}
                                    selectedBundleProduct={selectedBundleProduct}
                                    setBundleProductId={setBundleProductId}
                                    bundleQty={bundleQty}
                                    setBundleQty={setBundleQty}
                                    addPoProduct={addPoProduct}
                                    addBundleProduct={addBundleProduct}
                                    holdCurrentInvoice={holdCurrentInvoice}
                                    voidInvoice={voidInvoice}
                                    isDraftCart={isDraftCart}
                                    isPaidCart={isPaidCart}
                                    isVoidCart={isVoidCart}
                                    isPoCart={isPoCart}
                                />

                                <CartItems
                                    cart={cart}
                                    saving={saving}
                                    updateQty={updateQty}
                                    deleteItem={deleteItem}
                                    isDraftCart={isDraftCart}
                                    isPoCart={isPoCart}
                                />
                            </div>
                        )}
                    </div>
                </section>

                <aside className="min-w-0 space-y-5">
                    <PaymentPanel
                        cart={cart}
                        saving={saving}
                        totalQty={totalQty}
                        totalAmount={totalAmount}
                        paidAmount={paidAmount}
                        paymentOptions={paymentOptions}
                        selectedPayment={selectedPayment}
                        changeAmount={changeAmount}
                        paymentType={paymentType}
                        setPaymentType={setPaymentType}
                        paymentPaidAmount={paymentPaidAmount}
                        paymentRemainingAmount={paymentRemainingAmount}
                        paymentTargetAmount={paymentTargetAmount}
                        remainingAfterPayment={remainingAfterPayment}
                        setPaidAmount={setPaidAmount}
                        setPaymentId={setPaymentId}
                        payInvoice={payInvoice}
                        voidInvoice={voidInvoice}
                        previewNota={previewNota}
                        isDraftCart={isDraftCart}
                        isPaidCart={isPaidCart}
                        isPoCart={isPoCart}
                        isPoUnpaid={isPoUnpaid}
                        canReceivePayment={canReceivePayment}
                    />

                    <InvoicePanel
                        invoices={invoices}
                        cart={cart}
                        loading={loading}
                        invoiceLoading={invoiceLoading}
                        invoiceSearch={invoiceSearch}
                        setInvoiceSearch={setInvoiceSearch}
                        invoiceTab={invoiceTab}
                        setInvoiceTab={setInvoiceTab}
                        loadInvoice={loadInvoice}
                    />
                </aside>
            </div>
        </div>
    );
}

function CashierTopBar({ cart, isDraftCart, isPaidCart, isVoidCart, newTransaction }) {
    return (
        <div className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <CartIcon className="h-7 w-7" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-950">
                                Kasir POS
                            </h1>

                            <StatusBadge
                                status={
                                    isPaidCart
                                        ? "Paid"
                                        : isVoidCart
                                        ? cart?.status || "Void"
                                        : isDraftCart
                                        ? "Draft"
                                        : "Ready"
                                }
                            />
                        </div>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-500">
                        Scan barang, pilih PO/Pembelian, kelola cart, bayar transaksi, dan preview nota PDF.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {cart && (
                        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Invoice
                            </p>
                            <p className="max-w-[230px] truncate text-sm font-black">
                                {cart.no_invoice}
                            </p>
                        </div>
                    )}

                    {cart && (
                        <button
                            type="button"
                            onClick={newTransaction}
                            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"
                        >
                            Transaksi Baru
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function CreateInvoiceCard({
    selectedEvent,
    eventOptions,
    newInvoice,
    setNewInvoice,
    saving,
    startInvoice,
}) {
    return (
        <div className="mx-auto my-8 max-w-3xl rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white">
                    <CartIcon className="h-8 w-8" />
                </div>

                <h2 className="mt-5 text-2xl font-black text-slate-950">
                    Mulai Transaksi Baru
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Pilih event, isi nama customer, lalu klik buat invoice.
                </p>
            </div>

            <div className="mt-6 space-y-5">
                <Select2
                    label="Event"
                    value={selectedEvent}
                    options={eventOptions}
                    onChange={(selected) =>
                        setNewInvoice((prev) => ({
                            ...prev,
                            event_id: selected?.value || "",
                        }))
                    }
                    placeholder="Pilih event"
                    disabled={saving}
                />

                <Input
                    label="Customer"
                    value={newInvoice.customer}
                    onChange={(e) =>
                        setNewInvoice((prev) => ({
                            ...prev,
                            customer: e.target.value,
                        }))
                    }
                    placeholder="Walk In Customer"
                    disabled={saving}
                />

                <TransactionTypePicker
                    value={newInvoice.transaction_type}
                    onChange={(value) =>
                        setNewInvoice((prev) => ({
                            ...prev,
                            transaction_type: value,
                        }))
                    }
                    disabled={saving}
                />

                <button
                    type="button"
                    onClick={startInvoice}
                    disabled={saving || !newInvoice.event_id}
                    className="h-14 w-full rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? "Membuat Invoice..." : "Buat Invoice"}
                </button>
            </div>
        </div>
    );
}

function ScannerCard({
    cart,
    saving,
    scanCode,
    setScanCode,
    scanInputRef,
    handleScanSubmit,
    productOptions,
    singleProductOptions,
    bundleProductOptions,
    selectedPoProduct,
    setPoProductId,
    poQty,
    setPoQty,
    selectedBundleProduct,
    setBundleProductId,
    bundleQty,
    setBundleQty,
    addPoProduct,
    addBundleProduct,
    holdCurrentInvoice,
    voidInvoice,
    isDraftCart,
    isPaidCart,
    isVoidCart,
    isPoCart,
}) {
    return (
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
            {isPoCart ? (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_110px_auto_auto] lg:items-end">
                    <Select2
                        label="Pilih Produk / Bundle PO"
                        value={selectedPoProduct}
                        options={productOptions}
                        onChange={(selected) => setPoProductId(selected?.value || "")}
                        placeholder="Cari produk / bundle"
                        disabled={saving || !isDraftCart}
                    />

                    <Input
                        label="Qty"
                        type="number"
                        min="1"
                        value={poQty}
                        onChange={(e) => setPoQty(e.target.value)}
                        disabled={saving || !isDraftCart}
                    />

                    <button
                        type="button"
                        onClick={addPoProduct}
                        disabled={saving || !isDraftCart || !selectedPoProduct || Number(poQty || 0) < 1}
                        className="h-14 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Tambah PO
                    </button>

                    {isDraftCart && (
                        <button
                            type="button"
                            onClick={holdCurrentInvoice}
                            disabled={saving}
                            className="h-14 rounded-2xl bg-amber-500 px-5 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60"
                        >
                            Tunda
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                        <form onSubmit={handleScanSubmit} className="min-w-0">
                            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                                Scan Barcode / GS1 Produk Satuan
                            </label>

                            <div className="relative">
                                <span className="absolute left-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                                    ||
                                </span>

                                <input
                                    ref={scanInputRef}
                                    type="text"
                                    value={scanCode}
                                    onChange={(e) => setScanCode(e.target.value)}
                                    placeholder={
                                        isDraftCart
                                            ? "Scan barcode produk satuan di sini lalu Enter"
                                            : "Invoice terkunci"
                                    }
                                    disabled={saving || !isDraftCart}
                                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-14 pr-4 text-lg font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </div>
                        </form>

                        {isDraftCart && (
                            <button
                                type="button"
                                onClick={holdCurrentInvoice}
                                disabled={saving}
                                className="h-14 rounded-2xl bg-amber-500 px-5 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-60"
                            >
                                Tunda
                            </button>
                        )}

                        {(isDraftCart || isPaidCart) && !isVoidCart && (
                            <button
                                type="button"
                                onClick={voidInvoice}
                                disabled={saving}
                                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                <CartIcon className="h-5 w-5" />
                                {isPaidCart ? "Void Transaksi" : "Void Carts"}
                            </button>
                        )}
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <div className="mb-3">
                            <p className="text-sm font-black text-blue-800">
                                Tambah Bundle Pembelian
                            </p>
                            <p className="mt-1 text-xs font-bold text-blue-600">
                                Untuk bundle, pilih nama bundle. Produk di dalam bundle akan tampil di cart dan stok dihitung dari isi bundle.
                            </p>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_110px_auto] lg:items-end">
                            <Select2
                                label="Nama Bundle"
                                value={selectedBundleProduct}
                                options={bundleProductOptions}
                                onChange={(selected) => setBundleProductId(selected?.value || "")}
                                placeholder="Cari nama bundle"
                                disabled={saving || !isDraftCart}
                            />

                            <Input
                                label="Qty"
                                type="number"
                                min="1"
                                value={bundleQty}
                                onChange={(e) => setBundleQty(e.target.value)}
                                disabled={saving || !isDraftCart}
                            />

                            <button
                                type="button"
                                onClick={addBundleProduct}
                                disabled={saving || !isDraftCart || !selectedBundleProduct || Number(bundleQty || 0) < 1}
                                className="h-14 rounded-2xl bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Tambah Bundle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isPoCart && (isDraftCart || isPaidCart) && !isVoidCart && (
                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        onClick={voidInvoice}
                        disabled={saving}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        <CartIcon className="h-5 w-5" />
                        {isPaidCart ? "Void Transaksi" : "Void Carts"}
                    </button>
                </div>
            )}

            {isPoCart && (
                <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                    Mode PO aktif: produk dan bundle dipilih menggunakan Select2 dan tidak mengurangi stok.
                </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-4">
                <InfoBox label="Event" value={cart.event?.nama_event || "-"} />
                <InfoBox label="Customer" value={cart.customer || "-"} />
                <InfoBox label="Jenis" value={cart.transaction_type || "Pembelian"} />
                <InfoBox label="Status" value={cart.status || "-"} />
            </div>
        </div>
    );
}

function CartItems({ cart, saving, updateQty, deleteItem, isDraftCart, isPoCart }) {
    return (
        <div className="rounded-[1.25rem] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <CartIcon className="h-6 w-6" />
                    </div>

                    <div>
                        <h2 className="text-lg font-black text-slate-950">
                            Cart Produk
                        </h2>
                        <p className="text-xs font-bold text-slate-400">
                            {cart.details?.length || 0} baris item
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-h-[520px] min-h-[260px] overflow-y-auto p-3">
                {cart.details?.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                            <CartIcon className="h-8 w-8" />
                        </div>

                        <h3 className="mt-4 text-base font-black text-slate-700">
                            Cart masih kosong
                        </h3>

                        <p className="mt-1 text-sm font-semibold text-slate-400">
                            {isPoCart
                                ? "Pilih produk atau bundle PO menggunakan Select2 untuk menambahkan item."
                                : "Scan produk satuan atau pilih bundle untuk menambahkan item."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.details?.map((detail) => {
                            const produkPrice = detail.produk_price || detail.produkPrice || {};
                            const produk = produkPrice.produk || {};
                            const isBundle = (produkPrice.tipe_harga || "single") === "bundle";
                            const bundleDetails =
                                produkPrice.bundle_details ||
                                produkPrice.bundleDetails ||
                                [];

                            const title = isBundle
                                ? produkPrice.nama_bundle || produkPrice.display_name || "Bundle Tanpa Nama"
                                : produk.nama_produk || "-";

                            return (
                                <div
                                    key={detail.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate text-base font-black text-slate-950">
                                                    {title}
                                                </p>

                                                <span
                                                    className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                                                        isBundle
                                                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                                                            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                                    }`}
                                                >
                                                    {isBundle ? "BUNDLE" : "SATUAN"}
                                                </span>
                                            </div>

                                            {isBundle ? (
                                                <div className="mt-2 rounded-2xl bg-slate-50 p-3">
                                                    <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                        Isi Bundle
                                                    </p>

                                                    {bundleDetails.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {bundleDetails.map((bundleDetail, index) => (
                                                                <div
                                                                    key={bundleDetail.id || index}
                                                                    className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600"
                                                                >
                                                                    <span>
                                                                        {bundleDetail.produk?.nama_produk || "-"}
                                                                    </span>
                                                                    <span className="font-black text-slate-950">
                                                                        x{bundleDetail.qty || 1}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs font-bold text-slate-400">
                                                            Isi bundle belum tersedia.
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="mt-1 text-xs font-bold text-slate-400">
                                                    PN: {produk.product_number || "-"} · GS1:{" "}
                                                    {produk.code_gs1 || "-"}
                                                </p>
                                            )}

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {isPoCart ? (
                                                    <StockBadge
                                                        label="PO - Stok Tidak Berkurang"
                                                        value={detail.qty || 0}
                                                        type="blue"
                                                    />
                                                ) : (
                                                    <StockBadge
                                                        label={isBundle ? "Bundle Tersedia" : "Stok Terakhir"}
                                                        value={
                                                            detail.stock_terakhir ??
                                                            produkPrice.stock_terakhir ??
                                                            0
                                                        }
                                                        type={isBundle ? "blue" : "emerald"}
                                                    />
                                                )}
                                            </div>

                                            <p className="mt-3 text-sm font-black text-emerald-600">
                                                {formatRupiah(detail.price_amount)}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQty(detail, detail.qty - 1)
                                                    }
                                                    disabled={
                                                        saving ||
                                                        !isDraftCart ||
                                                        detail.qty <= 1
                                                    }
                                                    className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                                >
                                                    -
                                                </button>

                                                <input
                                                    type="number"
                                                    value={detail.qty}
                                                    onChange={(e) =>
                                                        updateQty(detail, e.target.value)
                                                    }
                                                    disabled={!isDraftCart}
                                                    className="h-10 w-16 rounded-xl border border-slate-200 text-center text-sm font-black text-slate-950 disabled:bg-slate-100"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateQty(detail, detail.qty + 1)
                                                    }
                                                    disabled={saving || !isDraftCart}
                                                    className="h-10 w-10 rounded-xl bg-slate-950 text-lg font-black text-white hover:bg-slate-800 disabled:opacity-40"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <div className="min-w-[130px] text-right">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                    Subtotal
                                                </p>
                                                <p className="text-base font-black text-slate-950">
                                                    {formatRupiah(detail.subtotal_amount)}
                                                </p>
                                            </div>

                                            {isDraftCart ? (
                                                <button
                                                    type="button"
                                                    onClick={() => deleteItem(detail)}
                                                    disabled={saving}
                                                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100 hover:bg-red-100 disabled:opacity-60"
                                                >
                                                    Hapus
                                                </button>
                                            ) : (
                                                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500">
                                                    Terkunci
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function PaymentPanel({
    cart,
    saving,
    totalQty,
    totalAmount,
    paidAmount,
    paymentOptions,
    selectedPayment,
    changeAmount,
    paymentType,
    setPaymentType,
    paymentPaidAmount,
    paymentRemainingAmount,
    paymentTargetAmount,
    remainingAfterPayment,
    setPaidAmount,
    setPaymentId,
    payInvoice,
    voidInvoice,
    previewNota,
    isDraftCart,
    isPaidCart,
    isPoCart,
    isPoUnpaid,
    canReceivePayment,
}) {
    const paidNumber = Number(paidAmount || 0);
    const isDpPayment = isPoCart && paymentType === "DP";

    const paymentButtonDisabled =
        !cart ||
        saving ||
        !canReceivePayment ||
        totalAmount <= 0 ||
        !selectedPayment ||
        paidNumber <= 0 ||
        (!isDpPayment && paidNumber < paymentTargetAmount);

    const paymentStatus = cart?.payment?.payment_status || "-";

    return (
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Payment
                </p>
                <h2 className="mt-1 text-2xl font-black">Pembayaran</h2>
            </div>

            <div className="space-y-4 p-5">
                <div className="grid gap-3">
                    <SummaryRow label="Total Qty" value={totalQty} />

                    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Total Transaksi
                        </p>
                        <p className="mt-1 break-words text-3xl font-black text-slate-950">
                            {formatRupiah(totalAmount)}
                        </p>
                    </div>

                    {isPoCart && (
                        <div className="grid gap-3 md:grid-cols-2">
                            <PaymentInfoCard
                                label="Sudah Dibayar"
                                value={formatRupiah(paymentPaidAmount)}
                                tone="blue"
                            />
                            <PaymentInfoCard
                                label="Sisa Tagihan"
                                value={formatRupiah(paymentRemainingAmount)}
                                tone={paymentRemainingAmount > 0 ? "amber" : "emerald"}
                            />
                        </div>
                    )}

                    {cart?.payment && (
                        <div
                            className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 ${
                                paymentStatus === "Lunas"
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : "bg-amber-50 text-amber-700 ring-amber-100"
                            }`}
                        >
                            Status Pembayaran: {paymentStatus}
                        </div>
                    )}
                </div>

                {isPoCart && canReceivePayment && (
                    <div>
                        <label className="mb-2 block text-sm font-black text-slate-700">
                            Jenis Pembayaran PO
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                            {["DP", "Lunas"].map((type) => {
                                const active = paymentType === type;

                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setPaymentType(type)}
                                        disabled={saving || !canReceivePayment}
                                        className={`h-12 rounded-2xl text-sm font-black transition disabled:opacity-60 ${
                                            active
                                                ? type === "DP"
                                                    ? "bg-amber-500 text-white shadow-lg shadow-amber-100"
                                                    : "bg-emerald-600 text-white shadow-lg shadow-emerald-100"
                                                : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-white"
                                        }`}
                                    >
                                        {type}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="mt-2 text-xs font-bold text-slate-500">
                            DP boleh lebih kecil dari total PO. Lunas wajib sama dengan atau lebih besar dari sisa tagihan.
                        </p>
                    </div>
                )}

                <Select2
                    label="Metode Pembayaran"
                    value={selectedPayment}
                    options={paymentOptions}
                    onChange={(selected) => setPaymentId(selected?.value || "")}
                    placeholder="Pilih metode pembayaran"
                    disabled={!cart || saving || !canReceivePayment}
                />

                <Input
                    label={isPoUnpaid ? "Jumlah Pelunasan" : isPoCart && paymentType === "DP" ? "Jumlah DP" : "Jumlah Dibayar"}
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                    disabled={!cart || saving || !canReceivePayment}
                />

                {isPoCart && canReceivePayment && (
                    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Sisa Setelah Pembayaran Ini
                        </p>
                        <p className={`mt-1 break-words text-2xl font-black ${
                            remainingAfterPayment > 0 ? "text-amber-600" : "text-emerald-600"
                        }`}>
                            {formatRupiah(remainingAfterPayment)}
                        </p>
                    </div>
                )}

                <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
                        Kembalian
                    </p>
                    <p className="mt-1 break-words text-2xl font-black text-emerald-700">
                        {formatRupiah(changeAmount)}
                    </p>
                </div>

                {canReceivePayment && (
                    <button
                        type="button"
                        onClick={payInvoice}
                        disabled={paymentButtonDisabled}
                        className="h-16 w-full rounded-2xl bg-emerald-600 text-base font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPoUnpaid
                            ? "Bayar Pelunasan"
                            : isPoCart && paymentType === "DP"
                            ? "Simpan DP"
                            : "Bayar Lunas"}
                    </button>
                )}

                {isPaidCart && (
                    <button
                        type="button"
                        onClick={previewNota}
                        disabled={saving}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        Preview Nota PDF
                    </button>
                )}

                {isPaidCart && (
                    <button
                        type="button"
                        onClick={voidInvoice}
                        disabled={saving}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        <CartIcon className="h-5 w-5" />
                        Void Transaksi
                    </button>
                )}
            </div>
        </div>
    );
}

function PaymentInfoCard({ label, value, tone = "slate" }) {
    const tones = {
        blue: "bg-blue-50 text-blue-700 ring-blue-100",
        amber: "bg-amber-50 text-amber-700 ring-amber-100",
        emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        slate: "bg-slate-50 text-slate-700 ring-slate-100",
    };

    return (
        <div className={`rounded-2xl p-4 ring-1 ${tones[tone] || tones.slate}`}>
            <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
                {label}
            </p>
            <p className="mt-1 break-words text-lg font-black">{value}</p>
        </div>
    );
}

function InvoicePanel({
    invoices,
    cart,
    loading,
    invoiceLoading,
    invoiceSearch,
    setInvoiceSearch,
    invoiceTab,
    setInvoiceTab,
    loadInvoice,
}) {
    const title =
        invoiceTab === "Paid"
            ? "Invoice Payment"
            : invoiceTab === "Void Transaksi"
            ? "Void Transaksi"
            : invoiceTab === "Void Carts"
            ? "Void Carts"
            : "Invoice Draft";

    const subtitle =
        invoiceTab === "Paid"
            ? "Transaksi yang sudah dibayar"
            : invoiceTab === "Void Transaksi"
            ? "Transaksi paid yang dibatalkan"
            : invoiceTab === "Void Carts"
            ? "Cart draft yang dibatalkan"
            : "Transaksi tertunda";

    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-slate-950">
                            {title}
                        </h2>
                        <p className="text-xs font-bold text-slate-400">
                            {subtitle}
                        </p>
                    </div>

                    <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                        {invoices.length}
                    </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    {INVOICE_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setInvoiceTab(tab.value)}
                            className={`rounded-2xl px-3 py-2 text-xs font-black transition ${
                                invoiceTab === tab.value
                                    ? getTabActiveClass(tab.value)
                                    : "bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <input
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Cari invoice/customer..."
                    className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-slate-950 focus:bg-white"
                />
            </div>

            <div className="max-h-[430px] space-y-3 overflow-y-auto p-4">
                {invoiceLoading ? (
                    <div className="py-8 text-center text-sm font-black text-slate-400">
                        Memuat invoice...
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 py-8 text-center text-sm font-black text-slate-400">
                        Tidak ada data {title}.
                    </div>
                ) : (
                    invoices.map((invoice) => {
                        const transactionType = normalizeTransactionType(
                            invoice.transaction_type
                        );
                        const isActive = cart?.id === invoice.id;

                        return (
                            <button
                                key={invoice.id}
                                type="button"
                                onClick={() => loadInvoice(invoice)}
                                disabled={loading}
                                className={`w-full rounded-2xl border p-4 text-left transition hover:bg-slate-50 disabled:opacity-60 ${
                                    isActive
                                        ? getActiveInvoiceCardClass(transactionType)
                                        : getInvoiceCardClass(transactionType)
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="truncate font-black text-slate-950">
                                            {invoice.no_invoice}
                                        </div>

                                        <div className="mt-1 truncate text-xs font-semibold text-slate-500">
                                            {invoice.customer || "-"}
                                        </div>

                                        <div className="mt-1 truncate text-xs font-semibold text-slate-400">
                                            {invoice.event?.nama_event || "-"}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        <StatusBadge status={invoice.status || invoiceTab} />
                                        <TransactionTypeBadge type={transactionType} />
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
                                    <span>{invoice.total_qty || 0} item</span>
                                    <span>{formatRupiah(invoice.total_amount || 0)}</span>
                                </div>

                                <div className={`mt-3 rounded-2xl px-3 py-2 text-xs font-black ring-1 ${getTransactionTypeInfoClass(transactionType)}`}>
                                    {transactionType === "PO"
                                        ? "PO - produk tidak mengurangi stok"
                                        : "Pembelian - transaksi mengurangi stok"}
                                </div>

                                {invoice.payment && (
                                    <div
                                        className={`mt-3 rounded-2xl px-3 py-2 text-xs font-black ring-1 ${
                                            invoice.payment.payment_status === "Lunas"
                                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                                : "bg-amber-50 text-amber-700 ring-amber-100"
                                        }`}
                                    >
                                        <div>
                                            Status: {invoice.payment.payment_status || "-"}
                                            {" · "}
                                            Jenis: {invoice.payment.payment_type || "-"}
                                        </div>
                                        <div className="mt-1">
                                            Total: {formatRupiah(invoice.payment.total_amount || 0)}
                                            {" · "}
                                            Bayar: {formatRupiah(invoice.payment.paid_amount || 0)}
                                        </div>
                                        <div className="mt-1">
                                            Sisa: {formatRupiah(invoice.payment.remaining_amount || 0)}
                                            {" · "}
                                            Kembali: {formatRupiah(invoice.payment.change_amount || 0)}
                                        </div>
                                    </div>
                                )}

                                {invoiceTab === "Paid" && (
                                    <div className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 ring-1 ring-red-100">
                                        Pilih invoice ini untuk menampilkan tombol Void Transaksi dan Preview Nota PDF.
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function normalizeTransactionType(type) {
    return type === "PO" ? "PO" : "Pembelian";
}

function TransactionTypeBadge({ type }) {
    const normalized = normalizeTransactionType(type);

    const className =
        normalized === "PO"
            ? "bg-blue-50 text-blue-700 ring-blue-100"
            : "bg-emerald-50 text-emerald-700 ring-emerald-100";

    return (
        <span className={`inline-flex rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${className}`}>
            {normalized}
        </span>
    );
}

function getInvoiceCardClass(type) {
    const normalized = normalizeTransactionType(type);

    if (normalized === "PO") {
        return "border-blue-200 bg-blue-50/30";
    }

    return "border-emerald-200 bg-emerald-50/20";
}

function getActiveInvoiceCardClass(type) {
    const normalized = normalizeTransactionType(type);

    if (normalized === "PO") {
        return "border-blue-700 bg-blue-50 ring-2 ring-blue-100";
    }

    return "border-emerald-700 bg-emerald-50 ring-2 ring-emerald-100";
}

function getTransactionTypeInfoClass(type) {
    const normalized = normalizeTransactionType(type);

    if (normalized === "PO") {
        return "bg-blue-50 text-blue-700 ring-blue-100";
    }

    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function attachNotaTransactionType(nota, transactionType) {
    if (!nota) return nota;

    const normalized = normalizeTransactionType(
        transactionType || nota.transaction_type || nota.invoice?.transaction_type
    );

    return {
        ...nota,
        transaction_type: normalized,
        invoice: {
            ...(nota.invoice || {}),
            transaction_type: normalized,
        },
    };
}

function getTabActiveClass(status) {
    if (status === "Paid") {
        return "bg-emerald-600 text-white ring-1 ring-emerald-600";
    }

    if (status === "Void Transaksi") {
        return "bg-red-600 text-white ring-1 ring-red-600";
    }

    if (status === "Void Carts") {
        return "bg-rose-600 text-white ring-1 ring-rose-600";
    }

    return "bg-amber-500 text-white ring-1 ring-amber-500";
}

function StockBadge({ label, value, type = "slate" }) {
    const styles = {
        blue: "bg-blue-50 text-blue-700 ring-blue-100",
        amber: "bg-amber-50 text-amber-700 ring-amber-100",
        emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        slate: "bg-slate-100 text-slate-700 ring-slate-200",
    };

    return (
        <span
            className={`rounded-xl px-3 py-1 text-xs font-black ring-1 ${
                styles[type] || styles.slate
            }`}
        >
            {label}: {Number(value || 0)}
        </span>
    );
}

function StatusBadge({ status }) {
    const style =
        status === "Paid"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : status === "Void Carts" || status === "Void Transaksi" || status === "Void"
            ? "bg-red-50 text-red-700 ring-red-100"
            : status === "Draft"
            ? "bg-amber-50 text-amber-700 ring-amber-100"
            : "bg-slate-100 text-slate-700 ring-slate-200";

    return (
        <span
            className={`inline-flex rounded-xl px-3 py-1 text-xs font-black ring-1 ${style}`}
        >
            {status}
        </span>
    );
}

function InfoBox({ label, value }) {
    return (
        <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
        </div>
    );
}


function TransactionTypePicker({ value, onChange, disabled }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
                Jenis Transaksi
            </label>

            <div className="grid gap-3 md:grid-cols-2">
                {TRANSACTION_TYPES.map((item) => {
                    const active = value === item.value;

                    return (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => onChange(item.value)}
                            disabled={disabled}
                            className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                active
                                    ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-200"
                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                            }`}
                        >
                            <div className="text-sm font-black uppercase tracking-wide">
                                {item.title}
                            </div>
                            <div
                                className={`mt-1 text-xs font-bold leading-5 ${
                                    active ? "text-slate-300" : "text-slate-500"
                                }`}
                            >
                                {item.description}
                            </div>
                        </button>
                    );
                })}
            </div>

            <p className="mt-2 text-xs font-bold text-slate-500">
                Satu invoice hanya boleh berisi satu jenis transaksi. PO tidak mengurangi stok, Pembelian mengurangi stok.
            </p>
        </div>
    );
}

function Select2({ label, value, options, onChange, placeholder, disabled }) {
    return (
        <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </label>

            <ReactSelect
                value={value}
                onChange={onChange}
                options={options}
                isClearable
                isSearchable
                isDisabled={disabled}
                placeholder={placeholder}
                noOptionsMessage={() => "Data tidak ditemukan"}
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

function Input({ label, ...props }) {
    return (
        <div className="min-w-0">
            <label className="mb-2 block text-sm font-black text-slate-700">
                {label}
            </label>

            <input
                {...props}
                className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-slate-950 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            />
        </div>
    );
}

function SummaryRow({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <span className="text-sm font-black text-slate-500">{label}</span>
            <span className="truncate text-lg font-black text-slate-950">{value}</span>
        </div>
    );
}

function Alert({ type, message }) {
    const styles =
        type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700";

    return (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold ${styles}`}>
            {message}
        </div>
    );
}

function CartIcon({ className = "h-5 w-5" }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M3 4.5h2.2c.5 0 .9.34 1.02.82L6.7 7.2m0 0 1.55 7.02A2.25 2.25 0 0 0 10.45 16h6.85a2.25 2.25 0 0 0 2.17-1.66l1.08-4A1.75 1.75 0 0 0 18.86 8.1H6.9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M10.25 20a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM17.25 20a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
            />
        </svg>
    );
}

function openNotaLoadingWindow() {
    const win = window.open("", "_blank", "width=390,height=720");

    if (!win) {
        return null;
    }

    win.document.open();
    win.document.write(`
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>Memuat Nota</title>
                <style>
                    body {
                        margin: 0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #f1f5f9;
                        color: #0f172a;
                        font-family: Arial, Helvetica, sans-serif;
                    }
                    .box {
                        width: 320px;
                        border-radius: 18px;
                        background: #ffffff;
                        padding: 24px;
                        text-align: center;
                        box-shadow: 0 22px 50px rgba(15, 23, 42, 0.18);
                    }
                    .loader {
                        width: 42px;
                        height: 42px;
                        margin: 0 auto 14px;
                        border-radius: 999px;
                        border: 4px solid #e2e8f0;
                        border-top-color: #16a34a;
                        animation: spin 0.8s linear infinite;
                    }
                    .title {
                        font-size: 16px;
                        font-weight: 900;
                    }
                    .text {
                        margin-top: 6px;
                        color: #64748b;
                        font-size: 12px;
                        font-weight: 700;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <div class="box">
                    <div class="loader"></div>
                    <div class="title">Menyiapkan Nota</div>
                    <div class="text">Mohon tunggu, preview print nota sedang dibuat.</div>
                </div>
            </body>
        </html>
    `);
    win.document.close();
    win.focus();

    return win;
}

function showNotaWindowError(win, message) {
    if (!win || win.closed) {
        alert(message || "Gagal membuka nota.");
        return;
    }

    win.document.open();
    win.document.write(`
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <title>Gagal Membuka Nota</title>
                <style>
                    body {
                        margin: 0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #fef2f2;
                        color: #7f1d1d;
                        font-family: Arial, Helvetica, sans-serif;
                    }
                    .box {
                        width: 360px;
                        border-radius: 18px;
                        border: 1px solid #fecaca;
                        background: #ffffff;
                        padding: 24px;
                        text-align: center;
                        box-shadow: 0 22px 50px rgba(127, 29, 29, 0.12);
                    }
                    .title {
                        font-size: 16px;
                        font-weight: 900;
                    }
                    .text {
                        margin-top: 8px;
                        color: #991b1b;
                        font-size: 13px;
                        font-weight: 700;
                        line-height: 1.5;
                    }
                    button {
                        margin-top: 16px;
                        border: 0;
                        border-radius: 12px;
                        background: #dc2626;
                        color: #fff;
                        padding: 10px 14px;
                        font-weight: 900;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="box">
                    <div class="title">Nota gagal dibuat</div>
                    <div class="text">${escapeHtml(message || "Terjadi kesalahan saat membuat nota.")}</div>
                    <button onclick="window.close()">Tutup</button>
                </div>
            </body>
        </html>
    `);
    win.document.close();
    win.focus();
}

function openNotaPdfPreview(nota, targetWindow = null, autoPrint = false) {
    if (!nota) {
        if (targetWindow) {
            showNotaWindowError(targetWindow, "Data nota tidak ditemukan.");
        } else {
            alert("Data nota tidak ditemukan.");
        }
        return;
    }

    const win = targetWindow || openNotaLoadingWindow();

    if (!win) {
        alert("Popup preview nota diblokir browser. Izinkan popup untuk membuka nota.");
        return;
    }

    const items = Array.isArray(nota.items) ? nota.items : [];
    const invoice = nota.invoice || {};
    const event = nota.event || {};
    const cashier = nota.cashier || {};
    const payment = nota.payment || {};
    const summary = nota.summary || {};

    const invoiceNo = invoice.no_invoice || "-";
    const printedAt = nota.printed_at || "-";
    const customerName = invoice.customer || "Walk In Customer";
    const eventName = event.nama_event || "POS";
    const eventAddress = event.alamat_event || "-";
    const cashierName = cashier.name || "-";
    const paymentMethod = payment.payment_method || "-";
    const paymentStatus = payment.payment_status || invoice.status || "-";
    const paymentType = payment.payment_type || "-";
    const remainingAmountValue = Number(payment.remaining_amount || 0);
    const transactionType = normalizeTransactionType(
        invoice.transaction_type || nota.transaction_type
    );
    const receiptTitle = transactionType === "PO" ? "Nota PO" : "Nota Pembelian";
    const receiptSubtitle =
        transactionType === "PO"
            ? "Purchase Order Receipt"
            : "Point of Sales Receipt";
    const receiptClass =
        transactionType === "PO"
            ? "receipt receipt-po"
            : "receipt receipt-pembelian";
    const transactionBadgeClass =
        transactionType === "PO" ? "type-badge type-po" : "type-badge type-pembelian";
    const totalQty = Number(summary.total_qty || 0);
    const totalAmount = Number(payment.total_amount || summary.total_amount || 0);
    const paidAmountValue = Number(payment.paid_amount || 0);
    const changeAmountValue = Number(payment.change_amount || 0);

    const rows = items
        .map((item) => {
            const qty = Number(item.qty || 0);
            const price = Number(item.harga || 0);
            const subtotal = Number(item.subtotal || 0);

            const isBundle = item.tipe_harga === "bundle";
            const bundleDetails = Array.isArray(item.bundle_details) ? item.bundle_details : [];
            const bundleHtml =
                isBundle && bundleDetails.length
                    ? `
                        <div class="bundle-items">
                            ${bundleDetails
                                .map((detail) => {
                                    return `<div>• ${escapeHtml(detail.nama_produk || "-")} x${Number(detail.qty || 1)}</div>`;
                                })
                                .join("")}
                        </div>
                    `
                    : "";

            return `
                <div class="item-row">
                    <div class="item-top">
                        <div class="item-name">${escapeHtml(item.nama_produk || "-")}</div>
                        <div class="item-subtotal">${formatRupiah(subtotal)}</div>
                    </div>
                    <div class="item-bottom">
                        <span>${qty} x ${formatRupiah(price)}</span>
                        <span>${isBundle ? "Bundle" : ""}</span>
                    </div>
                    ${bundleHtml}
                </div>
            `;
        })
        .join("");

    const autoPrintScript = autoPrint
        ? `
            <script>
                window.addEventListener("load", function () {
                    setTimeout(function () {
                        window.focus();
                        window.print();
                    }, 500);
                });
            </script>
        `
        : "";

    const html = `
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>${escapeHtml(receiptTitle)} ${escapeHtml(invoiceNo)}</title>
                <style>
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    html,
                    body {
                        margin: 0;
                        padding: 0;
                    }

                    body {
                        background: #e2e8f0;
                        color: #000000;
                        font-family: "Courier New", Courier, monospace;
                        font-size: 11.5px;
                        font-weight: 900;
                        line-height: 1.28;
                        -webkit-font-smoothing: none;
                        text-rendering: geometricPrecision;
                    }

                    .toolbar {
                        position: sticky;
                        top: 0;
                        z-index: 50;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        padding: 10px;
                        background: #0f172a;
                        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
                    }

                    .toolbar button {
                        border: 0;
                        border-radius: 10px;
                        padding: 9px 12px;
                        font-size: 12px;
                        font-weight: 900;
                        cursor: pointer;
                    }

                    .toolbar .print {
                        background: #16a34a;
                        color: #ffffff;
                    }

                    .toolbar .close {
                        background: #ef4444;
                        color: #ffffff;
                    }

                    .toolbar .hint {
                        color: #cbd5e1;
                        font-size: 10px;
                        font-weight: 700;
                    }

                    .page-wrap {
                        padding: 12px 0 18px;
                    }

                    .receipt {
                        width: 80mm;
                        max-width: 80mm;
                        margin: 0 auto;
                        padding: 4mm 4mm 5mm;
                        background: #ffffff;
                        color: #000000;
                        border-radius: 10px;
                        box-shadow: 0 18px 35px rgba(15, 23, 42, 0.20);
                        font-family: "Courier New", Courier, monospace;
                        font-weight: 900;
                    }

                    .receipt,
                    .receipt * {
                        color: #000000 !important;
                        font-weight: 900 !important;
                        -webkit-font-smoothing: none !important;
                        text-rendering: geometricPrecision !important;
                    }

                    .receipt * {
                        -webkit-text-stroke: 0.18px #000000;
                        text-shadow: 0 0 0 #000000;
                    }

                    .receipt-po {
                        border-top: 5px solid #000000;
                    }

                    .receipt-pembelian {
                        border-top: 5px solid #000000;
                    }

                    .header {
                        text-align: center;
                    }

                    .brand-title {
                        font-size: 16px;
                        font-weight: 900;
                        letter-spacing: 0.04em;
                        text-transform: uppercase;
                    }

                    .brand-subtitle {
                        margin-top: 2px;
                        color: #000000;
                        font-size: 10px;
                        font-weight: 900;
                        text-transform: uppercase;
                    }

                    .type-badge {
                        display: inline-block;
                        margin-top: 5px;
                        border: 2px solid #000000 !important;
                        border-radius: 999px;
                        padding: 3px 8px;
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-size: 10px;
                        font-weight: 900;
                        letter-spacing: 0.10em;
                        text-transform: uppercase;
                    }

                    .type-po {
                        border: 2px solid #000000;
                        background: #ffffff;
                        color: #000000;
                    }

                    .type-pembelian {
                        border: 2px solid #000000;
                        background: #ffffff;
                        color: #000000;
                    }

                    .event-name {
                        margin-top: 7px;
                        font-size: 13px;
                        font-weight: 900;
                        text-transform: uppercase;
                    }

                    .event-address {
                        margin: 3px auto 0;
                        max-width: 68mm;
                        color: #000000;
                        font-size: 9.5px;
                        font-weight: 900;
                        text-transform: uppercase
                    }

                    .divider {
                        border-top: 2px dashed #000000;
                        margin: 8px 0;
                        text-transform: uppercase
                    }

                    .info-line {
                        display: flex;
                        justify-content: space-between;
                        gap: 8px;
                        margin: 3px 0;
                        text-transform: uppercase
                    }

                    .info-line .label {
                        color: #000000;
                        font-size: 9.8px;
                        font-weight: 900;
                        text-transform: uppercase;
                        white-space: nowrap;
                    }

                    .info-line .value {
                        max-width: 48mm;
                        text-align: right;
                        font-size: 10.8px;
                        font-weight: 900;
                        word-break: break-word;
                    }

                    .status-paid {
                        display: block;
                        margin-top: 7px;
                        border: 2px solid #000000;
                        border-radius: 999px;
                        padding: 4px 7px;
                        background: #ffffff;
                        color: #000000;
                        text-align: center;
                        font-size: 10px;
                        font-weight: 900;
                        letter-spacing: 0.10em;
                        text-transform: uppercase;
                    }

                    .items-title {
                        display: grid;
                        grid-template-columns: 1fr auto;
                        gap: 8px;
                        padding-bottom: 5px;
                        border-bottom: 2px solid #000000;
                        color: #000000;
                        font-size: 10px;
                        font-weight: 900;
                        text-transform: uppercase;
                    }

                    .item-row {
                        padding: 6px 0;
                        border-bottom: 2px dashed #000000;
                    }

                    .item-top {
                        display: grid;
                        grid-template-columns: minmax(0, 1fr) auto;
                        gap: 8px;
                    }

                    .item-name {
                        min-width: 0;
                        font-size: 11.5px;
                        font-weight: 900;
                        word-break: break-word;
                    }

                    .item-subtotal {
                        text-align: right;
                        font-size: 11.5px;
                        font-weight: 900;
                        white-space: nowrap;
                    }

                    .item-bottom {
                        display: flex;
                        justify-content: space-between;
                        gap: 6px;
                        margin-top: 3px;
                        color: #000000;
                        font-size: 9.5px;
                        font-weight: 900;
                    }

                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        gap: 8px;
                        margin: 4px 0;
                    }

                    .summary-label {
                        color: #000000;
                        font-size: 11px;
                        font-weight: 900;
                    }

                    .summary-value {
                        text-align: right;
                        font-size: 11px;
                        font-weight: 900;
                    }

                    .total-row {
                        margin-top: 7px;
                        padding-top: 7px;
                        border-top: 3px double #000000;
                    }

                    .total-row .summary-label,
                    .total-row .summary-value {
                        color: #000000;
                        font-size: 14px;
                        font-weight: 900;
                    }

                    .footer {
                        margin-top: 9px;
                        text-align: center;
                    }

                    .thank-you {
                        font-size: 11px;
                        font-weight: 900;
                    }

                    .footer-note {
                        margin: 4px auto 0;
                        max-width: 68mm;
                        color: #000000;
                        font-size: 9.5px;
                        font-weight: 900;
                    }

                    .barcode-box {
                        margin: 8px auto 0;
                        width: 54mm;
                        height: 22px;
                        display: flex;
                        align-items: end;
                        justify-content: center;
                        gap: 1.5px;
                    }

                    .bar {
                        width: 1.5px;
                        background: #111827;
                    }

                    .bar:nth-child(1) { height: 12px; }
                    .bar:nth-child(2) { height: 20px; }
                    .bar:nth-child(3) { height: 15px; }
                    .bar:nth-child(4) { height: 22px; }
                    .bar:nth-child(5) { height: 11px; }
                    .bar:nth-child(6) { height: 18px; }
                    .bar:nth-child(7) { height: 14px; }
                    .bar:nth-child(8) { height: 21px; }
                    .bar:nth-child(9) { height: 13px; }
                    .bar:nth-child(10) { height: 19px; }
                    .bar:nth-child(11) { height: 16px; }
                    .bar:nth-child(12) { height: 12px; }

                    .invoice-code {
                        margin-top: 2px;
                        color: #000000;
                        font-size: 9px;
                        font-weight: 900;
                    }

                    @media print {
                        body {
                            background: #ffffff;
                        }

                        .toolbar {
                            display: none;
                        }

                        .page-wrap {
                            padding: 0;
                        }

                        .receipt {
                            width: 80mm;
                            max-width: 80mm;
                            margin: 0;
                            padding: 3mm 3mm 4mm;
                            border-radius: 0;
                            box-shadow: none;
                            color: #000000 !important;
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }

                        .receipt,
                        .receipt * {
                            color: #000000 !important;
                            font-weight: 900 !important;
                            -webkit-text-stroke: 0.22px #000000 !important;
                            text-shadow: 0 0 0 #000000 !important;
                        }

                        .type-badge,
                        .status-paid {
                            background: #ffffff !important;
                            border-color: #000000 !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <button class="print" onclick="window.print()">Print / Save PDF</button>
                    <button class="close" onclick="window.close()">Tutup</button>
                    <span class="hint">Thermal 80mm x 80mm roll</span>
                </div>

                <div class="page-wrap">
                    <main class="${receiptClass}">
                        <header class="header">
                            <div class="brand-title">${escapeHtml(receiptTitle)}</div>
                            <div class="brand-subtitle">${escapeHtml(receiptSubtitle)}</div>
                            <div class="${transactionBadgeClass}">${escapeHtml(transactionType)}</div>
                            <div class="event-name">${escapeHtml(eventName)}</div>
                            <div class="event-address">${escapeHtml(eventAddress)}</div>
                        </header>

                        <div class="divider"></div>

                        <section>
                            <div class="info-line">
                                <span class="label">Invoice</span>
                                <span class="value">${escapeHtml(invoiceNo)}</span>
                            </div>
                            <div class="info-line">
                                <span class="label">Jenis</span>
                                <span class="value">${escapeHtml(transactionType)}</span>
                            </div>
                            <div class="info-line">
                                <span class="label">Tanggal</span>
                                <span class="value">${escapeHtml(printedAt)}</span>
                            </div>
                            <div class="info-line">
                                <span class="label">Customer</span>
                                <span class="value">${escapeHtml(customerName)}</span>
                            </div>
                            <div class="info-line">
                                <span class="label">Kasir</span>
                                <span class="value">${escapeHtml(cashierName)}</span>
                            </div>
                            <div class="status-paid">${escapeHtml(paymentStatus)}</div>
                        </section>

                        <div class="divider"></div>

                        <section>
                            <div class="items-title">
                                <span>Produk</span>
                                <span>Subtotal</span>
                            </div>
                            ${rows || `<div class="item-row" style="text-align:center;color:#64748b;font-weight:800;">Tidak ada item.</div>`}
                        </section>

                        <div class="divider"></div>

                        <section>
                            <div class="summary-row">
                                <span class="summary-label">Total Qty</span>
                                <span class="summary-value">${totalQty}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Metode</span>
                                <span class="summary-value">${escapeHtml(paymentMethod)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Jenis Bayar</span>
                                <span class="summary-value">${escapeHtml(paymentType)}</span>
                            </div>
                            <div class="summary-row total-row">
                                <span class="summary-label">TOTAL</span>
                                <span class="summary-value">${formatRupiah(totalAmount)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Bayar</span>
                                <span class="summary-value">${formatRupiah(paidAmountValue)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Sisa</span>
                                <span class="summary-value">${formatRupiah(remainingAmountValue)}</span>
                            </div>
                            <div class="summary-row">
                                <span class="summary-label">Kembalian</span>
                                <span class="summary-value">${formatRupiah(changeAmountValue)}</span>
                            </div>
                        </section>

                        <div class="divider"></div>

                        <footer class="footer">
                            <div class="thank-you">Terima kasih atas kunjungan Anda.</div>
                            <div class="footer-note">${transactionType === "PO" ? "Simpan nota ini sebagai bukti PO." : "Simpan nota ini sebagai bukti pembayaran."}</div>
                            <div class="barcode-box" aria-hidden="true">
                                <span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span>
                                <span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span>
                                <span class="bar"></span><span class="bar"></span><span class="bar"></span><span class="bar"></span>
                            </div>
                            <div class="invoice-code">${escapeHtml(invoiceNo)}</div>
                        </footer>
                    </main>
                </div>

                ${autoPrintScript}
            </body>
        </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
}
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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