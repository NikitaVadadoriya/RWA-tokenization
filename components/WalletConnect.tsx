"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WalletConnect({ currentWallet }: { currentWallet?: string }) {
    const [wallet, setWallet] = useState<string | null>(currentWallet || null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const connectWallet = async () => {
        if (typeof window === "undefined" || !(window as any).ethereum) {
            alert("MetaMask is not installed! Please install it to connect.");
            return;
        }

        setLoading(true);
        try {
            const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
            const address = accounts[0];

            // Save to DB
            const res = await fetch("/api/user/wallet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ walletAddress: address }),
            });

            if (res.ok) {
                setWallet(address);
                router.refresh();
            } else {
                alert("Failed to link wallet to account.");
            }
        } catch (error) {
            console.error("Wallet connection failed:", error);
        } finally {
            setLoading(false);
        }
    };

    if (wallet) {
        return (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "oklch(0.55 0.15 150 / 0.1)", color: "var(--color-success)", padding: "0.5rem 1rem", borderRadius: 99, fontSize: "0.85rem", fontWeight: 600, border: "1px solid oklch(0.55 0.15 150 / 0.3)" }}>
                <span style={{ fontSize: "1rem" }}>🟢</span>
                {wallet.substring(0, 6)}...{wallet.substring(wallet.length - 4)}
            </div>
        );
    }

    return (
        <button onClick={connectWallet} disabled={loading} className="btn btn-primary" style={{ padding: "0.6rem 1.25rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🦊</span>
            {loading ? "Connecting..." : "Connect MetaMask"}
        </button>
    );
}
