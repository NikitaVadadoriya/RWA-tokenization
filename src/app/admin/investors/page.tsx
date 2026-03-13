"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminSidebar } from "@/components/Navigation";

interface KYCRecord {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
        kycStatus: string;
        investorTier: string;
    };
    documentType: string;
    status: string;
    tier: string;
    amlFlags: string[];
    submittedAt: string;
    reviewedAt?: string;
    reviewNotes?: string;
}

export default function AdminInvestorsPage() {
    const [records, setRecords] = useState<KYCRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchKYC();
    }, []);

    const fetchKYC = async () => {
        const res = await fetch("/api/admin/kyc");
        const data = await res.json();
        setRecords(data.kycRecords || []);
        setLoading(false);
    };

    const handleReview = async (kycId: string, status: "approved" | "rejected") => {
        setProcessing(kycId);
        await fetch("/api/admin/kyc", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kycId, status, reviewNotes: `${status} by admin` }),
        });
        setProcessing(null);
        fetchKYC();
    };

    const pending = records.filter((r) => r.status === "pending");
    const reviewed = records.filter((r) => r.status !== "pending");

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <AdminSidebar />

            <div style={{ flex: 1, padding: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 32 }}>
                    Investor <span className="gradient-text">Management</span>
                </h1>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>
                ) : (
                    <>
                        {/* Pending KYC */}
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
                                <h2 style={{ fontWeight: 700 }}>⏳ Pending KYC Reviews</h2>
                                <span className="badge badge-amber">{pending.length}</span>
                            </div>
                            {pending.length === 0 ? (
                                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No pending reviews ✅</div>
                            ) : (
                                <table className="data-table">
                                    <thead><tr><th>Investor</th><th>Email</th><th>Document</th><th>Tier</th><th>Submitted</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {pending.map((r) => (
                                            <tr key={r._id}>
                                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.userId?.name}</td>
                                                <td>{r.userId?.email}</td>
                                                <td><span className="badge badge-cyan">{r.documentType.replace("_", " ")}</span></td>
                                                <td><span className="badge badge-purple">{r.tier}</span></td>
                                                <td style={{ fontSize: 13 }}>{new Date(r.submittedAt).toLocaleDateString()}</td>
                                                <td>
                                                    <div style={{ display: "flex", gap: 8 }}>
                                                        <button
                                                            onClick={() => handleReview(r._id, "approved")}
                                                            disabled={processing === r._id}
                                                            style={{ padding: "6px 16px", borderRadius: 6, background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                                                        >
                                                            {processing === r._id ? "..." : "✓ Approve"}
                                                        </button>
                                                        <button
                                                            onClick={() => handleReview(r._id, "rejected")}
                                                            disabled={processing === r._id}
                                                            style={{ padding: "6px 16px", borderRadius: 6, background: "rgba(244, 63, 94, 0.15)", color: "var(--accent-rose)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                                                        >
                                                            ✕ Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Reviewed */}
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
                                <h2 style={{ fontWeight: 700 }}>✅ Reviewed</h2>
                            </div>
                            {reviewed.length === 0 ? (
                                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No reviewed submissions yet</div>
                            ) : (
                                <table className="data-table">
                                    <thead><tr><th>Investor</th><th>Email</th><th>Status</th><th>Tier</th><th>Reviewed</th></tr></thead>
                                    <tbody>
                                        {reviewed.map((r) => (
                                            <tr key={r._id}>
                                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.userId?.name}</td>
                                                <td>{r.userId?.email}</td>
                                                <td>
                                                    <span className={`badge ${r.status === "approved" ? "badge-emerald" : "badge-rose"}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td><span className="badge badge-purple">{r.tier}</span></td>
                                                <td style={{ fontSize: 13 }}>{r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
