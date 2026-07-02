import "../../../css/app.css";

import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import DashboardPage from "./DashboardPage";

import PosIndexPage from "./pos/Index";

import KategoriBarangIndexPage from "./master-data/kategori-barang/Index";
import PackageIndexPage from "./master-data/package/Index";
import BrandIndexPage from "./master-data/brand/Index";
import SatuanIndexPage from "./master-data/satuan/Index";
import SupplierIndexPage from "./master-data/supplier/Index";
import PaymentIndexPage from "./master-data/payment/Index";

import DataEventIndexPage from "./data-event/Index";
import EventInboundIndexPage from "./event-inbound/Index";

import ProdukIndexPage from "./data-produk/produk/Index";
import ProdukPriceIndexPage from "./data-produk/produk-price/Index";

import ReportStokAkhirIndexPage from "./report-stok-akhir/Index";
import ReportTransaksiCustomerIndexPage from "./report-transaksi-customer/Index";

class PageErrorBoundary extends Component {
    constructor(props) {
        super(props);

        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error, info) {
        console.error("React page error:", error);
        console.error("React error info:", info);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({
                hasError: false,
                error: null,
            });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                                Halaman gagal dimuat
                            </p>

                            <h3 className="mt-2 text-2xl font-black text-red-900">
                                Ada error pada komponen halaman ini
                            </h3>

                            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-red-700">
                                Periksa kembali file komponen halaman, response API,
                                atau import yang digunakan.
                            </p>

                            <pre className="mt-4 max-h-60 overflow-auto rounded-2xl bg-white p-4 text-xs font-semibold text-red-700">
                                {String(
                                    this.state.error?.message ||
                                        this.state.error ||
                                        "Unknown error"
                                )}
                            </pre>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                this.setState({
                                    hasError: false,
                                    error: null,
                                })
                            }
                            className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700"
                        >
                            Muat Ulang
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

function MaintenancePage({
    title = "Halaman Sedang Maintenance",
    module = "Admin Panel",
    description = "Fitur ini sedang dalam proses pengembangan dan belum dapat digunakan.",
}) {
    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="relative bg-slate-950 p-8 text-white sm:p-10">
                    <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl"></div>
                    <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl"></div>
                    <div className="absolute right-20 top-12 hidden h-24 w-24 rounded-full border border-white/10 bg-white/5 lg:block"></div>

                    <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-200">
                                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                                Sedang Maintenance
                            </div>

                            <p className="mt-6 text-xs font-black uppercase tracking-[0.26em] text-slate-400">
                                {module}
                            </p>

                            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                                {title}
                            </h1>

                            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
                                {description}
                            </p>

                            <div className="mt-7 flex flex-wrap gap-3">
                                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white">
                                    Status: Maintenance
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200">
                                    Akses: Admin Panel
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center xl:justify-end">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-[2rem] bg-blue-400/20 blur-2xl"></div>

                                <div className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur">
                                    <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-white text-slate-950 shadow-2xl">
                                        <MaintenanceIcon />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function MaintenanceIcon() {
    return (
        <svg
            viewBox="0 0 64 64"
            className="h-12 w-12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M36.8 8.5a16.3 16.3 0 0 0-12.1 28l-13 13a5.8 5.8 0 1 0 8.2 8.2l13-13A16.3 16.3 0 0 0 55.6 24a2.2 2.2 0 0 0-3.7-1.6l-6.4 6.4-7.9-1.3-1.3-7.9 6.4-6.4A2.2 2.2 0 0 0 41.1 9a16.4 16.4 0 0 0-4.3-.5Z"
                fill="currentColor"
            />
            <circle cx="18" cy="46" r="3" fill="#38BDF8" />
        </svg>
    );
}

export default function AdminPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState("dashboard");

    /*
     * Sub menu dibuat tertutup saat halaman pertama kali dibuka.
     */
    const [openMenus, setOpenMenus] = useState({});

    const contentRef = useRef(null);

    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
        });

        if (contentRef.current) {
            contentRef.current.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth",
            });
        }
    }, [activeMenu]);

    const handleLogout = async () => {
        try {
            await axios.post("/logout");
            window.location.href = "/login";
        } catch (error) {
            console.error(error);
            alert("Gagal logout.");
        }
    };

    const menuItems = [
        {
            key: "dashboard",
            label: "Dashboard",
            description: "Ringkasan utama sistem",
            icon: "D",
            component: DashboardPage,
        },
        {
            key: "pos",
            label: "POS",
            description: "Transaksi penjualan event",
            icon: "POS",
            component: PosIndexPage,
        },
        {
            key: "master-data",
            label: "Master Data",
            description: "Kelola data utama sistem",
            icon: "M",
            children: [
                {
                    key: "kategori-produk",
                    label: "Kategori Produk",
                    description: "Kelola kategori produk",
                    icon: "K",
                    component: KategoriBarangIndexPage,
                },
                {
                    key: "package",
                    label: "Package",
                    description: "Kelola data package produk",
                    icon: "P",
                    component: PackageIndexPage,
                },
                {
                    key: "brand",
                    label: "Brand",
                    description: "Kelola data brand produk",
                    icon: "B",
                    component: BrandIndexPage,
                },
                {
                    key: "satuan",
                    label: "Satuan",
                    description: "Kelola data satuan produk",
                    icon: "S",
                    component: SatuanIndexPage,
                },
                {
                    key: "supplier",
                    label: "Supplier",
                    description: "Kelola data supplier",
                    icon: "SP",
                    component: SupplierIndexPage,
                },
                {
    key: "payment",
    label: "Payment",
    description: "Kelola metode pembayaran",
    icon: "PY",
    component: PaymentIndexPage,
},
            ],
        },
        {
            key: "event",
            label: "Event",
            description: "Kelola event dan inbound",
            icon: "EV",
            children: [
                {
                    key: "data-event",
                    label: "Data Event",
                    description: "Kelola data event",
                    icon: "DE",
                    component: DataEventIndexPage,
                },
                {
                    key: "event-inbound",
                    label: "Event Inbound",
                    description: "Kelola stok masuk event",
                    icon: "EI",
                    component: EventInboundIndexPage,
                },
            ],
        },
        {
            key: "data-produk",
            label: "Data Produk",
            description: "Kelola produk dan harga",
            icon: "DP",
            children: [
                {
                    key: "produk",
                    label: "Produk",
                    description: "Kelola data produk",
                    icon: "PR",
                    component: ProdukIndexPage,
                },
                {
                    key: "produk-price",
                    label: "Produk Price",
                    description: "Kelola harga produk",
                    icon: "HP",
                    component: ProdukPriceIndexPage,
                },
            ],
        },
        {
            key: "report",
            label: "Report",
            description: "Laporan stok dan transaksi",
            icon: "RP",
            children: [
                {
                    key: "report-transaksi-customer",
                    label: "Transaksi Customer",
                    description: "Report customer, omset, event, dan produk terjual",
                    icon: "TC",
                    component: ReportTransaksiCustomerIndexPage,
                },
                {
                    key: "report-stok-akhir",
                    label: "Stok Akhir Event",
                    description: "Report stok akhir setiap event",
                    icon: "SA",
                    component: ReportStokAkhirIndexPage,
                },
            ],
        },
    ];

    const flattenMenus = useMemo(() => {
        return menuItems.flatMap((menu) => {
            if (Array.isArray(menu.children)) {
                return menu.children.map((child) => ({
                    ...child,
                    parentKey: menu.key,
                    parentLabel: menu.label,
                }));
            }

            return [menu];
        });
    }, []);

    const activeMenuData = useMemo(() => {
        return (
            flattenMenus.find((item) => item.key === activeMenu) ||
            flattenMenus[0]
        );
    }, [activeMenu, flattenMenus]);

    const ActiveComponent = activeMenuData?.component || DashboardPage;

    const handleMenuClick = (menu) => {
        const hasChildren = Array.isArray(menu.children);

        if (hasChildren) {
            setOpenMenus((prev) => {
                const currentlyOpen = Boolean(prev[menu.key]);

                return currentlyOpen
                    ? {}
                    : {
                          [menu.key]: true,
                      };
            });

            return;
        }

        setActiveMenu(menu.key);
        setOpenMenus({});
        setSidebarOpen(false);
    };

    const handleSubMenuClick = (parentKey, childKey) => {
        setActiveMenu(childKey);

        setOpenMenus({
            [parentKey]: true,
        });

        setSidebarOpen(false);
    };

    return (
        <main className="h-screen overflow-hidden bg-slate-100 text-slate-900">
            <div className="flex h-screen overflow-hidden">
                {sidebarOpen && (
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
                        aria-label="Tutup sidebar"
                    />
                )}

                <aside
                    className={`fixed inset-y-0 left-0 z-40 h-screen w-80 shrink-0 transform overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none ${
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="p-6">
                            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-xl">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">
                                        EP
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h1 className="mt-1 truncate text-xl font-black">
                                            EVORA POS
                                        </h1>

                                        <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                                            Event Operations System
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5">
                            {menuItems.map((menu) => {
                                const hasChildren = Array.isArray(menu.children);

                                const childKeys = hasChildren
                                    ? menu.children.map((child) => child.key)
                                    : [];

                                const isActive =
                                    activeMenu === menu.key ||
                                    childKeys.includes(activeMenu);

                                const isOpen = Boolean(openMenus[menu.key]);

                                return (
                                    <div key={menu.key}>
                                        <button
                                            type="button"
                                            onClick={() => handleMenuClick(menu)}
                                            className={`group flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition ${
                                                isActive
                                                    ? "bg-slate-950 text-white shadow-lg"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                                            }`}
                                        >
                                            <span
                                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black transition ${
                                                    isActive
                                                        ? "bg-white text-slate-950"
                                                        : "bg-slate-100 text-slate-700"
                                                }`}
                                            >
                                                {menu.icon}
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-black">
                                                    {menu.label}
                                                </span>

                                                <span
                                                    className={`mt-0.5 block truncate text-xs font-semibold ${
                                                        isActive
                                                            ? "text-slate-300"
                                                            : "text-slate-400"
                                                    }`}
                                                >
                                                    {menu.description}
                                                </span>
                                            </span>

                                            {hasChildren && (
                                                <span
                                                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
                                                        isActive
                                                            ? "bg-white/10 text-white"
                                                            : "bg-white text-slate-500 shadow-sm"
                                                    }`}
                                                >
                                                    {isOpen ? "−" : "+"}
                                                </span>
                                            )}
                                        </button>

                                        {hasChildren && isOpen && (
                                            <div className="ml-6 mt-2 space-y-1 border-l-2 border-slate-100 pl-4">
                                                {menu.children.map((child) => {
                                                    const isChildActive =
                                                        activeMenu === child.key;

                                                    return (
                                                        <button
                                                            key={child.key}
                                                            type="button"
                                                            onClick={() =>
                                                                handleSubMenuClick(
                                                                    menu.key,
                                                                    child.key
                                                                )
                                                            }
                                                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                                                                isChildActive
                                                                    ? "bg-slate-900 text-white shadow-lg"
                                                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                                                                    isChildActive
                                                                        ? "bg-white text-slate-950"
                                                                        : "bg-slate-100 text-slate-600"
                                                                }`}
                                                            >
                                                                {child.icon}
                                                            </span>

                                                            <span className="min-w-0 flex-1">
                                                                <span className="block truncate text-sm font-black">
                                                                    {child.label}
                                                                </span>

                                                                <span
                                                                    className={`block truncate text-xs font-semibold ${
                                                                        isChildActive
                                                                            ? "text-slate-300"
                                                                            : "text-slate-400"
                                                                    }`}
                                                                >
                                                                    {
                                                                        child.description
                                                                    }
                                                                </span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                <section className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
                    <header className="shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSidebarOpen(true)}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-700 hover:bg-slate-200 lg:hidden"
                                    aria-label="Buka sidebar"
                                >
                                    ☰
                                </button>

                                <div>
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                        {activeMenuData?.parentLabel ||
                                            "Admin Panel"}
                                    </p>

                                    <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
                                        {activeMenuData?.label || "Dashboard"}
                                    </h2>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="hidden items-center gap-3 rounded-2xl bg-slate-950 px-4 py-2 text-white sm:flex">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">
                                        A
                                    </div>

                                    <div>
                                        <p className="text-sm font-black">
                                            Admin
                                        </p>
                                        <p className="text-xs font-bold text-green-300">
                                            Online
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-red-100 hover:bg-red-700"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </header>

                    <div
                        ref={contentRef}
                        className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8"
                    >
                        <PageErrorBoundary resetKey={activeMenu}>
                            <ActiveComponent />
                        </PageErrorBoundary>
                    </div>
                </section>
            </div>
        </main>
    );
}