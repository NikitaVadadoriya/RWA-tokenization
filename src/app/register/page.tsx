"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";

export default function RegisterPage() {
    const router = useRouter();
    const { walletAddress, connectWallet } = useWallet();
    const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirm) {
            setError("Passwords do not match");
            return;
        }

        if (!walletAddress) {
            setError("Please connect your MetaMask wallet to register");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: form.name, email: form.email, password: form.password, walletAddress }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed");
            router.push("/login?registered=true");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--gradient-dark)",
                padding: 24,
            }}
        >
            <div className="glass-card animate-fade-in-up" style={{ width: "100%", maxWidth: 440, padding: 40 }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            background: "var(--gradient-primary)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 22,
                            marginBottom: 16,
                        }}
                    >
                        R
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                        Create Your <span className="gradient-text">Account</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                        Start investing in real-world assets today
                    </p>
                </div>

                {error && (
                    <div
                        style={{
                            background: "rgba(244, 63, 94, 0.1)",
                            border: "1px solid rgba(244, 63, 94, 0.3)",
                            borderRadius: 10,
                            padding: "12px 16px",
                            marginBottom: 20,
                            color: "var(--accent-rose)",
                            fontSize: 14,
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                            Full Name
                        </label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="John Doe"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                            Email Address
                        </label>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="john@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                            Password
                        </label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Minimum 8 characters"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            minLength={8}
                        />
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                            Confirm Password
                        </label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Re-enter password"
                            value={form.confirm}
                            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: 24, padding: 16, background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 10 }}>
                        <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                            Web3 Identity
                        </label>
                        {walletAddress ? (
                            <div style={{ padding: "10px 14px", background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-emerald)", borderRadius: 8, fontSize: 13, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 8 }}>
                                <span>🟢</span> {walletAddress}
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={connectWallet}
                                className="btn-secondary"
                                style={{ width: "100%", padding: "10px", justifyContent: "center" }}
                            >
                                🦊 Connect MetaMask
                            </button>
                        )}
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                            One wallet per account. Required for receiving distributions and trading.
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="glow-btn"
                        disabled={loading}
                        style={{ width: "100%", justifyContent: "center", padding: "14px 32px", fontSize: 16 }}
                    >
                        {loading ? <span className="spinner" /> : "Create Account →"}
                    </button>
                </form>

                <p style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)", fontSize: 14 }}>
                    Already have an account?{" "}
                    <Link href="/login" style={{ color: "var(--accent-cyan)", textDecoration: "none" }}>
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
