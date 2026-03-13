"use client";
import { useState } from "react";
import { ethers, Contract } from "ethers";
import { useRouter } from "next/navigation";
import Image from "next/image";

const orderBookAbi = ["function fillOrder(uint256 _orderId) external payable"];

export default function TradeClient({ initialOrders }: { initialOrders: any[] }) {
    const [orders, setOrders] = useState(initialOrders);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleBuy = async (order: any) => {
        setLoadingId(order._id);
        setError("");

        try {
            if (typeof window === "undefined" || !(window as any).ethereum) {
                throw new Error("MetaMask not found");
            }

            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();

            // 1. Get OrderBook Address
            const configRes = await fetch("/api/config");
            const config = await configRes.json();
            const orderBookAddress = config.orderBookAddress;

            if (!orderBookAddress) throw new Error("OrderBook address not configured");

            // 2. Calculate Cost (Price is per token, so total = quantity * price)
            const priceInWei = ethers.parseEther(order.pricePerToken.toString());
            const totalCostWei = priceInWei * BigInt(order.quantity);

            // 3. Call fillOrder payable function
            const orderBookContract = new Contract(orderBookAddress, orderBookAbi, signer);

            console.log(`Filling order ${order.onChainOrderId} with cost ${ethers.formatEther(totalCostWei)} ETH`);
            const tx = await orderBookContract.fillOrder(order.onChainOrderId, {
                value: totalCostWei
            });
            await tx.wait();

            // 4. Update order status in DB (Mocking a generic PUT endpoint for speed, or we can just refresh and rely on backend sync)
            await fetch(`/api/orders/fill`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order._id, txHash: tx.hash })
            });

            alert(`Successfully purchased ${order.quantity} tokens of ${order.assetId.name}!`);
            router.refresh();

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to process transaction. Do you have enough ETH?");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto", minHeight: "100vh" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>Secondary Marketplace</h1>
            <p style={{ color: "var(--color-muted)", marginBottom: "3rem" }}>Trade Real-World Asset tokens with other verified investors.</p>

            {error && <div style={{ color: "var(--color-danger)", background: "oklch(0.65 0.2 25 / 0.1)", border: "1px solid oklch(0.65 0.2 25 / 0.3)", padding: "1rem", borderRadius: 8, marginBottom: "2rem" }}>{error}</div>}

            <div style={{ background: "var(--color-surface)", borderRadius: 16, overflow: "hidden", border: "1px solid var(--color-border)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "var(--color-surface-2)", color: "var(--color-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", textAlign: "left" }}>
                            <th style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>Asset</th>
                            <th style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>Seller</th>
                            <th style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>Qty Available</th>
                            <th style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>Price / Token</th>
                            <th style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>Total Cost</th>
                            <th style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-muted)" }}>
                                    <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📉</div>
                                    No active trading orders available.
                                </td>
                            </tr>
                        ) : (
                            orders.map((o) => (
                                <tr key={o._id} style={{ borderTop: "1px solid var(--color-border)" }}>
                                    <td style={{ padding: "1.25rem 1.5rem" }}>
                                        <div style={{ fontWeight: 600 }}>{o.assetId.name}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--color-primary)" }}>{o.assetId.assetType.toUpperCase()}</div>
                                    </td>
                                    <td style={{ padding: "1.25rem 1.5rem", color: "var(--color-muted)", fontSize: "0.9rem" }}>
                                        {o.userId.name}<br />
                                        <span style={{ fontSize: "0.8rem" }}>{o.userId?.walletAddress?.substring(0, 8)}...</span>
                                    </td>
                                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600 }}>{o.quantity} RWA</td>
                                    <td style={{ padding: "1.25rem 1.5rem" }}>{o.pricePerToken} ETH</td>
                                    <td style={{ padding: "1.25rem 1.5rem", fontWeight: 600, color: "var(--color-gold)" }}>
                                        {(o.quantity * o.pricePerToken).toFixed(4)} ETH
                                    </td>
                                    <td style={{ padding: "1.25rem 1.5rem" }}>
                                        <button
                                            onClick={() => handleBuy(o)}
                                            disabled={loadingId === o._id}
                                            className="btn btn-primary"
                                            style={{ padding: "0.5rem 1.25rem" }}
                                        >
                                            {loadingId === o._id ? "Processing..." : "Buy via MetaMask"}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
