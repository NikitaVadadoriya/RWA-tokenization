"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { InvestorSidebar } from "@/components/Navigation";
import { useWallet } from "@/components/WalletProvider";

interface Holding {
    assetId: string;
    assetName: string;
    assetType: string;
    tokensOwned: number;
    tokensListedForSale: number;
    currentPrice: number;
    totalInvested: number;
    totalIncome: number;
    location: string;
    expectedYield: number;
}

const TYPE_ICONS: Record<string, string> = {
    real_estate: "🏢", bond: "📄", project: "🏗️", art: "🎨", metal: "🥇",
};
const TYPE_COLORS: Record<string, string> = {
    real_estate: "#06b6d4", bond: "#8b5cf6", project: "#f59e0b", art: "#ec4899", metal: "#eab308",
};

export default function PortfolioPage() {
    const { walletAddress, connectWallet } = useWallet();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalValue, setTotalValue] = useState(0);
    const [totalIncome, setTotalIncome] = useState(0);

    useEffect(() => {
        fetch("/api/portfolio")
            .then((r) => r.json())
            .then((d) => {
                setHoldings(d.holdings || []);
                setTotalValue(d.totalValue || 0);
                setTotalIncome(d.totalIncome || 0);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <InvestorSidebar />

            <div style={{ flex: 1, padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800 }}>
                        My <span className="gradient-text">Portfolio</span>
                    </h1>
                    {!walletAddress && (
                        <button onClick={connectWallet} style={{
                            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: "rgba(245, 158, 11, 0.12)", color: "var(--accent-amber)",
                            border: "1px solid rgba(245,158,11,0.3)", cursor: "pointer",
                        }}>
                            🦊 Connect Wallet
                        </button>
                    )}
                </div>
                <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>All your tokenized asset holdings • Sell tokens on the secondary market</p>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }} />
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Value</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent-cyan)" }}>${totalValue.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Income Earned</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent-emerald)" }}>${totalIncome.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Active Holdings</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--accent-purple)" }}>{holdings.length}</div>
                            </div>
                        </div>

                        {/* Holdings Cards */}
                        {holdings.length === 0 ? (
                            <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                                <div style={{ fontSize: 56, marginBottom: 16 }}>💼</div>
                                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Holdings Yet</h3>
                                <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>Start investing to build your portfolio</p>
                                <Link href="/investor/marketplace" className="glow-btn">Browse Marketplace →</Link>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
                                {holdings.map((h, i) => (
                                    <div key={i} className="glass-card" style={{ padding: 24 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${TYPE_COLORS[h.assetType]}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                                                {TYPE_ICONS[h.assetType]}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: 16 }}>{h.assetName}</div>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{h.location}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                                            <div>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Available Tokens</div>
                                                <div style={{ fontWeight: 700 }}>{h.tokensOwned.toLocaleString()}</div>
                                                {h.tokensListedForSale > 0 && (
                                                    <div style={{ fontSize: 11, color: "var(--accent-amber)", marginTop: 2 }}>📋 {h.tokensListedForSale} listed for sale</div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Current Value</div>
                                                <div style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>${(h.tokensOwned * h.currentPrice).toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Income Earned</div>
                                                <div style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>${h.totalIncome.toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Expected Yield</div>
                                                <div style={{ fontWeight: 700, color: "var(--accent-amber)" }}>{h.expectedYield}%</div>
                                            </div>
                                        </div>

                                        {/* Sell on Market Button — only if user has available tokens */}
                                        {h.tokensOwned > 0 && (
                                            <Link
                                                href={`/investor/trade?sell=${h.assetId}&tokens=${h.tokensOwned}`}
                                                style={{
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                                    padding: "10px 0", borderRadius: 8, width: "100%",
                                                    background: "rgba(244, 63, 94, 0.1)",
                                                    border: "1px solid rgba(244, 63, 94, 0.25)",
                                                    color: "var(--accent-rose)", fontWeight: 600, fontSize: 13,
                                                    textDecoration: "none", cursor: "pointer", transition: "all 0.2s",
                                                }}
                                            >
                                                📉 Sell on Secondary Market ({h.tokensOwned} available)
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
