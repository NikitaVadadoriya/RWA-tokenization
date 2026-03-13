"use client";
import { useState } from "react";

const steps = [
    { id: 1, title: "Personal Info", icon: "👤" },
    { id: 2, title: "Identity Document", icon: "🪪" },
    { id: 3, title: "Proof of Address", icon: "📄" },
    { id: 4, title: "Review & Submit", icon: "✅" },
];

export default function KYCPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        dateOfBirth: "",
        address: "",
        documentType: "passport" as "passport" | "national_id" | "drivers_license",
        documentFrontUrl: "",
        documentBackUrl: "",
        proofOfAddressUrl: "",
        selfieUrl: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch("/api/kyc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) setSubmitted(true);
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                <div className="card" style={{ maxWidth: 480, textAlign: "center", padding: "3rem" }}>
                    <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>🎉</div>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, marginBottom: "1rem" }}>KYC Submitted!</h2>
                    <p style={{ color: "var(--color-muted)", marginBottom: "2rem", lineHeight: 1.6 }}>
                        Your documents are under review. You&apos;ll be notified within 5–10 minutes once verified.
                    </p>
                    <a href="/investor/dashboard" className="btn btn-primary" style={{ width: "100%" }}>
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", padding: "2rem" }}>
            <div style={{ maxWidth: 620, margin: "0 auto" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    Identity Verification
                </h1>
                <p style={{ color: "var(--color-muted)", marginBottom: "2rem" }}>
                    Secure verification powered by your platform. Takes under 10 minutes.
                </p>

                {/* Stepper */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
                    {steps.map((s) => (
                        <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: "50%",
                                background: step >= s.id ? "var(--color-primary)" : "var(--color-surface-2)",
                                border: `2px solid ${step >= s.id ? "var(--color-primary)" : "var(--color-border)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
                                transition: "all 0.2s"
                            }}>
                                {step > s.id ? "✓" : s.icon}
                            </div>
                            <span style={{ fontSize: "0.7rem", color: step >= s.id ? "var(--color-text)" : "var(--color-muted)", textAlign: "center" }}>
                                {s.title}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="card">
                    {step === 1 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            <h2 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Personal Information</h2>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Date of Birth</label>
                                <input className="input" type="date" value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Residential Address</label>
                                <textarea className="input" rows={3} value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    style={{ resize: "vertical" }} />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            <h2 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Identity Document</h2>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Document Type</label>
                                <select className="input" value={formData.documentType}
                                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as typeof formData.documentType })}>
                                    <option value="passport">Passport</option>
                                    <option value="national_id">National ID Card</option>
                                    <option value="drivers_license">Driver&apos;s License</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Document Front URL (after upload)</label>
                                <input className="input" type="url" placeholder="https://..." value={formData.documentFrontUrl}
                                    onChange={(e) => setFormData({ ...formData, documentFrontUrl: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Document Back URL (optional)</label>
                                <input className="input" type="url" placeholder="https://..." value={formData.documentBackUrl}
                                    onChange={(e) => setFormData({ ...formData, documentBackUrl: e.target.value })} />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            <h2 style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Proof of Address</h2>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Proof of Address URL</label>
                                <input className="input" type="url" placeholder="Utility bill, bank statement..." value={formData.proofOfAddressUrl}
                                    onChange={(e) => setFormData({ ...formData, proofOfAddressUrl: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Selfie with Document URL</label>
                                <input className="input" type="url" placeholder="Photo with ID visible..." value={formData.selfieUrl}
                                    onChange={(e) => setFormData({ ...formData, selfieUrl: e.target.value })} />
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div>
                            <h2 style={{ fontWeight: 700, marginBottom: "1.5rem" }}>Review & Submit</h2>
                            {[
                                ["Date of Birth", formData.dateOfBirth],
                                ["Document Type", formData.documentType],
                                ["Address", formData.address],
                            ].map(([label, value]) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--color-border)" }}>
                                    <span style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>{label}</span>
                                    <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{value || "—"}</span>
                                </div>
                            ))}
                            <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginTop: "1.25rem", lineHeight: 1.6 }}>
                                By submitting, you confirm all provided information is accurate and complete. False information may result in account suspension.
                            </p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
                        {step > 1 && (
                            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
                                ← Back
                            </button>
                        )}
                        {step < 4 ? (
                            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} style={{ flex: 1 }}>
                                Continue →
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
                                {submitting ? "Submitting..." : "Submit for Review ✓"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
