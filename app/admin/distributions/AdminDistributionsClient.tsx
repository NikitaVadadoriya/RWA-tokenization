"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDistributionsClient({ assets }: { assets: any[] }) {
    const [selectedAsset, setSelectedAsset] = useState<string>("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; message?: string; txHash?: string; error?: string } | null>(null);
    const router = useRouter();

    const handleDistribute = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        try {
            const res = await fetch("/api/distributions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetId: selectedAsset,
                    totalAmount: Number(amount),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to distribute income");

            setResult({
                success: true,
                message: data.message || "Income successfully distributed to all token holders.",
                txHash: data.txHash || data.distribution?.txHash,
            });
            setAmount("");
            router.refresh();

        } catch (err: any) {
            setResult({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", padding: "2rem" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    Trigger Income Distribution
                </h1>
                <p style={{ color: "var(--color-muted)", marginBottom: "2rem" }}>
                    Select an active asset and input the total yield (in ETH/MATIC). The smart contract will automatically split this amount proportionally among all current token holders.
                </p>

                <div className="card">
                    {result && (
                        <div style={{
                            padding: "1rem", borderRadius: 8, marginBottom: "1.5rem",
                            background: result.success ? "oklch(0.55 0.15 150 / 0.1)" : "oklch(0.65 0.2 25 / 0.1)",
                            border: `1px solid ${result.success ? "var(--color-success)" : "var(--color-danger)"}`
                        }}>
                            <div style={{ fontWeight: 600, color: result.success ? "var(--color-success)" : "var(--color-danger)" }}>
                                {result.success ? "Success!" : "Distribution Failed"}
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "var(--color-muted)", marginTop: "0.25rem" }}>
                                {result.message || result.error}
                            </div>
                            {result.txHash && (
                                <div style={{ fontSize: "0.8rem", marginTop: "0.5rem", fontFamily: "monospace" }}>
                                    Target Tx: {result.txHash}
                                </div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleDistribute}>
                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Select Asset</label>
                            <select
                                className="input"
                                style={{ width: "100%", appearance: "none", background: "var(--color-surface-2)" }}
                                value={selectedAsset}
                                onChange={(e) => setSelectedAsset(e.target.value)}
                                required
                            >
                                <option value="" disabled>-- Choose an active asset --</option>
                                {assets.map(a => (
                                    <option key={a._id} value={a._id}>
                                        {a.name} ({a.assetType}) - {a.totalTokens.toLocaleString()} tokens
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: "2rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Total Yield to Distribute (ETH)</label>
                            <input
                                type="number"
                                className="input"
                                step="0.0001"
                                min="0.0001"
                                placeholder="0.5"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                style={{ width: "100%" }}
                                required
                            />
                            <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "0.5rem" }}>
                                Note: This will execute an on-chain transaction via the IncomeDistributor contract.
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            disabled={loading || !selectedAsset}
                        >
                            {loading ? "Processing Distribution on Ethereum..." : "Distribute Yield"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
