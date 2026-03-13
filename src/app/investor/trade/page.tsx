"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { InvestorSidebar } from "@/components/Navigation";
import { useWallet } from "@/components/WalletProvider";
import { ethers } from "ethers";

interface Order {
    _id: string;
    userId: { _id: string; name: string; walletAddress?: string };
    assetId: { _id: string; name: string; assetType: string; tokenPrice: number; tokenPriceEth?: number; contractAddress?: string; orderBookAddress?: string };
    type: "buy" | "sell";
    quantity: number;
    filled?: number;
    pricePerToken: number;
    totalPrice: number;
    status: string;
    txHash?: string;
    onChainOrderId?: string;
    createdAt: string;
}

interface Asset {
    _id: string;
    name: string;
    tokenPrice: number;
    tokenPriceEth?: number;
    contractAddress: string;
    orderBookAddress?: string;
}

// Verified keccak256 function selectors for OrderBook contract
const ORDER_BOOK_SIGS = {
    placeBuyOrder: "0xee36d4ab",
    placeSellOrder: "0xa4406bcd",
    fillOrder: "0xc37dfc5b",
};
const ERC20_SIGS = {
    approve: "0x095ea7b3",
};



function TradePageContent() {
    const { walletAddress, connectWallet } = useWallet();
    const searchParams = useSearchParams();
    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [myOrders, setMyOrders] = useState<Order[]>([]);
    const [currentUserId, setCurrentUserId] = useState("");
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ assetId: "", type: "buy", quantity: "", pricePerToken: "" });
    const [submitting, setSubmitting] = useState(false);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [result, setResult] = useState<string | null>(null);
    const [tab, setTab] = useState<"marketplace" | "my">("marketplace");
    const [fillingOrderId, setFillingOrderId] = useState<string | null>(null);
    const [fillOrderObj, setFillOrderObj] = useState<Order | null>(null);
    const [fillQuantity, setFillQuantity] = useState<number>(1);

    // Pre-fill from portfolio sell button (?sell=assetId&tokens=qty)
    useEffect(() => {
        const sellAssetId = searchParams.get("sell");
        const sellTokens = searchParams.get("tokens");
        if (sellAssetId) {
            // Find the asset to get its price (will be set once assets load)
            setForm({
                assetId: sellAssetId,
                type: "sell",
                quantity: sellTokens || "",
                pricePerToken: "", // Will be auto-filled once assets load
            });
            setShowForm(true);
        }
    }, [searchParams]);

    // Auto-fill price when asset changes for sell orders
    useEffect(() => {
        if (form.type === "sell" && form.assetId && assets.length > 0) {
            const asset = assets.find(a => a._id === form.assetId);
            if (asset?.tokenPriceEth) {
                setForm(prev => ({ ...prev, pricePerToken: String(asset.tokenPriceEth) }));
            }
        }
    }, [form.assetId, form.type, assets]);

    useEffect(() => {
        fetchOrders();
        fetchAssets();
    }, []);

    const fetchOrders = async () => {
        // Fetch all marketplace orders
        const [allRes, myRes] = await Promise.all([
            fetch("/api/orders"),
            fetch("/api/orders?mine=true"),
        ]);
        const allData = await allRes.json();
        const myData = await myRes.json();
        setAllOrders(allData.orders || []);
        setMyOrders(myData.orders || []);
        setCurrentUserId(allData.currentUserId || "");
        setLoading(false);
    };

    const fetchAssets = async () => {
        const res = await fetch("/api/assets?status=active");
        const data = await res.json();
        // Filter to only assets that have a deployed OrderBook
        setAssets(data.assets || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!walletAddress) {
            setResult("❌ Please connect your wallet first (click 🦊 in navbar)");
            return;
        }

        const selectedAssetObj = assets.find(a => a._id === form.assetId);
        if (!selectedAssetObj) {
            setResult("❌ Please select an asset");
            return;
        }

        // Frontend price validation for buy orders
        if (form.type === "buy" && selectedAssetObj.tokenPriceEth) {
            if (Number(form.pricePerToken) < selectedAssetObj.tokenPriceEth) {
                setResult(`❌ Buy price (${form.pricePerToken} ETH) cannot be below the minimum token price (${selectedAssetObj.tokenPriceEth} ETH)`);
                return;
            }
        }

        setSubmitting(true);
        setResult(null);

        try {
            const qty = Number(form.quantity);
            const price = Number(form.pricePerToken);

            let txHash = "";
            let onChainOrderId: number | null = null;

            // ON-CHAIN ORDER VIA METAMASK
            const assetOrderBook = selectedAssetObj.orderBookAddress;
            if (selectedAssetObj.contractAddress && walletAddress && assetOrderBook) {
                const ethereum = (window as unknown as {
                    ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string> };
                }).ethereum;

                if (!ethereum) {
                    setResult("❌ MetaMask not found");
                    setSubmitting(false);
                    return;
                }

                // Step 1: Set KYC on-chain for the asset's token contract
                setResult("⏳ Step 1/4: Setting KYC on-chain...");
                const prepRes = await fetch("/api/invest", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ walletAddress, contractAddress: selectedAssetObj.contractAddress }),
                });
                if (!prepRes.ok) {
                    const err = await prepRes.json();
                    setResult(`❌ KYC setup failed: ${err.error}`);
                    setSubmitting(false);
                    return;
                }

                // Read current order count for on-chain ID
                try {
                    const countResult = await ethereum.request({
                        method: "eth_call",
                        params: [{ to: assetOrderBook, data: "0x8d0a5fbb" }, "latest"],
                    });
                    onChainOrderId = parseInt(countResult, 16);
                } catch {
                    console.warn("Could not read orderCount, continuing without on-chain ID");
                }

                if (form.type === "buy") {
                    // Contract uses whole-token quantities internally
                    // Contract does: totalCost = quantity * pricePerToken (ETH in wei)
                    const priceWei = BigInt(Math.floor(price * 1e18));
                    const totalCostWei = BigInt(qty) * priceWei;
                    const feeWei = totalCostWei * BigInt(50) / BigInt(10000);
                    const totalRequiredWei = totalCostWei + feeWei;

                    const provider = new ethers.BrowserProvider(ethereum);
                    const ethBalWei = await provider.getBalance(walletAddress);
                    if (ethBalWei < totalRequiredWei) {
                        setResult(`❌ Insufficient ETH. You have ${Number(ethers.formatEther(ethBalWei)).toFixed(4)} ETH, but ${Number(ethers.formatEther(totalRequiredWei)).toFixed(4)} ETH is required.`);
                        setSubmitting(false);
                        return;
                    }

                    setResult("⏳ Step 2/3: Confirm BUY order in MetaMask...");

                    // Send whole-token qty — contract converts to token-wei for transferFrom
                    const qtyHex = BigInt(qty).toString(16).padStart(64, "0");
                    const priceHex = priceWei.toString(16).padStart(64, "0");
                    const data = ORDER_BOOK_SIGS.placeBuyOrder + qtyHex + priceHex;
                    const valueHex = "0x" + totalRequiredWei.toString(16);

                    try {
                        txHash = await ethereum.request({
                            method: "eth_sendTransaction",
                            params: [{ from: walletAddress, to: assetOrderBook, value: valueHex, data, gas: "0x60000" }],
                        });
                    } catch (err: unknown) {
                        setResult(`❌ MetaMask: ${err instanceof Error ? err.message : "Transaction rejected"}`);
                        setSubmitting(false);
                        return;
                    }
                } else {
                    // SELL ORDER — Approve OrderBook, then call placeSellOrder on-chain
                    setResult("⏳ Step 1/4: Checking token balance...");

                    const provider = new ethers.BrowserProvider(ethereum);
                    const rwaABI = ["function balanceOf(address) view returns (uint256)"];
                    const tokenContract = new ethers.Contract(selectedAssetObj.contractAddress, rwaABI, provider);
                    const balanceWei = await tokenContract.balanceOf(walletAddress);
                    const balTokens = Number(ethers.formatEther(balanceWei));

                    if (balTokens < qty) {
                        setResult(`❌ Insufficient tokens. You have ${balTokens} tokens, but are trying to sell ${qty}.`);
                        setSubmitting(false);
                        return;
                    }

                    // Step 2: Approve the asset's OrderBook contract to transfer tokens
                    setResult("⏳ Step 2/4: Approve OrderBook to transfer your tokens in MetaMask...");

                    // Approve amount with 18 decimals (e.g., 10 tokens = 10 * 10^18)
                    const approveAmtWei = BigInt(qty) * BigInt("1000000000000000000");
                    const approveAmtHex = approveAmtWei.toString(16).padStart(64, "0");
                    const orderBookPadded = assetOrderBook.replace("0x", "").toLowerCase().padStart(64, "0");
                    const approveData = ERC20_SIGS.approve + orderBookPadded + approveAmtHex;

                    try {
                        await ethereum.request({
                            method: "eth_sendTransaction",
                            params: [{ from: walletAddress, to: selectedAssetObj.contractAddress, value: "0x0", data: approveData, gas: "0x20000" }],
                        });
                    } catch (err: unknown) {
                        setResult(`❌ MetaMask (approve): ${err instanceof Error ? err.message : "Transaction rejected"}`);
                        setSubmitting(false);
                        return;
                    }

                    setResult("⏳ Step 3/4: Waiting for approval confirmation...");
                    await new Promise(r => setTimeout(r, 12000));

                    // Step 3: Call placeSellOrder on the asset's OrderBook
                    setResult("⏳ Step 4/4: Placing sell order on OrderBook...");

                    const priceWei = BigInt(Math.floor(price * 1e18));
                    // Send whole-token qty — contract converts to token-wei internally
                    const qtyHex = BigInt(qty).toString(16).padStart(64, "0");
                    const priceHex = priceWei.toString(16).padStart(64, "0");
                    const data = ORDER_BOOK_SIGS.placeSellOrder + qtyHex + priceHex;

                    try {
                        txHash = await ethereum.request({
                            method: "eth_sendTransaction",
                            params: [{ from: walletAddress, to: assetOrderBook, value: "0x0", data, gas: "0x60000" }],
                        });
                    } catch (err: unknown) {
                        setResult(`❌ MetaMask: ${err instanceof Error ? err.message : "Transaction rejected"}`);
                        setSubmitting(false);
                        return;
                    }
                }

                setResult(`⏳ Recording order... (TX: ${txHash.slice(0, 10)}...)`);
            }

            // Step 3: Record in backend
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetId: form.assetId,
                    type: form.type,
                    quantity: Number(form.quantity),
                    pricePerToken: Number(form.pricePerToken),
                    walletAddress,
                    txHash: txHash || undefined,
                    onChainOrderId: onChainOrderId ?? undefined,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setResult(`✅ ${data.message}`);
                setShowForm(false);
                setForm({ assetId: "", type: "buy", quantity: "", pricePerToken: "" });
                fetchOrders();
            } else {
                setResult(`❌ ${data.error}`);
            }
        } catch {
            setResult("❌ Order failed");
        }
        setSubmitting(false);
    };

    const selectedAsset = assets.find(a => a._id === form.assetId);
    const orderTotal = Number(form.quantity || 0) * Number(form.pricePerToken || 0);
    const tradingFee = orderTotal * 0.005;

    // ========== FILL ORDER HANDLER (On-Chain via asset's OrderBook) ==========
    const handleFillOrder = async () => {
        if (!fillOrderObj || !walletAddress) {
            setResult("❌ Please connect your wallet first");
            return;
        }

        const ethereum = (window as unknown as {
            ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string> };
        }).ethereum;
        if (!ethereum) {
            setResult("❌ MetaMask not found");
            return;
        }

        setFillingOrderId(fillOrderObj._id);
        setResult(null);

        try {
            const assetContract = fillOrderObj.assetId?.contractAddress;
            const orderBookAddr = fillOrderObj.assetId?.orderBookAddress;

            if (!assetContract) {
                setResult("❌ Asset has no contract address");
                setFillingOrderId(null);
                return;
            }

            if (!orderBookAddr) {
                setResult("❌ Asset has no OrderBook contract. This asset needs redeployment.");
                setFillingOrderId(null);
                return;
            }

            const onChainOrderId = fillOrderObj.onChainOrderId;
            if (onChainOrderId === undefined || onChainOrderId === null) {
                setResult("❌ Order has no on-chain ID. Cannot fill.");
                setFillingOrderId(null);
                return;
            }

            // Set KYC for the filler on the asset's token contract
            setResult("⏳ Step 1: Setting KYC on-chain...");
            const prepRes = await fetch("/api/invest", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress, contractAddress: assetContract }),
            });
            if (!prepRes.ok) {
                const err = await prepRes.json();
                setResult(`❌ KYC setup failed: ${err.error}`);
                setFillingOrderId(null);
                return;
            }

            let txHash = "";

            if (fillOrderObj.type === "sell") {
                // I am BUYING from this sell order — call fillOrder with ETH
                const priceWei = BigInt(Math.floor(fillOrderObj.pricePerToken * 1e18));
                // Contract uses whole-token qty, converts to token-wei internally
                const totalCostWei = BigInt(fillQuantity) * priceWei;
                const feeWei = totalCostWei * BigInt(50) / BigInt(10000);
                const totalRequiredWei = totalCostWei + feeWei;
                const valueHex = "0x" + totalRequiredWei.toString(16);

                setResult(`⏳ Step 2/2: Confirm fill order in MetaMask (${Number(ethers.formatEther(totalRequiredWei)).toFixed(6)} ETH)...`);

                const orderIdHex = Number(onChainOrderId).toString(16).padStart(64, "0");
                // Send whole-token qty (not wei)
                const qtyHex = BigInt(fillQuantity).toString(16).padStart(64, "0");
                const data = ORDER_BOOK_SIGS.fillOrder + orderIdHex + qtyHex;

                try {
                    txHash = await ethereum.request({
                        method: "eth_sendTransaction",
                        params: [{ from: walletAddress, to: orderBookAddr, value: valueHex, data, gas: "0x80000" }],
                    });
                } catch (err: unknown) {
                    setResult(`❌ MetaMask: ${err instanceof Error ? err.message : "Transaction rejected"}`);
                    setFillingOrderId(null);
                    return;
                }

            } else {
                // order.type === "buy" → I am SELLING into this buy order
                // Step 1: Approve OrderBook to transfer my tokens
                setResult(`⏳ Step 1/3: Approve OrderBook to transfer your tokens in MetaMask...`);

                const approveAmtWei = BigInt(fillQuantity) * BigInt("1000000000000000000");
                const approveAmtHex = approveAmtWei.toString(16).padStart(64, "0");
                const orderBookPadded = orderBookAddr.replace("0x", "").toLowerCase().padStart(64, "0");
                const approveData = ERC20_SIGS.approve + orderBookPadded + approveAmtHex;

                try {
                    await ethereum.request({
                        method: "eth_sendTransaction",
                        params: [{ from: walletAddress, to: assetContract, value: "0x0", data: approveData, gas: "0x20000" }],
                    });
                } catch (err: unknown) {
                    setResult(`❌ MetaMask (approve): ${err instanceof Error ? err.message : "Transaction rejected"}`);
                    setFillingOrderId(null);
                    return;
                }

                setResult(`⏳ Step 2/3: Waiting for approval confirmation...`);
                await new Promise(r => setTimeout(r, 12000));

                // Step 2: Call fillOrder on the OrderBook
                setResult(`⏳ Step 3/3: Fill order on OrderBook...`);

                const orderIdHex = Number(onChainOrderId).toString(16).padStart(64, "0");
                // Send whole-token qty (contract converts to token-wei internally)
                const qtyHex = BigInt(fillQuantity).toString(16).padStart(64, "0");
                const data = ORDER_BOOK_SIGS.fillOrder + orderIdHex + qtyHex;

                try {
                    txHash = await ethereum.request({
                        method: "eth_sendTransaction",
                        params: [{ from: walletAddress, to: orderBookAddr, value: "0x0", data, gas: "0x80000" }],
                    });
                } catch (err: unknown) {
                    setResult(`❌ MetaMask: ${err instanceof Error ? err.message : "Transaction rejected"}`);
                    setFillingOrderId(null);
                    return;
                }
            }

            // Record in backend
            setResult(`⏳ Recording fill... (TX: ${txHash.slice(0, 10)}...)`);

            const fillRes = await fetch("/api/orders/fill", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderId: fillOrderObj._id,
                    quantity: fillQuantity,
                    txHash,
                    walletAddress,
                }),
            });

            const fillData = await fillRes.json();
            if (fillRes.ok) {
                setResult(`✅ ${fillData.message}`);
                fetchOrders();
                setFillOrderObj(null);
            } else {
                setResult(`❌ ${fillData.error}`);
            }
        } catch (err) {
            setResult(`❌ Fill failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
        setFillingOrderId(null);
    };

    // Split marketplace orders into buy/sell (excluding current user's orders)
    const marketBuyOrders = allOrders.filter(o => o.type === "buy" && o.userId?._id !== currentUserId);
    const marketSellOrders = allOrders.filter(o => o.type === "sell" && o.userId?._id !== currentUserId);

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <InvestorSidebar />
            <div style={{ flex: 1, padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 4 }}>Secondary <span className="gradient-text">Marketplace</span></h1>
                        <p style={{ color: "var(--text-secondary)" }}>Buy and sell your tokens • MetaMask powered • 0.5% trading fee</p>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {!walletAddress && (
                            <button onClick={connectWallet} style={{ padding: "10px 20px", borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)", border: "1px solid rgba(245,158,11,0.3)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                                🦊 Connect Wallet
                            </button>
                        )}
                        <button className="glow-btn" onClick={() => setShowForm(!showForm)}>
                            {showForm ? "Cancel" : "📝 Place Order"}
                        </button>
                    </div>
                </div>

                {/* Result Toast */}
                {result && (
                    <div style={{
                        padding: 14, borderRadius: 10, marginBottom: 20,
                        background: result.startsWith("✅") ? "rgba(16,185,129,0.1)" : result.startsWith("⏳") ? "rgba(139,92,246,0.1)" : "rgba(244,63,94,0.1)",
                        border: `1px solid ${result.startsWith("✅") ? "rgba(16,185,129,0.3)" : result.startsWith("⏳") ? "rgba(139,92,246,0.3)" : "rgba(244,63,94,0.3)"}`,
                        color: result.startsWith("✅") ? "var(--accent-emerald)" : result.startsWith("⏳") ? "var(--accent-purple)" : "var(--accent-rose)",
                        fontSize: 14,
                    }}>
                        {result}
                    </div>
                )}

                {/* Order Form */}
                {showForm && (
                    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>
                            📝 {form.type === "sell" ? "Sell Your Tokens" : "Place Order"} {walletAddress ? "(On-Chain via MetaMask)" : "(Connect wallet first)"}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Asset</label>
                                    <select className="form-input" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} required>
                                        <option value="">Select asset</option>
                                        {assets.map((a) => (
                                            <option key={a._id} value={a._id}>{a.name} {a.contractAddress ? "⛓️" : ""}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Order Type</label>
                                    <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                        <option value="buy">📈 Buy</option>
                                        <option value="sell">📉 Sell</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Quantity</label>
                                    <input className="form-input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                                        Price/Token (ETH) {form.type === "sell" ? "— auto-filled from token price" : "— enter your price"}
                                    </label>
                                    <input className="form-input" type="number" min="0" step="0.0001"
                                        value={form.pricePerToken}
                                        onChange={(e) => setForm({ ...form, pricePerToken: e.target.value })}
                                        placeholder={selectedAsset?.tokenPriceEth ? `${selectedAsset.tokenPriceEth}` : "0.001"}
                                        required
                                        readOnly={form.type === "sell" && !!selectedAsset?.tokenPriceEth}
                                        style={form.type === "sell" && selectedAsset?.tokenPriceEth ? { background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.3)" } : {}}
                                    />
                                    {form.type === "sell" && selectedAsset?.tokenPriceEth && (
                                        <div style={{ fontSize: 11, color: "var(--accent-emerald)", marginTop: 4 }}>🔒 Price locked to token's on-chain price</div>
                                    )}
                                </div>
                            </div>

                            {/* Order Summary */}
                            {Number(form.quantity) > 0 && Number(form.pricePerToken) > 0 && (
                                <div style={{ padding: 14, borderRadius: 8, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", marginBottom: 16, display: "flex", gap: 32, fontSize: 13, flexWrap: "wrap" }}>
                                    <div><span style={{ color: "var(--text-muted)" }}>Total: </span><span style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{orderTotal.toFixed(6)} ETH</span></div>
                                    {form.type === "buy" && (
                                        <>
                                            <div><span style={{ color: "var(--text-muted)" }}>Fee (0.5%): </span><span style={{ fontWeight: 600, color: "var(--accent-amber)" }}>{tradingFee.toFixed(6)} ETH</span></div>
                                            <div><span style={{ color: "var(--text-muted)" }}>Total Required: </span><span style={{ fontWeight: 800 }}>{(orderTotal + tradingFee).toFixed(6)} ETH</span></div>
                                        </>
                                    )}
                                    {walletAddress && <span style={{ color: "var(--accent-emerald)" }}>⛓️ Via MetaMask</span>}
                                </div>
                            )}

                            <button className="glow-btn" type="submit" disabled={submitting || !walletAddress} style={{ padding: "12px 28px" }}>
                                {submitting ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="spinner" style={{ width: 16, height: 16 }} />Processing...</span>
                                    : `🚀 Place ${form.type === "buy" ? "Buy" : "Sell"} Order`}
                            </button>
                        </form>
                    </div>
                )}

                {/* Tab Switcher */}
                <div style={{ display: "flex", gap: 0, marginBottom: 24, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-color)", width: "fit-content" }}>
                    <button
                        onClick={() => setTab("my")}
                        style={{
                            padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
                            background: tab === "my" ? "var(--gradient-primary)" : "transparent",
                            color: tab === "my" ? "white" : "var(--text-muted)",
                        }}
                    >
                        📋 My Orders ({myOrders.length})
                    </button>
                    <button
                        onClick={() => setTab("marketplace")}
                        style={{
                            padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
                            background: tab === "marketplace" ? "var(--gradient-primary)" : "transparent",
                            color: tab === "marketplace" ? "white" : "var(--text-muted)",
                        }}
                    >
                        🏪 Marketplace Orderbook ({marketBuyOrders.length + marketSellOrders.length})
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>
                ) : tab === "my" ? (
                    /* ========== MY ORDERS ========== */
                    myOrders.length === 0 ? (
                        <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
                            <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
                            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Orders Yet</h3>
                            <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>Place a buy or sell order to start trading</p>
                            <button className="glow-btn" onClick={() => setShowForm(true)}>📝 Place Your First Order</button>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                            <table className="data-table">
                                <thead><tr><th>Type</th><th>Asset</th><th>Qty</th><th>Price</th><th>Total</th><th>Status</th><th>TX</th><th>Date</th></tr></thead>
                                <tbody>
                                    {myOrders.map((o) => (
                                        <tr key={o._id}>
                                            <td><span className={`badge ${o.type === "buy" ? "badge-emerald" : "badge-rose"}`}>{o.type === "buy" ? "📈 Buy" : "📉 Sell"}</span></td>
                                            <td style={{ fontWeight: 600 }}>{o.assetId?.name || "N/A"}</td>
                                            <td>{o.quantity}</td>
                                            <td>{o.pricePerToken} ETH</td>
                                            <td style={{ fontWeight: 600, color: o.type === "buy" ? "var(--accent-emerald)" : "var(--accent-rose)" }}>{o.totalPrice.toFixed(4)} ETH</td>
                                            <td><span className="badge badge-amber">{o.status}</span></td>
                                            <td>
                                                {o.txHash ? (
                                                    <a href={`https://sepolia.etherscan.io/tx/${o.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)", fontSize: 11, textDecoration: "none" }}>⛓️ View</a>
                                                ) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>}
                                            </td>
                                            <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    /* ========== MARKETPLACE ORDERBOOK ========== */
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        {/* Buy Orders from others */}
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
                                <h3 style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>📈 Buy Orders</h3>
                                <span className="badge badge-emerald">{marketBuyOrders.length}</span>
                            </div>
                            {marketBuyOrders.length === 0 ? (
                                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No buy orders from other investors</div>
                            ) : (
                                <table className="data-table">
                                    <thead><tr><th>Asset</th><th>Qty</th><th>Price</th><th>Trader</th><th>TX</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {marketBuyOrders.map((o) => (
                                            <tr key={o._id}>
                                                <td style={{ fontWeight: 600 }}>{o.assetId?.name || "N/A"}</td>
                                                <td>{o.quantity - (o.filled || 0)}</td>
                                                <td>{o.pricePerToken} ETH</td>
                                                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{o.userId?.name || "Anon"}</td>
                                                <td>
                                                    {o.txHash ? (
                                                        <a href={`https://sepolia.etherscan.io/tx/${o.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)", fontSize: 11, textDecoration: "none" }}>⛓️ View</a>
                                                    ) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Off-chain</span>}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => { setFillOrderObj(o); setFillQuantity(o.quantity - (o.filled || 0)); }}
                                                        disabled={fillingOrderId === o._id || !walletAddress}
                                                        style={{
                                                            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                                                            background: "rgba(244, 63, 94, 0.15)", color: "var(--accent-rose)",
                                                            border: "1px solid rgba(244,63,94,0.3)",
                                                            opacity: fillingOrderId === o._id ? 0.5 : 1,
                                                        }}
                                                    >
                                                        {fillingOrderId === o._id ? "⏳..." : `📉 Sell...`}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Sell Orders from others */}
                        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between" }}>
                                <h3 style={{ fontWeight: 700, color: "var(--accent-rose)" }}>📉 Sell Orders</h3>
                                <span className="badge badge-rose">{marketSellOrders.length}</span>
                            </div>
                            {marketSellOrders.length === 0 ? (
                                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No sell orders from other investors</div>
                            ) : (
                                <table className="data-table">
                                    <thead><tr><th>Asset</th><th>Qty</th><th>Price</th><th>Trader</th><th>TX</th><th>Action</th></tr></thead>
                                    <tbody>
                                        {marketSellOrders.map((o) => (
                                            <tr key={o._id}>
                                                <td style={{ fontWeight: 600 }}>{o.assetId?.name || "N/A"}</td>
                                                <td>{o.quantity - (o.filled || 0)}</td>
                                                <td>{o.pricePerToken} ETH</td>
                                                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{o.userId?.name || "Anon"}</td>
                                                <td>
                                                    {o.txHash ? (
                                                        <a href={`https://sepolia.etherscan.io/tx/${o.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)", fontSize: 11, textDecoration: "none" }}>⛓️ View</a>
                                                    ) : <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Off-chain</span>}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => { setFillOrderObj(o); setFillQuantity(o.quantity - (o.filled || 0)); }}
                                                        disabled={fillingOrderId === o._id || !walletAddress}
                                                        style={{
                                                            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                                                            background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)",
                                                            border: "1px solid rgba(16,185,129,0.3)",
                                                            opacity: fillingOrderId === o._id ? 0.5 : 1,
                                                        }}
                                                    >
                                                        {fillingOrderId === o._id ? "⏳..." : `📈 Buy...`}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ===== FILL ORDER MODAL ===== */}
                {fillOrderObj && (
                    <div
                        style={{
                            position: "fixed", inset: 0,
                            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
                            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
                        }}
                        onClick={() => !fillingOrderId && setFillOrderObj(null)}
                    >
                        <div className="glass-card" style={{ width: 440, padding: 32 }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>
                                {fillOrderObj.type === "buy" ? "Sell to Buy Order" : "Buy from Sell Order"}
                            </h3>
                            <div style={{ padding: 16, background: "rgba(255,255,255,0.05)", borderRadius: 8, marginBottom: 20 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Asset</span>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{fillOrderObj.assetId?.name}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Price</span>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{fillOrderObj.pricePerToken} ETH</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Available</span>
                                    <span style={{ fontWeight: 600, fontSize: 14 }}>{fillOrderObj.quantity - (fillOrderObj.filled || 0)} tokens</span>
                                </div>
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                                    Quantity to Fill
                                </label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min="1"
                                    max={fillOrderObj.quantity - (fillOrderObj.filled || 0)}
                                    value={fillQuantity}
                                    onChange={e => setFillQuantity(Number(e.target.value))}
                                />
                                <div style={{ textAlign: "right", marginTop: 8, fontSize: 13, color: "var(--accent-cyan)", fontWeight: 700 }}>
                                    Total: {(fillQuantity * fillOrderObj.pricePerToken).toFixed(4)} ETH
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 12 }}>
                                <button className="btn-secondary" style={{ flex: 1, padding: 12 }} disabled={!!fillingOrderId} onClick={() => setFillOrderObj(null)}>Cancel</button>
                                <button className="glow-btn" style={{ flex: 2, padding: 12, justifyContent: "center" }} disabled={!!fillingOrderId || fillQuantity < 1} onClick={handleFillOrder}>
                                    {fillingOrderId ? "⏳ Processing..." : "🚀 Confirm Fill"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Smart Contract Info */}
                <div className="glass-card" style={{ marginTop: 24, padding: 20 }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 12 }}>⛓️ Per-Asset Smart Contracts</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 13 }}>
                        <div>
                            <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Architecture</div>
                            <span style={{ fontWeight: 600 }}>Each asset has its own OrderBook & IncomeDistributor</span>
                        </div>
                        <div>
                            <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Trading Fee</div>
                            <span style={{ fontWeight: 600 }}>0.5% (50 basis points)</span>
                        </div>
                        <div>
                            <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Flow</div>
                            <span style={{ fontWeight: 600 }}>Approve → OrderBook → On-chain transfer</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TradePage() {
    return (
        <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>}>
            <TradePageContent />
        </Suspense>
    );
}
