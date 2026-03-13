"use client";
import { useEffect, useState } from "react";

type KYCApplication = {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
        country: string;
    };
    documentType: string;
    documentFrontUrl: string;
    documentBackUrl?: string;
    proofOfAddressUrl?: string;
    selfieUrl?: string;
    createdAt: string;
    status: string;
};

export default function AdminKYCPage() {
    const [applications, setApplications] = useState<KYCApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchApplications = async () => {
        try {
            const res = await fetch("/api/admin/kyc");
            if (res.ok) {
                const data = await res.json();
                setApplications(data);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const handleAction = async (userId: string, status: "verified" | "rejected", reason?: string) => {
        setProcessingId(userId);
        try {
            const res = await fetch("/api/admin/kyc", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, status, rejectionReason: reason }),
            });
            if (res.ok) {
                setApplications((prev) => prev.filter((app) => app.userId._id !== userId));
            } else {
                alert("Failed to update status");
            }
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: "2rem", color: "var(--color-muted)" }}>
                Loading pending KYC applications...
            </div>
        );
    }

    return (
        <div style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                        KYC Review
                    </h1>
                    <p style={{ color: "var(--color-muted)" }}>{applications.length} applications pending review</p>
                </div>
            </div>

            {applications.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-muted)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text)", marginBottom: "0.5rem" }}>All caught up!</h3>
                    <p>There are no pending KYC applications to review.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {applications.map((app) => (
                        <div key={app._id} className="card" style={{ display: "flex", flexWrap: "wrap", gap: "2rem" }}>
                            {/* User Info */}
                            <div style={{ flex: "1 1 300px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--color-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: 600 }}>
                                        {app.userId.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 style={{ fontWeight: 600, fontSize: "1.1rem" }}>{app.userId.name}</h3>
                                        <div style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>{app.userId.email}</div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.9rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "var(--color-muted)" }}>Document Type:</span>
                                        <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{app.documentType.replace("_", " ")}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "var(--color-muted)" }}>Country:</span>
                                        <span style={{ fontWeight: 500 }}>{app.userId.country || "Not specified"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "var(--color-muted)" }}>Submitted On:</span>
                                        <span style={{ fontWeight: 500 }}>{new Date(app.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Documents */}
                            <div style={{ flex: "2 1 400px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                {app.documentFrontUrl && (
                                    <div>
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "0.25rem", display: "block" }}>ID Front</span>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={app.documentFrontUrl} alt="ID Front" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "0.5rem", border: "1px solid var(--color-border)" }} />
                                    </div>
                                )}
                                {app.documentBackUrl && (
                                    <div>
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "0.25rem", display: "block" }}>ID Back</span>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={app.documentBackUrl} alt="ID Back" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "0.5rem", border: "1px solid var(--color-border)" }} />
                                    </div>
                                )}
                                {app.proofOfAddressUrl && (
                                    <div>
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "0.25rem", display: "block" }}>Proof of Address</span>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={app.proofOfAddressUrl} alt="POA" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "0.5rem", border: "1px solid var(--color-border)" }} />
                                    </div>
                                )}
                                {app.selfieUrl && (
                                    <div>
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "0.25rem", display: "block" }}>Selfie Verification</span>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={app.selfieUrl} alt="Selfie" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "0.5rem", border: "1px solid var(--color-border)" }} />
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "0.75rem", justifyContent: "flex-end", borderLeft: "1px solid var(--color-border)", paddingLeft: "1.5rem" }}>
                                <button
                                    className="btn btn-primary"
                                    disabled={processingId === app.userId._id}
                                    onClick={() => handleAction(app.userId._id, "verified")}
                                    style={{ width: "100%", background: "var(--color-success)" }}
                                >
                                    Approve & Verify
                                </button>
                                <button
                                    className="btn btn-ghost"
                                    disabled={processingId === app.userId._id}
                                    onClick={() => {
                                        const reason = prompt("Enter rejection reason:");
                                        if (reason) handleAction(app.userId._id, "rejected", reason);
                                    }}
                                    style={{ width: "100%", color: "var(--color-danger)" }}
                                >
                                    Reject Application
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
