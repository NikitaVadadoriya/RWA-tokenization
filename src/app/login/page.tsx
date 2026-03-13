"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email: form.email,
                password: form.password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password");
            } else {
                router.push("/investor/dashboard");
                router.refresh();
            }
        } catch {
            setError("An error occurred");
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
                        Welcome <span className="gradient-text">Back</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                        Sign in to manage your investments
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
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                            Password
                        </label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Enter your password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="glow-btn"
                        disabled={loading}
                        style={{ width: "100%", justifyContent: "center", padding: "14px 32px", fontSize: 16 }}
                    >
                        {loading ? <span className="spinner" /> : "Sign In →"}
                    </button>
                </form>

                <p style={{ textAlign: "center", marginTop: 24, color: "var(--text-muted)", fontSize: 14 }}>
                    Don&apos;t have an account?{" "}
                    <Link href="/register" style={{ color: "var(--accent-cyan)", textDecoration: "none" }}>
                        Create Account
                    </Link>
                </p>
            </div>
        </div>
    );
}
