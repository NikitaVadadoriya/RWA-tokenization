"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/Navigation";

interface Transaction {
    _id: string;
    userId: { _id: string; name: string; email: string; walletAddress?: string };
    assetId: { _id: string; name: string; assetType: string; tokenPrice: number; contractAddress?: string };
    type: "purchase" | "sale" | "distribution" | "transfer";
    quantity: number;
    pricePerToken: number;
    totalAmount: number;
    fee: number;
    txHash?: string;
    status: string;
    createdAt: string;
}

const TYPE_STYLES: Record<string, { icon: string; color: string; label: string }> = {
    purchase: { icon: "🛒", color: "var(--accent-emerald)", label: "Purchase" },
    sale: { icon: "💰", color: "var(--accent-amber)", label: "Sale" },
    distribution: { icon: "💸", color: "var(--accent-cyan)", label: "Distribution" },
    transfer: { icon: "↔️", color: "var(--accent-purple)", label: "Transfer" },
};

export default function AdminTransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState({ count: 0, totalVolume: 0, totalFees: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetchTransactions();
    }, [filter]);

    const fetchTransactions = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filter !== "all") params.set("type", filter);
        const res = await fetch(`/api/admin/transactions?${params}`);
        const data = await res.json();
        setTransactions(data.transactions || []);
        setStats(data.stats || { count: 0, totalVolume: 0, totalFees: 0 });
        setLoading(false);
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <AdminSidebar />

            <div style={{ flex: 1, padding: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 32 }}>
                    Transaction <span className="gradient-text">Monitoring</span>
                </h1>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }} />
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Transactions</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-cyan)" }}>{stats.count}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Volume</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-emerald)" }}>${stats.totalVolume.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Fees Collected</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-amber)" }}>${stats.totalFees.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>On-Chain TXs</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-purple)" }}>
                                    {transactions.filter(t => t.txHash).length}
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                            {[
                                { key: "all", label: "All" },
                                { key: "purchase", label: "🛒 Purchases" },
                                { key: "sale", label: "💰 Sales" },
                                { key: "distribution", label: "💸 Distributions" },
                                { key: "transfer", label: "↔️ Transfers" },
                            ].map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={filter === f.key ? "glow-btn" : "btn-secondary"}
                                    style={{ padding: "8px 16px", fontSize: 13 }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Table */}
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                            {transactions.length === 0 ? (
                                <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                                    <p>No transactions found</p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Investor</th>
                                            <th>Asset</th>
                                            <th>Qty</th>
                                            <th>Total</th>
                                            <th>Fee</th>
                                            <th>Status</th>
                                            <th>TX Hash</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx) => {
                                            const style = TYPE_STYLES[tx.type] || TYPE_STYLES.purchase;
                                            const isLargeAmount = tx.totalAmount > 50000;
                                            return (
                                                <tr key={tx._id} style={isLargeAmount ? { background: "rgba(244,63,94,0.04)" } : undefined}>
                                                    <td>
                                                        <span className="badge" style={{ background: `${style.color}20`, color: style.color }}>
                                                            {style.icon} {style.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{tx.userId?.name || "Unknown"}</div>
                                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{tx.userId?.email}</div>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{tx.assetId?.name || "Unknown"}</td>
                                                    <td>{tx.quantity.toLocaleString()}</td>
                                                    <td style={{ fontWeight: 700, color: style.color }}>
                                                        ${tx.totalAmount.toLocaleString()}
                                                        {isLargeAmount && <span style={{ marginLeft: 6, fontSize: 11, color: "var(--accent-rose)" }}>⚠️</span>}
                                                    </td>
                                                    <td style={{ color: "var(--text-muted)" }}>${tx.fee.toLocaleString()}</td>
                                                    <td>
                                                        <span className={`badge ${tx.status === "confirmed" ? "badge-emerald" : tx.status === "failed" ? "badge-rose" : "badge-amber"}`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>
                                                        {tx.txHash ? (
                                                            <a href={`https://sepolia.etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)" }}>
                                                                {tx.txHash.slice(0, 10)}...
                                                            </a>
                                                        ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                                    </td>
                                                    <td style={{ fontSize: 13 }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                                </tr>
                                            );
                                        })}
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
