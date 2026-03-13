"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function KYCPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        documentType: "passport",
        documentUrl: "",
        proofOfAddress: "",
        tier: "retail",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/kyc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStep(4);
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
            <div className="glass-card animate-fade-in-up" style={{ width: "100%", maxWidth: 520, padding: 40 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>
                    KYC <span className="gradient-text">Verification</span>
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", marginBottom: 32 }}>
                    Complete identity verification to start investing
                </p>

                {/* Progress */}
                <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            style={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                                background: s <= step ? "var(--accent-cyan)" : "var(--border-color)",
                                transition: "all 0.3s",
                            }}
                        />
                    ))}
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

                {step === 1 && (
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Step 1: Document Type</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                            {[
                                { value: "passport", label: "🛂 Passport" },
                                { value: "national_id", label: "🪪 National ID" },
                                { value: "drivers_license", label: "🚗 Driver's License" },
                            ].map((opt) => (
                                <label
                                    key={opt.value}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "14px 16px",
                                        borderRadius: 10,
                                        border: `1px solid ${form.documentType === opt.value ? "var(--accent-cyan)" : "var(--border-color)"}`,
                                        background: form.documentType === opt.value ? "rgba(6, 182, 212, 0.05)" : "transparent",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="docType"
                                        value={opt.value}
                                        checked={form.documentType === opt.value}
                                        onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                                        style={{ accentColor: "var(--accent-cyan)" }}
                                    />
                                    <span style={{ fontSize: 15 }}>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                        <button className="glow-btn" onClick={() => setStep(2)} style={{ width: "100%", justifyContent: "center" }}>
                            Continue →
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Step 2: Upload Documents</h3>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                                Government ID Photo
                            </label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Upload or paste document URL"
                                value={form.documentUrl}
                                onChange={(e) => setForm({ ...form, documentUrl: e.target.value })}
                            />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "var(--text-secondary)" }}>
                                Proof of Address
                            </label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Utility bill or bank statement URL"
                                value={form.proofOfAddress}
                                onChange={(e) => setForm({ ...form, proofOfAddress: e.target.value })}
                            />
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <button className="btn-secondary" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: "center" }}>
                                ← Back
                            </button>
                            <button className="glow-btn" onClick={() => setStep(3)} style={{ flex: 1, justifyContent: "center" }}>
                                Continue →
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Step 3: Investor Tier</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                            {[
                                { value: "retail", label: "🏠 Retail Investor", desc: "Up to $50,000 investments" },
                                { value: "accredited", label: "⭐ Accredited Investor", desc: "Up to $500,000 investments" },
                                { value: "institutional", label: "🏦 Institutional", desc: "Unlimited investments" },
                            ].map((opt) => (
                                <label
                                    key={opt.value}
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: 12,
                                        padding: "14px 16px",
                                        borderRadius: 10,
                                        border: `1px solid ${form.tier === opt.value ? "var(--accent-cyan)" : "var(--border-color)"}`,
                                        background: form.tier === opt.value ? "rgba(6, 182, 212, 0.05)" : "transparent",
                                        cursor: "pointer",
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="tier"
                                        value={opt.value}
                                        checked={form.tier === opt.value}
                                        onChange={(e) => setForm({ ...form, tier: e.target.value })}
                                        style={{ accentColor: "var(--accent-cyan)", marginTop: 2 }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{opt.label}</div>
                                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{opt.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <button className="btn-secondary" onClick={() => setStep(2)} style={{ flex: 1, justifyContent: "center" }}>
                                ← Back
                            </button>
                            <button
                                className="glow-btn"
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{ flex: 1, justifyContent: "center" }}
                            >
                                {loading ? <span className="spinner" /> : "Submit KYC →"}
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>KYC Submitted!</h3>
                        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
                            Your documents are being reviewed. This typically takes 5-10 minutes.
                        </p>
                        <button className="glow-btn" onClick={() => router.push("/investor/marketplace")} style={{ justifyContent: "center" }}>
                            Browse Marketplace →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
