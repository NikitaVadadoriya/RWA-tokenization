"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminSidebar } from "@/components/Navigation";

interface Stats {
    totalInvestors: number;
    totalAssets: number;
    pendingKYC: number;
    totalValue: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({ totalInvestors: 0, totalAssets: 0, pendingKYC: 0, totalValue: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch aggregate stats
        Promise.all([
            fetch("/api/assets?status=all").then((r) => r.json()),
            fetch("/api/admin/kyc").then((r) => r.json()),
        ])
            .then(([assetsData, kycData]) => {
                const assets = assetsData.assets || [];
                const kycs = kycData.kycRecords || [];
                setStats({
                    totalAssets: assets.length,
                    totalValue: assets.reduce((sum: number, a: { totalTokens: number; tokenPrice: number }) => sum + a.totalTokens * a.tokenPrice, 0),
                    totalInvestors: kycs.length,
                    pendingKYC: kycs.filter((k: { status: string }) => k.status === "pending").length,
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <AdminSidebar />

            <div style={{ flex: 1, padding: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 32 }}>
                    Admin <span className="gradient-text">Dashboard</span>
                </h1>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>
                ) : (
                    <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
                            {[
                                { icon: "🏢", label: "Total Assets", value: stats.totalAssets.toString(), color: "var(--accent-cyan)" },
                                { icon: "💰", label: "Total Value", value: `$${stats.totalValue.toLocaleString()}`, color: "var(--accent-emerald)" },
                                { icon: "👥", label: "KYC Submissions", value: stats.totalInvestors.toString(), color: "var(--accent-purple)" },
                                { icon: "⏳", label: "Pending KYC", value: stats.pendingKYC.toString(), color: "var(--accent-amber)" },
                            ].map((s, i) => (
                                <div key={i} className="stat-card">
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                                        <span style={{ fontSize: 24 }}>{s.icon}</span>
                                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</span>
                                    </div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                                <Link href="/admin/assets" className="btn-secondary" style={{ justifyContent: "center" }}>🏢 Manage Assets</Link>
                                <Link href="/admin/investors" className="btn-secondary" style={{ justifyContent: "center" }}>👥 Review KYC</Link>
                                <Link href="/investor/marketplace" className="btn-secondary" style={{ justifyContent: "center" }}>🛒 View Marketplace</Link>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
