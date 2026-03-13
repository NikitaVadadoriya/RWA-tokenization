"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InvestForm({ assetId, maxTokens }: { assetId: string; maxTokens: number }) {
    const [amount, setAmount] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`/api/invest/${assetId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Investment failed");
                return;
            }

            alert(`Success! Transaction Hash: ${data.txHash}`);
            router.refresh();
            router.push("/investor/portfolio");
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Tokens to purchase:</label>
            <input
                type="number"
                className="input"
                min="1"
                max={maxTokens}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                style={{ marginBottom: "1rem", width: "100%" }}
            />

            {error && <div style={{ color: "var(--color-danger)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "1rem", fontSize: "1.05rem" }}>
                {loading ? "Processing..." : "Invest Now"}
            </button>
            <p style={{ textAlign: "center", color: "var(--color-muted)", fontSize: "0.8rem", marginTop: "1rem" }}>
                This will securely transfer tokens from the protocol to your whitelisted wallet.
            </p>
        </form>
    );
}
