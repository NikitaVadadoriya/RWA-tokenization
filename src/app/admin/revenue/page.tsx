"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/Navigation";

interface RevenueData {
    totalTradingFees: number;
    totalOriginationFees: number;
    totalManagementFees: number;
    totalRevenue: number;
    byAssetType: Record<string, { volume: number; fees: number; count: number }>;
    recentTransactions: {
        _id: string;
        type: string;
        totalAmount: number;
        fee: number;
        assetType: string;
        createdAt: string;
    }[];
}

const ASSET_ICONS: Record<string, string> = {
    real_estate: "🏢", bond: "📄", project: "🏗️", art: "🎨", metal: "🥇",
};

const ASSET_LABELS: Record<string, string> = {
    real_estate: "Real Estate", bond: "Bonds", project: "Infrastructure", art: "Fine Art", metal: "Precious Metals",
};

export default function AdminRevenuePage() {
    const [data, setData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch transactions and compute revenue
        fetch("/api/admin/transactions?limit=500")
            .then(r => r.json())
            .then(d => {
                const txs = d.transactions || [];

                // Compute revenue breakdown
                const tradingFees = txs.reduce((s: number, t: { fee: number }) => s + (t.fee || 0), 0);

                // Origination fees: estimate 3% of total purchase volume
                const purchaseVolume = txs
                    .filter((t: { type: string }) => t.type === "purchase")
                    .reduce((s: number, t: { totalAmount: number }) => s + t.totalAmount, 0);
                const originationFees = purchaseVolume * 0.03;

                // Management fees: estimate 1.5% of total AUM annually (simplified)
                const managementFees = purchaseVolume * 0.015;

                // By asset type
                const byAssetType: Record<string, { volume: number; fees: number; count: number }> = {};
                for (const tx of txs) {
                    const asset = tx.assetId as { assetType?: string } | undefined;
                    const at = asset?.assetType || "unknown";
                    if (!byAssetType[at]) byAssetType[at] = { volume: 0, fees: 0, count: 0 };
                    byAssetType[at].volume += tx.totalAmount || 0;
                    byAssetType[at].fees += tx.fee || 0;
                    byAssetType[at].count += 1;
                }

                setData({
                    totalTradingFees: tradingFees,
                    totalOriginationFees: originationFees,
                    totalManagementFees: managementFees,
                    totalRevenue: tradingFees + originationFees + managementFees,
                    byAssetType,
                    recentTransactions: txs.slice(0, 10).map((t: { _id: string; type: string; totalAmount: number; fee: number; assetId?: { assetType?: string }; createdAt: string }) => ({
                        _id: t._id,
                        type: t.type,
                        totalAmount: t.totalAmount,
                        fee: t.fee,
                        assetType: t.assetId?.assetType || "unknown",
                        createdAt: t.createdAt,
                    })),
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
                    Revenue <span className="gradient-text">Tracking</span>
                </h1>

                {loading || !data ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }} />
                    </div>
                ) : (
                    <>
                        {/* Revenue Overview */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Revenue</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-cyan)" }}>
                                    ${data.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Trading Fees</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-emerald)" }}>
                                    ${data.totalTradingFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>0.5% per trade</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Origination Fees</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-purple)" }}>
                                    ${data.totalOriginationFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>~3% of token sales</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Management Fees</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-amber)" }}>
                                    ${data.totalManagementFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>~1.5% of AUM/yr</div>
                            </div>
                        </div>

                        {/* Revenue by Asset Type */}
                        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                            <h2 style={{ fontWeight: 700, marginBottom: 20 }}>Revenue by Asset Type</h2>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                                {Object.entries(data.byAssetType).map(([type, stats]) => (
                                    <div key={type} style={{
                                        padding: 20, borderRadius: 12,
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid var(--border-color)",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                            <span style={{ fontSize: 22 }}>{ASSET_ICONS[type] || "📦"}</span>
                                            <span style={{ fontWeight: 700, fontSize: 14 }}>{ASSET_LABELS[type] || type}</span>
                                        </div>
                                        <div style={{ marginBottom: 8 }}>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Volume</div>
                                            <div style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>${stats.volume.toLocaleString()}</div>
                                        </div>
                                        <div style={{ marginBottom: 8 }}>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Fees</div>
                                            <div style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>${stats.fees.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Transactions</div>
                                            <div style={{ fontWeight: 700 }}>{stats.count}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Revenue-Generating Transactions */}
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
                                <h2 style={{ fontWeight: 700 }}>📊 Recent Transactions</h2>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Type</th><th>Asset</th><th>Amount</th><th>Fee</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                    {data.recentTransactions.map(tx => (
                                        <tr key={tx._id}>
                                            <td>
                                                <span className={`badge ${tx.type === "purchase" ? "badge-emerald" : tx.type === "sale" ? "badge-amber" : "badge-cyan"}`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td>{ASSET_ICONS[tx.assetType] || "📦"} {ASSET_LABELS[tx.assetType] || tx.assetType}</td>
                                            <td style={{ fontWeight: 700 }}>${tx.totalAmount.toLocaleString()}</td>
                                            <td style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>${tx.fee.toLocaleString()}</td>
                                            <td style={{ fontSize: 13 }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
