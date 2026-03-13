"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { InvestorSidebar } from "@/components/Navigation";
import { useSession } from "next-auth/react";
import { useWallet } from "@/components/WalletProvider";

interface Holding {
    assetId: string;
    assetName: string;
    assetType: string;
    tokensOwned: number;
    currentPrice: number;
    totalInvested: number;
    totalIncome: number;
    expectedYield: number;
}

interface PortfolioData {
    holdings: Holding[];
    totalValue: number;
    totalIncome: number;
    transactionCount: number;
}

const TYPE_ICONS: Record<string, string> = {
    real_estate: "🏢", bond: "📄", project: "🏗️", art: "🎨", metal: "🥇",
};

export default function DashboardPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<PortfolioData | null>(null);
    const [loading, setLoading] = useState(true);
    const { walletAddress, connectWallet, disconnectWallet } = useWallet();
    const [walletBalance, setWalletBalance] = useState("0.0000");
    const [chainId, setChainId] = useState("");

    useEffect(() => {
        fetch("/api/portfolio")
            .then((r) => r.json())
            .then((d) => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Effect to update balance when wallet changes
    useEffect(() => {
        if (!walletAddress) {
            setWalletBalance("0.0000");
            setChainId("");
            return;
        }

        const fetchWalletDetails = async () => {
            try {
                const w = window as unknown as Record<string, unknown>;
                if (!w.ethereum) return;

                const ethereum = w.ethereum as {
                    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
                };

                const balance = (await ethereum.request({
                    method: "eth_getBalance",
                    params: [walletAddress, "latest"],
                })) as string;
                const ethBalance = parseInt(balance, 16) / 1e18;
                setWalletBalance(ethBalance.toFixed(4));

                const chain = (await ethereum.request({ method: "eth_chainId" })) as string;
                setChainId(chain);
            } catch (err) {
                console.error("Failed to fetch wallet details", err);
            }
        };

        fetchWalletDetails();
    }, [walletAddress]);

    const getNetworkName = (id: string) => {
        const networks: Record<string, string> = {
            "0x1": "Ethereum Mainnet",
            "0xaa36a7": "Sepolia Testnet",
            "0x89": "Polygon",
            "0x13882": "Polygon Amoy",
        };
        return networks[id] || `Chain ${parseInt(id, 16)}`;
    };

    const totalValue = data?.totalValue || 0;
    const totalIncome = data?.totalIncome || 0;
    const holdings = data?.holdings || [];

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <InvestorSidebar />

            {/* Main */}
            <div style={{ flex: 1, padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: 32, fontWeight: 800 }}>
                            Investor <span className="gradient-text">Dashboard</span>
                        </h1>
                        {session?.user && (
                            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
                                Welcome back, {(session.user as unknown as Record<string, unknown>).name as string}
                            </p>
                        )}
                    </div>
                </div>

                {/* Wallet Connection Card */}
                <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                    {walletAddress ? (
                        <>
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                                    🦊
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Connected Wallet</div>
                                    <a
                                        href={`https://sepolia.etherscan.io/address/${walletAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontFamily: "monospace", color: "var(--accent-cyan)", fontSize: 14, textDecoration: "none" }}
                                    >
                                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} ↗
                                    </a>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Balance</div>
                                    <div style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>{walletBalance} ETH</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Network</div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                        <span style={{ color: chainId === "0xaa36a7" ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
                                            {chainId === "0xaa36a7" ? "🟢" : "🟡"} {getNetworkName(chainId)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={disconnectWallet}
                                    className="btn-secondary"
                                    style={{ padding: "6px 12px", fontSize: 12, marginLeft: 16 }}
                                >
                                    ✕ Disconnect
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 28 }}>🦊</span>
                                <div>
                                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Connect Your Wallet</div>
                                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Connect MetaMask to invest and track on-chain tokens</div>
                                </div>
                            </div>
                            <button
                                onClick={connectWallet}
                                className="glow-btn"
                                style={{ padding: "10px 24px", fontSize: 14 }}
                            >
                                🦊 Connect MetaMask
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }} />
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
                            {[
                                { label: "Portfolio Value", value: `$${totalValue.toLocaleString()}`, color: "var(--accent-cyan)", icon: "💰" },
                                { label: "Total Income", value: `$${totalIncome.toLocaleString()}`, color: "var(--accent-emerald)", icon: "📈" },
                                { label: "Holdings", value: holdings.length.toString(), color: "var(--accent-purple)", icon: "💼" },
                                { label: "Transactions", value: (data?.transactionCount || 0).toString(), color: "var(--accent-amber)", icon: "🔄" },
                            ].map((stat, i) => (
                                <div key={i} className="stat-card">
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                        <span style={{ fontSize: 24 }}>{stat.icon}</span>
                                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{stat.label}</span>
                                    </div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Holdings Table */}
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Your Holdings</h2>
                            </div>
                            {holdings.length === 0 ? (
                                <div style={{ padding: 48, textAlign: "center" }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>💼</div>
                                    <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No Holdings Yet</h3>
                                    <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>Start investing to build your portfolio</p>
                                    <Link href="/investor/marketplace" className="glow-btn" style={{ fontSize: 14 }}>Browse Marketplace →</Link>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Asset</th>
                                            <th>Type</th>
                                            <th>Tokens</th>
                                            <th>Price</th>
                                            <th>Value</th>
                                            <th>Income</th>
                                            <th>Yield</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holdings.map((h, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{h.assetName}</td>
                                                <td>
                                                    <span className="badge badge-cyan">
                                                        {TYPE_ICONS[h.assetType]} {h.assetType.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td>{h.tokensOwned.toLocaleString()}</td>
                                                <td>${h.currentPrice}</td>
                                                <td style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                                                    ${(h.tokensOwned * h.currentPrice).toLocaleString()}
                                                </td>
                                                <td style={{ color: "var(--accent-emerald)" }}>${h.totalIncome.toLocaleString()}</td>
                                                <td style={{ color: "var(--accent-amber)" }}>{h.expectedYield}%</td>
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
