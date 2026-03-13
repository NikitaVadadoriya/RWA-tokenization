"use client";
import { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import { useRouter } from "next/navigation";

// ABI for the RWAToken to call approve()
const tokenAbi = ["function approve(address spender, uint256 amount) public returns (bool)"];
// ABI for OrderBook to place order
const orderBookAbi = ["function placeOrder(address _tokenContract, uint256 _quantity, uint256 _pricePerToken) external returns (uint256)"];

export default function SellAssetModal({
    asset,
    onClose
}: {
    asset: any,
    onClose: () => void
}) {
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(asset.asset.tokenPrice);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1 = Approve, 2 = Place Order
    const [error, setError] = useState("");
    const router = useRouter();

    const handleList = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
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

            // 2. Approve Token Transfer
            setStep(1);
            const tokenContract = new Contract(asset.asset.contractAddress, tokenAbi, signer);
            const approvalAmount = ethers.parseUnits(quantity.toString(), 18);

            console.log("Approving tokens...", asset.asset.contractAddress, orderBookAddress);
            const approveTx = await tokenContract.approve(orderBookAddress, approvalAmount);
            await approveTx.wait();

            // 3. Place Order on OrderBook
            setStep(2);
            const orderBookContract = new Contract(orderBookAddress, orderBookAbi, signer);
            const priceInWei = ethers.parseEther(price.toString()); // For true Web3, usually USD is fed via oracle, but we'll use MATIC/ETH wei

            console.log("Placing order...");
            const orderTx = await orderBookContract.placeOrder(
                asset.asset.contractAddress,
                quantity,
                priceInWei
            );
            const receipt = await orderTx.wait();

            // Parse logs to find OrderPlaced event to get the onChainOrderId
            const eventTopic = ethers.id("OrderPlaced(uint256,address,address,uint256,uint256)");
            const log = receipt.logs.find((l: any) => l.topics[0] === eventTopic);
            const onChainOrderId = log && log.topics[1] ? Number(BigInt(log.topics[1])) : 0;

            // 4. Save to DB
            const dbRes = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetId: asset.asset._id,
                    type: "sell",
                    quantity: quantity,
                    pricePerToken: price,
                    txHash: receipt.hash,
                    onChainOrderId: onChainOrderId
                })
            });

            if (!dbRes.ok) throw new Error("Failed to save order to database");

            alert("Token successfully listed on the marketplace!");
            router.refresh();
            onClose();

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to list asset");
        } finally {
            setLoading(false);
            setStep(1);
        }
    };

    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div className="card" style={{ width: "100%", maxWidth: 450, padding: "2rem" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>
                    List {asset.asset.name}
                </h2>
                <form onSubmit={handleList}>
                    <div style={{ marginBottom: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-muted)" }}>Quantity (Max: {asset.totalTokens})</label>
                        <input className="input" type="number" min="1" max={asset.totalTokens} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ width: "100%" }} required />
                    </div>
                    <div style={{ marginBottom: "1.5rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-muted)" }}>Price per Token (ETH/MATIC)</label>
                        <input className="input" type="number" step="0.0001" min="0" value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ width: "100%" }} required />
                    </div>

                    {error && <div style={{ color: "var(--color-danger)", fontSize: "0.85rem", marginBottom: "1rem", padding: "0.75rem", background: "oklch(0.65 0.2 25 / 0.1)", borderRadius: 8 }}>{error}</div>}

                    <div style={{ display: "flex", gap: "1rem" }}>
                        <button type="button" onClick={onClose} className="btn" style={{ flex: 1, background: "var(--color-surface-2)", color: "white" }}>Cancel</button>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
                            {loading ? (step === 1 ? "1/2 Approving..." : "2/2 Listing...") : "Confirm Listing"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
