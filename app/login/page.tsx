"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
    const router = useRouter();
    const params = useSearchParams();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const result = await signIn("credentials", { ...form, redirect: false });
        if (result?.error) {
            setError("Invalid email or password");
            setLoading(false);
        } else {
            const session = await getSession();
            if ((session?.user as any)?.role === "admin") {
                router.push("/admin/dashboard");
            } else {
                router.push("/investor/dashboard");
            }
        }
    };

    return (
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div style={{ width: "100%", maxWidth: 420 }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14, margin: "0 auto 1rem",
                        background: "linear-gradient(135deg, var(--color-primary), var(--color-gold))",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                    }}>⬡</div>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", fontWeight: 700 }}>Welcome Back</h1>
                    {params.get("registered") && (
                        <div style={{ marginTop: "0.75rem", background: "oklch(0.72 0.18 145 / 0.15)", border: "1px solid oklch(0.72 0.18 145 / 0.3)", borderRadius: 8, padding: "0.6rem 1rem", color: "var(--color-success)", fontSize: "0.9rem" }}>
                            ✓ Account created! Sign in to continue.
                        </div>
                    )}
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {(["Email", "Password"] as const).map((label) => {
                            const key = label.toLowerCase() as "email" | "password";
                            return (
                                <div key={key}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>{label}</label>
                                    <input className="input" type={key === "password" ? "password" : "email"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
                                </div>
                            );
                        })}

                        {error && (
                            <div style={{ background: "oklch(0.65 0.2 25 / 0.15)", border: "1px solid oklch(0.65 0.2 25 / 0.3)", borderRadius: 8, padding: "0.75rem", color: "var(--color-danger)", fontSize: "0.9rem" }}>{error}</div>
                        )}

                        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", padding: "0.875rem" }}>
                            {loading ? "Signing In..." : "Sign In →"}
                        </button>
                    </form>
                    <p style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--color-muted)", fontSize: "0.9rem" }}>
                        New investor?{" "}
                        <Link href="/register" style={{ color: "var(--color-primary)", fontWeight: 600 }}>Create account</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
