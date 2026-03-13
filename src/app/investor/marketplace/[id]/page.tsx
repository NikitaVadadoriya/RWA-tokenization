"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { InvestorSidebar } from "@/components/Navigation";
import { useWallet } from "@/components/WalletProvider";
import { ASSET_TYPE_LABELS, ASSET_TYPE_ICONS, ASSET_TYPE_COLORS } from "@/types";
import type { AssetType } from "@/types";

interface Asset {
    _id: string;
    assetType: AssetType;
    name: string;
    description: string;
    images: string[];
    location: string;
    totalTokens: number;
    tokenPrice: number;
    availableTokens: number;
    expectedYield: number;
    status: string;
    contractAddress: string;
    tokenPriceEth?: number;
    legalDocuments: string[];
    propertyType?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}

interface Distribution {
    _id: string;
    totalAmount: number;
    schedule: string;
    description: string;
    status: string;
    txHash?: string;
    distributedAt?: string;
}

const METADATA_LABELS: Record<string, Record<string, string>> = {
    real_estate: {
        occupancyRate: "Occupancy Rate",
        annualRent: "Annual Rent",
        propertySize: "Property Size",
    },
    bond: {
        bondRating: "Bond Rating",
        couponRate: "Coupon Rate",
        maturityDate: "Maturity Date",
        issuer: "Issuer",
    },
    project: {
        projectType: "Project Type",
        revenueSource: "Revenue Source",
        completionDate: "Completion Date",
    },
    art: {
        artist: "Artist",
        medium: "Medium",
        year: "Year",
        provenance: "Provenance",
    },
    metal: {
        metalType: "Metal Type",
        gramsPerToken: "Grams/Token",
        vaultLocation: "Vault Location",
        purity: "Purity",
    },
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { walletAddress, connectWallet } = useWallet();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [distributions, setDistributions] = useState<Distribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [investing, setInvesting] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [message, setMessage] = useState("");
    const [onChainPriceEth, setOnChainPriceEth] = useState<number | null>(null);

    useEffect(() => {
        Promise.all([
            fetch(`/api/assets/${id}`).then(r => r.json()),
            fetch("/api/distributions").then(r => r.json()),
        ])
            .then(([assetData, distData]) => {
                setAsset(assetData.asset || null);
                const assetDists = (distData.distributions || []).filter(
                    (d: { assetId?: { _id: string } }) => d.assetId?._id === id
                );
                setDistributions(assetDists);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    // Read on-chain token price
    useEffect(() => {
        if (!asset?.contractAddress) return;
        const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string> } }).ethereum;
        if (!ethereum) return;

        ethereum.request({
            method: "eth_call",
            params: [{ to: asset.contractAddress, data: "0x05d0f15b" }, "latest"],
        }).then((result: string) => {
            const priceWei = BigInt(result);
            setOnChainPriceEth(Number(priceWei) / 1e18);
        }).catch(() => {
            console.warn("Could not read on-chain token price");
        });
    }, [asset?.contractAddress]);

    // connectWallet is now handled by the global WalletProvider

    const handleInvest = async () => {
        setInvesting(true);
        setMessage("");
        try {
            // STEP 1: Set KYC on-chain
            if (walletAddress && asset?.contractAddress) {
                setMessage("⏳ Step 1/3: Setting KYC on-chain...");
                const prepRes = await fetch("/api/invest", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        walletAddress,
                        contractAddress: asset.contractAddress,
                    }),
                });
                if (!prepRes.ok) {
                    const err = await prepRes.json();
                    setMessage(`❌ KYC setup failed: ${err.error}`);
                    setInvesting(false);
                    return;
                }
            }

            let txHash = "";

            // STEP 2: Investor pays ETH via MetaMask → buyTokens()
            if (walletAddress && asset?.contractAddress) {
                setMessage("⏳ Step 2/3: Reading on-chain token price...");
                const ethereum = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string> } }).ethereum;
                if (!ethereum) {
                    setMessage("❌ MetaMask not found");
                    setInvesting(false);
                    return;
                }

                // Read on-chain tokenPriceWei — this is the REAL price
                // Function selector for tokenPriceWei() = keccak256("tokenPriceWei()") = 0x05d0f15b
                let onChainPriceWei: bigint;
                try {
                    const priceResult = await ethereum.request({
                        method: "eth_call",
                        params: [{ to: asset.contractAddress, data: "0x05d0f15b" }, "latest"],
                    });
                    onChainPriceWei = BigInt(priceResult);
                } catch {
                    // Fallback to DB price if on-chain read fails
                    const fallbackPriceEth = asset.tokenPriceEth || 0.001;
                    onChainPriceWei = BigInt(Math.floor(fallbackPriceEth * 1e18));
                    console.warn("Could not read on-chain price, using DB fallback:", fallbackPriceEth);
                }

                const totalWei = onChainPriceWei * BigInt(quantity);
                const totalEthDisplay = Number(totalWei) / 1e18;

                setMessage(`⏳ Step 2/3: Please confirm payment of ${totalEthDisplay.toFixed(6)} ETH in MetaMask...`);

                const functionSelector = "0x3610724e"; // keccak256("buyTokens(uint256)")
                const quantityHex = quantity.toString(16).padStart(64, "0");
                const data = functionSelector + quantityHex;

                const valueHex = "0x" + totalWei.toString(16);

                try {
                    txHash = await ethereum.request({
                        method: "eth_sendTransaction",
                        params: [{
                            from: walletAddress,
                            to: asset.contractAddress,
                            value: valueHex,
                            data: data,
                            gas: "0x30000",
                        }],
                    });
                    setMessage(`⏳ Step 3/3: TX sent! Recording... (${txHash.slice(0, 10)}...)`);
                } catch (metaMaskError: unknown) {
                    const errMsg = metaMaskError instanceof Error ? metaMaskError.message : "Transaction rejected";
                    setMessage(`❌ MetaMask: ${errMsg}`);
                    setInvesting(false);
                    return;
                }
            }

            // STEP 3: Record in backend
            const res = await fetch("/api/invest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assetId: asset?._id, quantity, walletAddress, txHash: txHash || undefined }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(`✅ ${data.message}`);
                const updated = await fetch(`/api/assets/${id}`).then(r => r.json());
                setAsset(updated.asset);
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch {
            setMessage("❌ Investment failed");
        }
        setInvesting(false);
    };

    if (loading) {
        return (
            <div style={{ display: "flex", minHeight: "100vh" }}>
                <InvestorSidebar />
                <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <div className="spinner" style={{ width: 40, height: 40 }} />
                </div>
            </div>
        );
    }

    if (!asset) {
        return (
            <div style={{ display: "flex", minHeight: "100vh" }}>
                <InvestorSidebar />
                <div style={{ flex: 1, padding: 32 }}>
                    <h1>Asset not found</h1>
                    <Link href="/investor/marketplace" className="glow-btn">← Back to Marketplace</Link>
                </div>
            </div>
        );
    }

    const utilizationPercent = ((asset.totalTokens - asset.availableTokens) / asset.totalTokens * 100).toFixed(1);
    const totalValue = asset.totalTokens * asset.tokenPrice;
    const metaLabels = METADATA_LABELS[asset.assetType] || {};

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <InvestorSidebar />

            <div style={{ flex: 1, padding: 32, maxWidth: 1100 }}>
                {/* Breadcrumb */}
                <div style={{ marginBottom: 24, fontSize: 13 }}>
                    <Link href="/investor/marketplace" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
                        ← Back to Marketplace
                    </Link>
                </div>

                {/* Header */}
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 14,
                        background: `${ASSET_TYPE_COLORS[asset.assetType]}20`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                    }}>
                        {ASSET_TYPE_ICONS[asset.assetType]}
                    </div>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{asset.name}</h1>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <span className="badge" style={{ background: `${ASSET_TYPE_COLORS[asset.assetType]}20`, color: ASSET_TYPE_COLORS[asset.assetType] }}>
                                {ASSET_TYPE_LABELS[asset.assetType]}
                            </span>
                            {asset.location && <span style={{ color: "var(--text-muted)", fontSize: 13 }}>📍 {asset.location}</span>}
                            <span className={`badge ${asset.status === "active" ? "badge-emerald" : asset.status === "funded" ? "badge-amber" : "badge-rose"}`}>
                                {asset.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
                    {/* Left Column */}
                    <div>
                        {/* Description */}
                        <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>About this Asset</h3>
                            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{asset.description}</p>
                        </div>

                        {/* Key Metrics */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 20 }}>
                            <div className="stat-card">
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Total Value</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-cyan)" }}>${totalValue.toLocaleString()}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Expected Yield</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-emerald)" }}>{asset.expectedYield}%</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Token Price</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-purple)" }}>${asset.tokenPrice}</div>
                            </div>
                            <div className="stat-card">
                                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Tokens Sold</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-amber)" }}>{utilizationPercent}%</div>
                                <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.05)" }}>
                                    <div style={{
                                        height: "100%", borderRadius: 3,
                                        width: `${utilizationPercent}%`,
                                        background: "var(--gradient-primary)",
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        {Object.keys(metaLabels).length > 0 && (
                            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Asset Details</h3>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    {Object.entries(metaLabels).map(([key, label]) => {
                                        const val = asset.metadata?.[key];
                                        if (!val) return null;
                                        let display = String(val);
                                        if (key.includes("Date") && val) display = new Date(display).toLocaleDateString();
                                        if (key === "occupancyRate") display = `${val}%`;
                                        if (key === "annualRent" || key === "couponRate") display = typeof val === "number" ? `$${val.toLocaleString()}` : display;
                                        return (
                                            <div key={key}>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
                                                <div style={{ fontWeight: 600, fontSize: 15 }}>{display}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Contract Info */}
                        {asset.contractAddress && (
                            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>⛓️ Smart Contract</h3>
                                <div style={{ fontSize: 13 }}>
                                    <span style={{ color: "var(--text-muted)" }}>Contract: </span>
                                    <a
                                        href={`https://sepolia.etherscan.io/address/${asset.contractAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "var(--accent-cyan)", fontFamily: "monospace" }}
                                    >
                                        {asset.contractAddress}
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Legal Documents */}
                        {asset.legalDocuments && asset.legalDocuments.length > 0 && (
                            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>📋 Legal Documents</h3>
                                {asset.legalDocuments.map((doc, i) => (
                                    <a key={i} href={doc} target="_blank" rel="noopener noreferrer"
                                        style={{ display: "block", padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.03)", marginBottom: 8, color: "var(--accent-cyan)", textDecoration: "none", fontSize: 14 }}>
                                        📄 Document {i + 1}
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Distribution History */}
                        {distributions.length > 0 && (
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>💸 Distribution History</h3>
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Amount</th><th>Description</th><th>Status</th><th>Date</th></tr>
                                    </thead>
                                    <tbody>
                                        {distributions.map(d => (
                                            <tr key={d._id}>
                                                <td style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>${d.totalAmount.toLocaleString()}</td>
                                                <td>{d.description}</td>
                                                <td><span className={`badge ${d.status === "completed" ? "badge-emerald" : "badge-amber"}`}>{d.status}</span></td>
                                                <td style={{ fontSize: 13 }}>{new Date(d.distributedAt || d._id).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Right Column — Invest */}
                    <div>
                        <div className="glass-card" style={{ padding: 24, position: "sticky", top: 24 }}>
                            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Invest in this Asset</h3>

                            {message && (
                                <div style={{ padding: 12, borderRadius: 8, marginBottom: 16, background: message.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)", fontSize: 13 }}>
                                    {message}
                                </div>
                            )}

                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Available</span>
                                    <span style={{ fontWeight: 700 }}>{asset.availableTokens.toLocaleString()} tokens</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Price</span>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>${asset.tokenPrice}/token</div>
                                        {asset.tokenPriceEth && (
                                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{asset.tokenPriceEth} ETH/token</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {asset.status === "active" && asset.availableTokens > 0 ? (
                                <>
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Quantity</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={asset.availableTokens}
                                            value={quantity}
                                            onChange={(e) => setQuantity(Number(e.target.value))}
                                            className="form-input"
                                        />
                                    </div>

                                    <div style={{ padding: 16, borderRadius: 10, background: "rgba(6,182,212,0.08)", marginBottom: 16 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                            <span style={{ color: "var(--text-muted)" }}>Total Cost (USD)</span>
                                            <span style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-cyan)" }}>
                                                ${(quantity * asset.tokenPrice).toLocaleString()}
                                            </span>
                                        </div>
                                        {asset.contractAddress && (
                                            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border-color)" }}>
                                                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>ETH Payment</span>
                                                <span style={{ fontWeight: 700, color: "var(--accent-amber)", fontSize: 16 }}>
                                                    {(quantity * (onChainPriceEth || asset.tokenPriceEth || 0.001)).toFixed(6)} ETH
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {!walletAddress ? (
                                        <button onClick={connectWallet} className="btn-secondary" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}>
                                            🦊 Connect MetaMask
                                        </button>
                                    ) : (
                                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, wordBreak: "break-all" }}>
                                            Wallet: {walletAddress}
                                        </div>
                                    )}

                                    <button onClick={handleInvest} className="glow-btn" style={{ width: "100%" }} disabled={investing}>
                                        {investing ? "⏳ Processing..." : "💎 Invest Now"}
                                    </button>
                                </>
                            ) : (
                                <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
                                    {asset.status === "funded" ? "🎉 Fully Funded" : "❌ Not Available"}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
