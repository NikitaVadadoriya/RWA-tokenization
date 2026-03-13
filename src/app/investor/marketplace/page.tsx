"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { InvestorSidebar } from "@/components/Navigation";
import { useWallet } from "@/components/WalletProvider";
import { ethers } from "ethers";
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
    propertyType?: string;
}

export default function MarketplacePage() {
    const { walletAddress, connectWallet } = useWallet();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [investModal, setInvestModal] = useState<Asset | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [investing, setInvesting] = useState(false);
    const [investResult, setInvestResult] = useState<string | null>(null);

    useEffect(() => {
        fetchAssets();
    }, [filter, search]);

    const fetchAssets = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filter !== "all") params.set("assetType", filter);
        if (search) params.set("search", search);
        params.set("status", "active");

        const res = await fetch(`/api/assets?${params}`);
        const data = await res.json();
        setAssets(data.assets || []);
        setLoading(false);
    };

    // connectWallet is now handled by the global WalletProvider

    const handleInvest = async () => {
        if (!investModal) return;
        setInvesting(true);
        setInvestResult(null);

        try {
            // ==========================================
            // STEP 1: Prepare — Set KYC on-chain (backend)
            // ==========================================
            if (walletAddress && investModal.contractAddress) {
                setInvestResult("⏳ Step 1/3: Setting KYC on-chain...");
                const prepRes = await fetch("/api/invest", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        walletAddress,
                        contractAddress: investModal.contractAddress,
                    }),
                });
                if (!prepRes.ok) {
                    const err = await prepRes.json();
                    setInvestResult(`❌ KYC setup failed: ${err.error}`);
                    setInvesting(false);
                    return;
                }
            }

            let txHash = "";

            // ==========================================
            // STEP 2: Pay — Investor calls buyTokens() via MetaMask
            // ==========================================
            if (walletAddress && investModal.contractAddress) {
                setInvestResult("⏳ Step 2/3: Please confirm the payment in MetaMask...");

                const ethereum = (window as unknown as Record<string, unknown>).ethereum as {
                    request: (args: { method: string; params?: unknown[] }) => Promise<string>;
                };
                if (!ethereum) {
                    setInvestResult("❌ MetaMask not found");
                    setInvesting(false);
                    return;
                }

                // Encode buyTokens(uint256 quantity) function call
                // Function selector: keccak256("buyTokens(uint256)") -> first 4 bytes
                // We'll use eth_sendTransaction with the encoded data
                const functionSelector = "0x3610724e"; // keccak256("buyTokens(uint256)") first 4 bytes
                const quantityHex = quantity.toString(16).padStart(64, "0");
                const data = functionSelector + quantityHex;

                // Calculate ETH to send (fetch price from contract or use tokenPrice as fallback)
                // Token price in ETH: we use a small ETH price per token
                // For existing assets without on-chain price, we send tokenPrice * 0.001 ETH
                const tokenPriceEth = investModal.tokenPriceEth || 0.001;
                const totalEth = quantity * tokenPriceEth;
                const valueWei = BigInt(Math.floor(totalEth * 1e18));

                const provider = new ethers.BrowserProvider(ethereum as any);
                const ethBalWei = await provider.getBalance(walletAddress);
                if (ethBalWei < valueWei) {
                    setInvestResult(`❌ Insufficient ETH. You need ${Number(ethers.formatEther(valueWei)).toFixed(4)} ETH but have ${Number(ethers.formatEther(ethBalWei)).toFixed(4)} ETH.`);
                    setInvesting(false);
                    return;
                }

                const valueHex = "0x" + valueWei.toString(16);

                try {
                    txHash = await ethereum.request({
                        method: "eth_sendTransaction",
                        params: [{
                            from: walletAddress,
                            to: investModal.contractAddress,
                            value: valueHex,
                            data: data,
                            gas: "0x30000", // ~200k gas
                        }],
                    });

                    setInvestResult(`⏳ Step 3/3: Transaction sent! Confirming... (TX: ${txHash.slice(0, 10)}...)`);
                } catch (metaMaskError: unknown) {
                    const errMsg = metaMaskError instanceof Error ? metaMaskError.message : "Transaction rejected";
                    setInvestResult(`❌ MetaMask: ${errMsg}`);
                    setInvesting(false);
                    return;
                }
            }

            // ==========================================
            // STEP 3: Record — Tell backend about the purchase
            // ==========================================
            const res = await fetch("/api/invest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetId: investModal._id,
                    quantity,
                    walletAddress: walletAddress || undefined,
                    txHash: txHash || undefined,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setInvestResult(data.message);
                fetchAssets(); // Refresh to update available tokens
                setTimeout(() => {
                    setInvestModal(null);
                    setInvestResult(null);
                    setQuantity(1);
                }, 5000);
            } else {
                setInvestResult(`❌ ${data.error}`);
            }
        } catch {
            setInvestResult("❌ Investment failed. Please try again.");
        }

        setInvesting(false);
    };

    const filters = [
        { value: "all", label: "All Assets", icon: "🌐" },
        { value: "real_estate", label: "Real Estate", icon: "🏢" },
        { value: "bond", label: "Bonds", icon: "📄" },
        { value: "project", label: "Infrastructure", icon: "🏗️" },
        { value: "art", label: "Fine Art", icon: "🎨" },
        { value: "metal", label: "Metals", icon: "🥇" },
    ];

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <InvestorSidebar />

            {/* Main Content */}
            <div style={{ flex: 1, padding: 32 }}>
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
                        Asset <span className="gradient-text">Marketplace</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)" }}>Browse and invest in tokenized real-world assets</p>
                </div>

                {/* Search & Filters */}
                <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                    <input
                        className="form-input"
                        style={{ maxWidth: 320 }}
                        placeholder="🔍 Search assets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {filters.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: 8,
                                    border: `1px solid ${filter === f.value ? "var(--accent-cyan)" : "var(--border-color)"}`,
                                    background: filter === f.value ? "rgba(6, 182, 212, 0.1)" : "transparent",
                                    color: filter === f.value ? "var(--accent-cyan)" : "var(--text-secondary)",
                                    cursor: "pointer",
                                    fontSize: 13,
                                    fontWeight: 500,
                                    transition: "all 0.2s",
                                }}
                            >
                                {f.icon} {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Assets Grid */}
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }} />
                    </div>
                ) : assets.length === 0 ? (
                    <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
                        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Assets Available Yet</h3>
                        <p style={{ color: "var(--text-secondary)" }}>
                            Assets are being onboarded. Check back soon or contact admin to add assets.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
                        {assets.map((asset) => (
                            <div key={asset._id} className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                                {/* Asset Image */}
                                <div
                                    style={{
                                        height: 180,
                                        background: `linear-gradient(135deg, ${ASSET_TYPE_COLORS[asset.assetType]}30, ${ASSET_TYPE_COLORS[asset.assetType]}10)`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 56,
                                        position: "relative",
                                    }}
                                >
                                    {ASSET_TYPE_ICONS[asset.assetType]}
                                    <span
                                        className="badge"
                                        style={{
                                            position: "absolute",
                                            top: 12,
                                            right: 12,
                                            background: `${ASSET_TYPE_COLORS[asset.assetType]}20`,
                                            color: ASSET_TYPE_COLORS[asset.assetType],
                                        }}
                                    >
                                        {ASSET_TYPE_LABELS[asset.assetType]}
                                    </span>
                                    {asset.contractAddress && (
                                        <a
                                            href={`https://sepolia.etherscan.io/address/${asset.contractAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                position: "absolute",
                                                bottom: 12,
                                                left: 12,
                                                padding: "4px 10px",
                                                borderRadius: 6,
                                                background: "rgba(6, 182, 212, 0.2)",
                                                color: "var(--accent-cyan)",
                                                fontSize: 11,
                                                textDecoration: "none",
                                                fontFamily: "monospace",
                                            }}
                                        >
                                            ⛓️ {asset.contractAddress.slice(0, 6)}...{asset.contractAddress.slice(-4)}
                                        </a>
                                    )}
                                </div>

                                {/* Content */}
                                <div style={{ padding: 20 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{asset.name}</h3>
                                    <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 4 }}>📍 {asset.location}</p>
                                    <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                                        {asset.description}
                                    </p>

                                    {/* Stats */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Token Price</div>
                                            <div style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>${asset.tokenPrice}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Expected Yield</div>
                                            <div style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>{asset.expectedYield}%</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Tokens</div>
                                            <div style={{ fontWeight: 600 }}>{asset.totalTokens.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Available</div>
                                            <div style={{ fontWeight: 600 }}>{asset.availableTokens.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ height: 6, borderRadius: 3, background: "var(--border-color)", overflow: "hidden" }}>
                                            <div
                                                style={{
                                                    width: `${((asset.totalTokens - asset.availableTokens) / asset.totalTokens) * 100}%`,
                                                    height: "100%",
                                                    background: "var(--gradient-primary)",
                                                    borderRadius: 3,
                                                    transition: "width 0.3s",
                                                }}
                                            />
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                                            {Math.round(((asset.totalTokens - asset.availableTokens) / asset.totalTokens) * 100)}% funded
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: 8 }}>
                                        <Link
                                            href={`/investor/marketplace/${asset._id}`}
                                            className="btn-secondary"
                                            style={{ flex: 1, textAlign: "center", fontSize: 13, padding: "10px 12px", textDecoration: "none" }}
                                        >
                                            📋 Details
                                        </Link>
                                        <button
                                            onClick={() => { setInvestModal(asset); setQuantity(1); setInvestResult(null); }}
                                            className="glow-btn"
                                            style={{ flex: 2, justifyContent: "center", fontSize: 14, padding: "10px 20px" }}
                                        >
                                            🚀 Invest Now →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== INVEST MODAL ===== */}
            {investModal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(8px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                    onClick={() => !investing && setInvestModal(null)}
                >
                    <div
                        className="glass-card"
                        style={{ width: 480, padding: 32 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                            Invest in <span className="gradient-text">{investModal.name}</span>
                        </h2>
                        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
                            {ASSET_TYPE_ICONS[investModal.assetType]} {ASSET_TYPE_LABELS[investModal.assetType]} • 📍 {investModal.location}
                        </p>

                        {/* Contract Info */}
                        {investModal.contractAddress && (
                            <div style={{ padding: 12, borderRadius: 8, background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", marginBottom: 20, fontSize: 12 }}>
                                <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>⛓️ Smart Contract (Sepolia)</div>
                                <a href={`https://sepolia.etherscan.io/address/${investModal.contractAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)", fontFamily: "monospace", textDecoration: "none" }}>
                                    {investModal.contractAddress} ↗
                                </a>
                            </div>
                        )}

                        {/* Wallet Connection */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                                🦊 Wallet Address (for on-chain purchase)
                            </label>
                            {walletAddress ? (
                                <div style={{
                                    padding: "10px 14px", borderRadius: 8,
                                    background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                                    fontFamily: "monospace", fontSize: 13, color: "var(--accent-emerald)",
                                }}>
                                    🟢 {walletAddress}
                                </div>
                            ) : (
                                <button
                                    onClick={connectWallet}
                                    style={{
                                        padding: "10px 20px", borderRadius: 8, width: "100%",
                                        background: "rgba(245, 158, 11, 0.15)",
                                        color: "var(--accent-amber)",
                                        border: "1px solid rgba(245, 158, 11, 0.3)",
                                        cursor: "pointer", fontSize: 13, fontWeight: 600,
                                    }}
                                >
                                    🦊 Connect MetaMask to Invest On-Chain
                                </button>
                            )}
                        </div>

                        {/* Quantity */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                                Token Quantity
                            </label>
                            <input
                                className="form-input"
                                type="number"
                                min={1}
                                max={investModal.availableTokens}
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                            />
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                                Max: {investModal.availableTokens.toLocaleString()} tokens
                            </div>
                        </div>

                        {/* Summary */}
                        <div style={{ padding: 16, borderRadius: 10, background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139,92,246,0.2)", marginBottom: 24 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ color: "var(--text-secondary)" }}>Price per Token</span>
                                <span style={{ fontWeight: 600 }}>${investModal.tokenPrice}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ color: "var(--text-secondary)" }}>Quantity</span>
                                <span style={{ fontWeight: 600 }}>{quantity} tokens</span>
                            </div>
                            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontWeight: 700 }}>Total Investment</span>
                                <span style={{ fontWeight: 800, color: "var(--accent-cyan)", fontSize: 18 }}>
                                    ${(quantity * investModal.tokenPrice).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Result */}
                        {investResult && (
                            <div style={{
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 16,
                                background: investResult.startsWith("❌") ? "rgba(244,63,94,0.1)" : "rgba(16,185,129,0.1)",
                                color: investResult.startsWith("❌") ? "var(--accent-rose)" : "var(--accent-emerald)",
                                fontSize: 13,
                            }}>
                                {investResult}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 12 }}>
                            <button
                                onClick={() => setInvestModal(null)}
                                className="btn-secondary"
                                style={{ flex: 1, padding: "12px 20px" }}
                                disabled={investing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleInvest}
                                className="glow-btn"
                                style={{ flex: 2, padding: "12px 20px", justifyContent: "center" }}
                                disabled={investing || quantity < 1}
                            >
                                {investing ? (
                                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span className="spinner" style={{ width: 16, height: 16 }} />
                                        {walletAddress ? "Minting on Blockchain..." : "Processing..."}
                                    </span>
                                ) : (
                                    `� Invest $${(quantity * investModal.tokenPrice).toLocaleString()}`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
