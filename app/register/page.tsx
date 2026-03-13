"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: "", email: "", password: "", country: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed");
            router.push("/login?registered=1");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const field = (label: string, key: keyof typeof form, type = "text") => (
        <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>
                {label}
            </label>
            <input
                className="input"
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key !== "country"}
            />
        </div>
    );

    return (
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div style={{ width: "100%", maxWidth: 440 }}>
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14, margin: "0 auto 1rem",
                        background: "linear-gradient(135deg, var(--color-primary), var(--color-gold))",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                    }}>⬡</div>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 700 }}>
                        Create Account
                    </h1>
                    <p style={{ color: "var(--color-muted)", marginTop: "0.35rem" }}>
                        Build your real-world asset portfolio
                    </p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {field("Full Name", "name")}
                        {field("Email Address", "email", "email")}
                        {field("Password (min. 8 chars)", "password", "password")}
                        {field("Country (optional)", "country")}

                        {error && (
                            <div style={{
                                background: "oklch(0.65 0.2 25 / 0.15)", border: "1px solid oklch(0.65 0.2 25 / 0.3)",
                                borderRadius: 8, padding: "0.75rem 1rem", color: "var(--color-danger)", fontSize: "0.9rem"
                            }}>{error}</div>
                        )}

                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: "0.875rem" }}>
                            {loading ? "Creating Account..." : "Create Account →"}
                        </button>
                    </form>

                    <p style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--color-muted)", fontSize: "0.9rem" }}>
                        Already have an account?{" "}
                        <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Sign in</Link>
                    </p>
                </div>

                <p style={{ color: "var(--color-muted)", fontSize: "0.8rem", textAlign: "center", marginTop: "1rem" }}>
                    You&apos;ll complete KYC verification after registration. Takes ~10 minutes.
                </p>
            </div>
        </main>
    );
}
