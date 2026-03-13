"use client";

import { useState, useEffect } from "react";
import { InvestorSidebar } from "@/components/Navigation";
import { useWallet } from "@/components/WalletProvider";
import { ethers } from "ethers";

declare global {
    interface Window {
        ethereum?: any;
    }
}

interface Distribution {
    _id: string;
    assetId: {
        _id: string;
        name: string;
        assetType: string;
        tokenPrice: number;
        contractAddress?: string;
        incomeDistributorAddress?: string;
    };
    totalAmount: number;
    schedule: string;
    onChainId?: number;
    description: string;
    status: string;
    txHash?: string;
    distributedAt?: string;
    createdAt: string;
}


const ASSET_ICONS: Record<string, string> = {
    real_estate: "🏢", bond: "📄", project: "🏗️", art: "🎨", metal: "🥇",
};

const SCHEDULE_LABELS: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    on_completion: "On Completion",
    on_sale: "On Sale",
};

export default function InvestorDistributionsPage() {
    const { walletAddress, connectWallet } = useWallet();
    const [distributions, setDistributions] = useState<Distribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    const [claimableAmounts, setClaimableAmounts] = useState<Record<number, string>>({});

    useEffect(() => {
        fetch("/api/investor/distributions")
            .then((r) => r.json())
            .then((d) => {
                setDistributions(d.distributions || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!walletAddress || distributions.length === 0 || !window.ethereum) return;

        const fetchClaimable = async () => {
            try {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const amounts: Record<number, string> = {};

                for (let i = 0; i < distributions.length; i++) {
                    const dist = distributions[i];
                    const incomeDistAddr = dist.assetId?.incomeDistributorAddress;
                    if (!incomeDistAddr) continue;

                    const contract = new ethers.Contract(
                        incomeDistAddr,
                        ["function getClaimableAmount(uint256 distributionId, address investor) view returns (uint256)"],
                        provider
                    );

                    const onChainId = dist.onChainId ?? i;
                    try {
                        const amountWei = await contract.getClaimableAmount(onChainId, walletAddress);
                        if (amountWei > BigInt(0)) {
                            amounts[onChainId] = ethers.formatEther(amountWei);
                        }
                    } catch (e) {
                        console.warn("Contract missing getClaimableAmount or distribution failed:", e);
                    }
                }
                setClaimableAmounts(amounts);
            } catch (err) {
                console.error("Failed to setup contract for claimable amounts", err);
            }
        };

        fetchClaimable();
    }, [distributions, walletAddress]);

    // connectWallet is now handled by the global WalletProvider

    const handleClaim = async (distributionId: number) => {
        if (!walletAddress) {
            setMessage("❌ Please connect your wallet first");
            return;
        }
        setClaiming(String(distributionId));
        setMessage("");
        try {
            if (!window.ethereum) throw new Error("MetaMask not found");

            setMessage(`⏳ Step 1/2: Please confirm the claim transaction in MetaMask...`);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Find the distribution to get the asset's IncomeDistributor address
            const dist = distributions.find(d => (d.onChainId ?? distributions.indexOf(d)) === distributionId);
            const incomeDistAddr = dist?.assetId?.incomeDistributorAddress;
            if (!incomeDistAddr) {
                throw new Error("This distribution's asset does not have an IncomeDistributor contract.");
            }

            const INCOME_DISTRIBUTOR_ABI = [
                "function claimIncome(uint256 distributionId)"
            ];

            const contract = new ethers.Contract(incomeDistAddr, INCOME_DISTRIBUTOR_ABI, signer);
            const tx = await contract.claimIncome(distributionId);

            setMessage(`⏳ Step 2/2: Waiting for on-chain confirmation... (TX: ${tx.hash.slice(0, 10)}...)`);
            await tx.wait();

            setMessage(`✅ Successfully claimed income on-chain!`);

            // Log transaction in database
            const assetId = distributions.find(d => (d.onChainId ?? distributions.indexOf(d)) === distributionId)?.assetId?._id;
            if (assetId) {
                await fetch("/api/transactions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        assetId,
                        amount: Number(claimableAmounts[distributionId] || 0),
                        txHash: tx.hash,
                    }),
                });
            }

            // Remove from claimable amounts
            setClaimableAmounts(prev => {
                const updated = { ...prev };
                delete updated[distributionId];
                return updated;
            });
        } catch (error: unknown) {
            setMessage(`❌ Claim failed: ${error instanceof Error ? error.message : "Transaction rejected"}`);
        }
        setClaiming(null);
    };

    const totalIncome = distributions.reduce((s, d) => s + d.totalAmount, 0);
    const completedCount = distributions.filter(d => d.status === "completed").length;

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <InvestorSidebar />

            <div style={{ flex: 1, padding: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
                    Income <span className="gradient-text">Distributions</span>
                </h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>Track and claim your investment income</p>

                {message && (
                    <div className="glass-card" style={{
                        padding: 16, marginBottom: 20,
                        borderLeft: message.startsWith("✅") ? "3px solid var(--accent-emerald)" : message.startsWith("ℹ️") ? "3px solid var(--accent-cyan)" : "3px solid var(--accent-rose)",
                    }}>
                        {message}
                    </div>
                )}

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }} />
                    </div>
                ) : (
                    <>
                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Distributions</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-cyan)" }}>{distributions.length}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Total Income</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-emerald)" }}>${totalIncome.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>Completed</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-purple)" }}>{completedCount}</div>
                            </div>
                        </div>

                        {/* Wallet connect */}
                        {!walletAddress && (
                            <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Connect wallet to claim on-chain distributions</span>
                                <button onClick={connectWallet} className="btn-secondary" style={{ padding: "8px 20px" }}>
                                    🦊 Connect Wallet
                                </button>
                            </div>
                        )}

                        {/* Distribution Cards */}
                        {distributions.length === 0 ? (
                            <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                                <div style={{ fontSize: 56, marginBottom: 16 }}>💸</div>
                                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Distributions Yet</h3>
                                <p style={{ color: "var(--text-secondary)" }}>Income distributions will appear here once your assets generate returns</p>
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Asset</th>
                                            <th>Amount</th>
                                            <th>Schedule</th>
                                            <th>Description</th>
                                            <th>Status</th>
                                            <th>TX Hash</th>
                                            <th>Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {distributions.map((d, index) => (
                                            <tr key={d._id}>
                                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                                    {ASSET_ICONS[d.assetId?.assetType] || "📦"} {d.assetId?.name || "Unknown"}
                                                </td>
                                                <td style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>
                                                    ${d.totalAmount.toLocaleString()}
                                                </td>
                                                <td><span className="badge badge-cyan">{SCHEDULE_LABELS[d.schedule] || d.schedule}</span></td>
                                                <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</td>
                                                <td>
                                                    <span className={`badge ${d.status === "completed" ? "badge-emerald" : "badge-amber"}`}>{d.status}</span>
                                                </td>
                                                <td style={{ fontSize: 12 }}>
                                                    {d.txHash ? (
                                                        <a href={`https://sepolia.etherscan.io/tx/${d.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)" }}>
                                                            {d.txHash.slice(0, 10)}...
                                                        </a>
                                                    ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                                </td>
                                                <td style={{ fontSize: 13 }}>{new Date(d.distributedAt || d.createdAt).toLocaleDateString()}</td>
                                                <td>
                                                    {d.txHash && d.assetId?.contractAddress && walletAddress && claimableAmounts[d.onChainId ?? index] ? (
                                                        <button
                                                            onClick={() => handleClaim(d.onChainId ?? index)}
                                                            disabled={claiming === String(d.onChainId ?? index)}
                                                            className="glow-btn"
                                                            style={{ padding: "6px 14px", fontSize: 12 }}
                                                        >
                                                            {claiming === String(d.onChainId ?? index) ? "..." : `💰 Claim ${claimableAmounts[d.onChainId ?? index]} ETH`}
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                                            {!walletAddress ? "Connect wallet" : (!claimableAmounts[d.onChainId ?? index] ? "Claimed / Zero" : "—")}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
