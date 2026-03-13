"use client";

import { useState, useEffect } from "react";
import { InvestorSidebar } from "@/components/Navigation";

interface Transaction {
    _id: string;
    assetId: {
        _id: string;
        name: string;
        assetType: string;
        tokenPrice: number;
        contractAddress?: string;
    };
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

const ASSET_ICONS: Record<string, string> = {
    real_estate: "🏢", bond: "📄", project: "🏗️", art: "🎨", metal: "🥇",
};

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetch("/api/transactions")
            .then((r) => r.json())
            .then((d) => {
                setTransactions(d.transactions || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

    const totalInvested = transactions.filter(t => t.type === "purchase").reduce((s, t) => s + t.totalAmount, 0);
    const totalSold = transactions.filter(t => t.type === "sale").reduce((s, t) => s + t.totalAmount, 0);
    const totalDistributions = transactions.filter(t => t.type === "distribution").reduce((s, t) => s + t.totalAmount, 0);

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <InvestorSidebar />

            <div style={{ flex: 1, padding: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
                    Transaction <span className="gradient-text">History</span>
                </h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>Complete record of all your platform activity</p>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }} />
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Transactions</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-cyan)" }}>{transactions.length}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Invested</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-emerald)" }}>${totalInvested.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Sold</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-amber)" }}>${totalSold.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Income Received</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-purple)" }}>${totalDistributions.toLocaleString()}</div>
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

                        {/* Transactions Table */}
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                            {filtered.length === 0 ? (
                                <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                                    <p>No transactions found</p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Asset</th>
                                            <th>Quantity</th>
                                            <th>Price/Token</th>
                                            <th>Total</th>
                                            <th>Fee</th>
                                            <th>Status</th>
                                            <th>TX Hash</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((tx) => {
                                            const style = TYPE_STYLES[tx.type] || TYPE_STYLES.purchase;
                                            return (
                                                <tr key={tx._id}>
                                                    <td>
                                                        <span className="badge" style={{ background: `${style.color}20`, color: style.color }}>
                                                            {style.icon} {style.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                                        {ASSET_ICONS[tx.assetId?.assetType] || "📦"} {tx.assetId?.name || "Unknown"}
                                                    </td>
                                                    <td>{tx.quantity.toLocaleString()}</td>
                                                    <td>${tx.pricePerToken.toLocaleString()}</td>
                                                    <td style={{ fontWeight: 700, color: style.color }}>
                                                        ${tx.totalAmount.toLocaleString()}
                                                    </td>
                                                    <td style={{ color: "var(--text-muted)" }}>${tx.fee.toLocaleString()}</td>
                                                    <td>
                                                        <span className={`badge ${tx.status === "confirmed" ? "badge-emerald" : tx.status === "failed" ? "badge-rose" : "badge-amber"}`}>
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>
                                                        {tx.txHash ? (
                                                            <a
                                                                href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: "var(--accent-cyan)" }}
                                                            >
                                                                {tx.txHash.slice(0, 10)}...
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: "var(--text-muted)" }}>—</span>
                                                        )}
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
