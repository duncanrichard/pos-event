import React from "react";

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[1.5rem] bg-slate-950 shadow-sm">
                <div className="relative p-8 text-white">
                    <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl"></div>
                    <div className="absolute bottom-0 left-20 h-32 w-32 rounded-full bg-slate-500/20 blur-2xl"></div>

                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                                EVORA POS
                            </p>

                            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                                Dashboard Demografi Data POS
                            </h1>

                            <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300">
                                Ringkasan data transaksi, produk, kategori, stok,
                                dan performa operasional POS Marketing Event.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Status Sistem
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                                <span className="text-sm font-black text-white">
                                    Online
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Total Produk"
                    value="128"
                    description="Produk terdaftar"
                    code="PRD"
                />

                <StatCard
                    title="Kategori Produk"
                    value="12"
                    description="Kategori aktif"
                    code="KAT"
                />

                <StatCard
                    title="Total Stok"
                    value="1.240"
                    description="Qty tersedia"
                    code="STK"
                />

                <StatCard
                    title="Transaksi Hari Ini"
                    value="32"
                    description="Nota penjualan"
                    code="TRX"
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                    <SectionTitle
                        title="Demografi Data POS"
                        subtitle="Ringkasan distribusi data utama pada sistem POS."
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                        <DemographyItem
                            label="Produk Aktif"
                            value="104"
                            percent="81%"
                            width="w-[81%]"
                        />

                        <DemographyItem
                            label="Produk Nonaktif"
                            value="24"
                            percent="19%"
                            width="w-[19%]"
                        />

                        <DemographyItem
                            label="Stok Aman"
                            value="96"
                            percent="75%"
                            width="w-[75%]"
                        />

                        <DemographyItem
                            label="Stok Menipis"
                            value="32"
                            percent="25%"
                            width="w-[25%]"
                        />
                    </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionTitle
                        title="Komposisi Stok"
                        subtitle="Status stok berdasarkan kondisi barang."
                    />

                    <div className="mt-6 space-y-5">
                        <Progress
                            label="Stok Aman"
                            value="75%"
                            width="w-[75%]"
                            variant="dark"
                        />

                        <Progress
                            label="Stok Menipis"
                            value="18%"
                            width="w-[18%]"
                            variant="amber"
                        />

                        <Progress
                            label="Stok Kosong"
                            value="7%"
                            width="w-[7%]"
                            variant="red"
                        />
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
                    <SectionTitle
                        title="Ringkasan Produk"
                        subtitle="Data contoh untuk tampilan awal dashboard POS."
                    />

                    <SimpleTable
                        headers={[
                            "Kode",
                            "Kategori",
                            "Produk",
                            "Stok",
                            "Status",
                        ]}
                        rows={[
                            [
                                "PRD001",
                                "Merchandise",
                                "Kaos Event",
                                "120",
                                "Stok Aman",
                            ],
                            [
                                "PRD002",
                                "Merchandise",
                                "Tumbler",
                                "45",
                                "Stok Aman",
                            ],
                            [
                                "PRD003",
                                "Voucher",
                                "Voucher Promo",
                                "18",
                                "Stok Menipis",
                            ],
                            [
                                "PRD004",
                                "Bundling",
                                "Paket Event",
                                "0",
                                "Stok Kosong",
                            ],
                        ]}
                    />
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <SectionTitle
                        title="Aktivitas POS"
                        subtitle="Ringkasan aktivitas operasional terbaru."
                    />

                    <div className="mt-6 space-y-4">
                        <ActivityItem
                            number="01"
                            title="Transaksi Penjualan"
                            description="32 transaksi tercatat hari ini."
                        />

                        <ActivityItem
                            number="02"
                            title="Update Stok"
                            description="45 barang masuk telah dicatat."
                        />

                        <ActivityItem
                            number="03"
                            title="Kategori Produk"
                            description="12 kategori produk aktif."
                        />

                        <ActivityItem
                            number="04"
                            title="Monitoring Data"
                            description="Data POS dalam kondisi normal."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

function SectionTitle({ title, subtitle }) {
    return (
        <div className="mb-6">
            <h2 className="text-xl font-black tracking-tight text-slate-950">
                {title}
            </h2>

            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {subtitle}
            </p>
        </div>
    );
}

function StatCard({ title, value, description, code }) {
    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-slate-500">
                        {title}
                    </p>

                    <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                        {value}
                    </h3>

                    <p className="mt-2 text-xs font-bold text-slate-400">
                        {description}
                    </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                    {code}
                </div>
            </div>
        </div>
    );
}

function DemographyItem({ label, value, percent, width }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-slate-700">
                        {label}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                        Total data
                    </p>
                </div>

                <div className="text-right">
                    <div className="text-2xl font-black text-slate-950">
                        {value}
                    </div>

                    <div className="text-xs font-black text-slate-500">
                        {percent}
                    </div>
                </div>
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                <div className={`h-2.5 rounded-full bg-slate-950 ${width}`}></div>
            </div>
        </div>
    );
}

function Progress({ label, value, width, variant = "dark" }) {
    const colorClass = {
        dark: "bg-slate-950",
        amber: "bg-amber-500",
        red: "bg-red-500",
    };

    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-black text-slate-700">{label}</span>
                <span className="font-black text-slate-950">{value}</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-3 rounded-full ${
                        colorClass[variant] || colorClass.dark
                    } ${width}`}
                ></div>
            </div>
        </div>
    );
}

function ActivityItem({ number, title, description }) {
    return (
        <div className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">
                {number}
            </div>

            <div>
                <h4 className="text-sm font-black text-slate-950">
                    {title}
                </h4>

                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {description}
                </p>
            </div>
        </div>
    );
}

function SimpleTable({ headers, rows }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-slate-950 text-white">
                            {headers.map((header) => (
                                <th
                                    key={header}
                                    className="whitespace-nowrap px-5 py-4 font-black"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className="border-t border-slate-100 text-slate-700 hover:bg-slate-50"
                            >
                                {row.map((cell, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        className="whitespace-nowrap px-5 py-4 font-semibold"
                                    >
                                        {renderCell(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function renderCell(value) {
    const statusClass = {
        "Stok Aman": "bg-emerald-100 text-emerald-700",
        "Stok Menipis": "bg-amber-100 text-amber-700",
        "Stok Kosong": "bg-red-100 text-red-700",
    };

    if (statusClass[value]) {
        return (
            <span
                className={`rounded-full px-3 py-1 text-xs font-black ${statusClass[value]}`}
            >
                {value}
            </span>
        );
    }

    return value;
}