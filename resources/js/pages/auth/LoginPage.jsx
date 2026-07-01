import React, { useState } from "react";
import axios from "axios";

export default function LoginPage() {
    const APP_NAME = "EVORA POS";
    const APP_FULL_NAME = "Event Operations & Retail Assistant";

    const [form, setForm] = useState({
        username: "",
        password: "",
        remember: false,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        if (!form.username.trim()) {
            setError("Username wajib diisi.");
            return;
        }

        if (!form.password.trim()) {
            setError("Password wajib diisi.");
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post("/login", {
                username: form.username,
                password: form.password,
                remember: form.remember,
            });

            if (response.data.success) {
                window.location.href = response.data.redirect || "/dashboard";
            } else {
                setError(response.data.message || "Login gagal.");
            }
        } catch (err) {
            if (err.response?.status === 419) {
                setError("Session kadaluarsa. Silakan refresh halaman lalu login lagi.");
            } else if (err.response?.data?.errors?.username) {
                setError(err.response.data.errors.username[0]);
            } else if (err.response?.data?.errors?.password) {
                setError(err.response.data.errors.password[0]);
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError("Terjadi kesalahan saat login.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <section style={styles.leftSection}>
                    <div style={styles.brandArea}>
                        <div style={styles.logoBox}>EP</div>

                        <div>
                            <div style={styles.systemLabel}>{APP_NAME}</div>
                            <div style={styles.companyName}>{APP_FULL_NAME}</div>
                        </div>
                    </div>

                    <div style={styles.contentArea}>
                        <div style={styles.overline}>
                            Sales Management • Inventory Control • Event Reporting
                        </div>

                        <h1 style={styles.heading}>
                            Platform operasional event untuk transaksi, stok, dan laporan penjualan.
                        </h1>

                        <p style={styles.description}>
                            {APP_NAME} membantu tim mengelola aktivitas penjualan event secara
                            lebih rapi, mulai dari input transaksi, pembayaran, kontrol stok,
                            hingga rekap laporan operasional.
                        </p>

                        <div style={styles.summaryBox}>
                            <div style={styles.summaryItem}>
                                <div style={styles.summaryNumber}>01</div>
                                <div>
                                    <div style={styles.summaryTitle}>Transaksi Penjualan</div>
                                    <div style={styles.summaryText}>
                                        Mencatat transaksi event, nominal pembayaran, dan data penjualan.
                                    </div>
                                </div>
                            </div>

                            <div style={styles.summaryDivider}></div>

                            <div style={styles.summaryItem}>
                                <div style={styles.summaryNumber}>02</div>
                                <div>
                                    <div style={styles.summaryTitle}>Pengelolaan Stok</div>
                                    <div style={styles.summaryText}>
                                        Memantau stok masuk, stok keluar, dan ketersediaan produk.
                                    </div>
                                </div>
                            </div>

                            <div style={styles.summaryDivider}></div>

                            <div style={styles.summaryItem}>
                                <div style={styles.summaryNumber}>03</div>
                                <div>
                                    <div style={styles.summaryTitle}>Laporan Event</div>
                                    <div style={styles.summaryText}>
                                        Menyediakan rekap penjualan dan data operasional event.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.leftFooter}>
                        © 2026 {APP_NAME}. All rights reserved.
                    </div>
                </section>

                <section style={styles.rightSection}>
                    <div style={styles.loginCard}>
                        <div style={styles.loginHeader}>
                            <div style={styles.cardLogo}>EP</div>

                            <h2 style={styles.loginTitle}>Masuk ke Sistem</h2>

                            <p style={styles.loginSubtitle}>
                                Login ke {APP_NAME} menggunakan akun yang telah terdaftar.
                            </p>
                        </div>

                        {error && (
                            <div style={styles.alert}>
                                <div style={styles.alertMark}>!</div>
                                <div>{error}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Username</label>

                                <input
                                    type="text"
                                    name="username"
                                    value={form.username}
                                    onChange={handleChange}
                                    placeholder="Masukkan username"
                                    style={styles.input}
                                    autoComplete="username"
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Password</label>

                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Masukkan password"
                                    style={styles.input}
                                    autoComplete="current-password"
                                    disabled={loading}
                                />
                            </div>

                            <div style={styles.optionRow}>
                                <label style={styles.rememberLabel}>
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={form.remember}
                                        onChange={handleChange}
                                        disabled={loading}
                                        style={styles.checkbox}
                                    />

                                    <span>Ingat saya</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    ...styles.button,
                                    opacity: loading ? 0.75 : 1,
                                    cursor: loading ? "not-allowed" : "pointer",
                                }}
                            >
                                {loading ? "Memproses..." : "Masuk"}
                            </button>
                        </form>

                        <div style={styles.defaultAccount}>
                            <div style={styles.defaultTitle}>Akun default</div>

                            <div style={styles.defaultRow}>
                                <span>Username</span>
                                <strong>admin</strong>
                            </div>

                            <div style={styles.defaultRow}>
                                <span>Password</span>
                                <strong>admin123456</strong>
                            </div>
                        </div>

                        <div style={styles.cardFooter}>
                            {APP_NAME} — {APP_FULL_NAME}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        background: "#eef2f7",
        fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        color: "#0f172a",
    },

    container: {
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.08fr 0.92fr",
    },

    leftSection: {
        position: "relative",
        padding: "56px 64px",
        background: "linear-gradient(135deg, #111827 0%, #1e293b 55%, #334155 100%)",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        overflow: "hidden",
    },

    brandArea: {
        position: "relative",
        zIndex: 1,
        display: "flex",
        alignItems: "center",
        gap: "16px",
    },

    logoBox: {
        width: "58px",
        height: "58px",
        borderRadius: "14px",
        background: "#ffffff",
        color: "#111827",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        fontWeight: "900",
        letterSpacing: "0.5px",
        boxShadow: "0 16px 35px rgba(0,0,0,0.2)",
    },

    systemLabel: {
        fontSize: "12px",
        fontWeight: "800",
        letterSpacing: "2.2px",
        color: "#cbd5e1",
    },

    companyName: {
        marginTop: "4px",
        fontSize: "22px",
        fontWeight: "800",
        color: "#ffffff",
    },

    contentArea: {
        position: "relative",
        zIndex: 1,
        maxWidth: "760px",
        marginTop: "80px",
        marginBottom: "80px",
    },

    overline: {
        width: "fit-content",
        padding: "8px 12px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "#e2e8f0",
        fontSize: "12px",
        fontWeight: "700",
        letterSpacing: "0.8px",
        marginBottom: "22px",
    },

    heading: {
        margin: 0,
        maxWidth: "720px",
        fontSize: "46px",
        lineHeight: "1.12",
        fontWeight: "850",
        letterSpacing: "-1.4px",
    },

    description: {
        marginTop: "22px",
        maxWidth: "630px",
        color: "#cbd5e1",
        fontSize: "16px",
        lineHeight: "1.75",
        fontWeight: "400",
    },

    summaryBox: {
        marginTop: "36px",
        maxWidth: "680px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "22px",
        padding: "22px",
        backdropFilter: "blur(10px)",
    },

    summaryItem: {
        display: "flex",
        gap: "16px",
        alignItems: "flex-start",
    },

    summaryNumber: {
        width: "42px",
        height: "42px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.12)",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: "800",
        flexShrink: 0,
    },

    summaryTitle: {
        fontSize: "15px",
        fontWeight: "800",
        color: "#ffffff",
    },

    summaryText: {
        marginTop: "4px",
        fontSize: "13px",
        lineHeight: "1.55",
        color: "#cbd5e1",
    },

    summaryDivider: {
        height: "1px",
        background: "rgba(255,255,255,0.12)",
        margin: "18px 0",
    },

    leftFooter: {
        position: "relative",
        zIndex: 1,
        color: "#94a3b8",
        fontSize: "13px",
        fontWeight: "500",
    },

    rightSection: {
        padding: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        boxSizing: "border-box",
    },

    loginCard: {
        width: "100%",
        maxWidth: "430px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "22px",
        padding: "34px",
        boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
        boxSizing: "border-box",
    },

    loginHeader: {
        marginBottom: "26px",
    },

    cardLogo: {
        width: "52px",
        height: "52px",
        borderRadius: "14px",
        background: "#111827",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        fontWeight: "900",
        letterSpacing: "0.5px",
        marginBottom: "20px",
    },

    loginTitle: {
        margin: 0,
        color: "#0f172a",
        fontSize: "28px",
        fontWeight: "850",
        letterSpacing: "-0.7px",
    },

    loginSubtitle: {
        marginTop: "8px",
        marginBottom: 0,
        color: "#64748b",
        fontSize: "14px",
        lineHeight: "1.6",
        fontWeight: "400",
    },

    alert: {
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "12px 14px",
        borderRadius: "12px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#991b1b",
        fontSize: "14px",
        fontWeight: "600",
        marginBottom: "18px",
    },

    alertMark: {
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "#dc2626",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "800",
        flexShrink: 0,
        marginTop: "1px",
    },

    form: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },

    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },

    label: {
        color: "#334155",
        fontSize: "14px",
        fontWeight: "700",
    },

    input: {
        width: "100%",
        height: "48px",
        borderRadius: "12px",
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        padding: "0 14px",
        color: "#0f172a",
        fontSize: "14px",
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },

    optionRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "2px",
    },

    rememberLabel: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        color: "#475569",
        fontSize: "14px",
        fontWeight: "500",
    },

    checkbox: {
        width: "15px",
        height: "15px",
        accentColor: "#111827",
    },

    button: {
        height: "50px",
        border: "none",
        borderRadius: "12px",
        background: "#111827",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "800",
        boxShadow: "0 14px 28px rgba(15, 23, 42, 0.22)",
        marginTop: "2px",
    },

    defaultAccount: {
        marginTop: "22px",
        padding: "15px",
        borderRadius: "14px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
    },

    defaultTitle: {
        color: "#0f172a",
        fontSize: "13px",
        fontWeight: "800",
        marginBottom: "10px",
    },

    defaultRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: "8px",
        paddingBottom: "8px",
        borderTop: "1px solid #e2e8f0",
        color: "#64748b",
        fontSize: "13px",
    },

    cardFooter: {
        marginTop: "22px",
        color: "#94a3b8",
        fontSize: "12px",
        fontWeight: "600",
        textAlign: "center",
    },
};