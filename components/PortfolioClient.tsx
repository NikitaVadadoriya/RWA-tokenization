"use client";
import { useState } from "react";
import SellAssetModal from "@/components/SellAssetModal";

export default function PortfolioClient({ initialData }: { initialData: any }) {
    const [holdings, setHoldings] = useState(initialData?.holdings || []);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [accountNum, setAccountNum] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setWithdrawing(true);
        try {
            const res = await fetch("/api/user/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(withdrawAmount),
                    bankDetails: { accountName: "Investor", accountNumber: accountNum, routingNumber: "000000000" }
                })
            });
            if (!res.ok) throw new Error("Failed to submit withdrawal");
            alert("Withdrawal request submitted! An admin will process it shortly.");
            setShowWithdraw(false);
            setWithdrawAmount("");
            setAccountNum("");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setWithdrawing(false);
        }
    };

    return (
        <div style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto", minHeight: "100vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem" }}>
                <div>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: 700, fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>My Portfolio</h1>
                    <p style={{ color: "var(--color-muted)" }}>Manage your real-world asset holdings and listings.</p>
                </div>
                <button onClick={() => setShowWithdraw(true)} className="btn" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", padding: "0.6rem 1.25rem" }}>
                    🏦 Withdraw Funds
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
                {holdings.length === 0 ? (
                    <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "4rem 2rem", background: "var(--color-surface)", borderRadius: 16, border: "1px solid var(--color-border)" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💼</div>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>No assets yet</h3>
                        <p style={{ color: "var(--color-muted)", marginBottom: "1.5rem" }}>Visit the marketplace to start building your portfolio.</p>
                        <a href="/investor/marketplace" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>Explore Assets</a>
                    </div>
                ) : (
                    holdings.map((h: any) => (
                        <div key={h.asset._id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <h3 style={{ fontSize: "1.2rem", fontWeight: 600 }}>{h.asset.name}</h3>
                                    <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>{h.asset.contractAddress && "On-Chain"}</div>
                                </div>
                                <div style={{ background: "oklch(0.55 0.15 150 / 0.15)", color: "var(--color-success)", padding: "0.25rem 0.75rem", borderRadius: 99, fontSize: "0.8rem", fontWeight: 600 }}>
                                    {h.totalTokens} Tokens
                                </div>
                            </div>

                            <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
                                <div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "0.25rem" }}>Invested</div>
                                    <div style={{ fontWeight: 600 }}>${h.totalInvested.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "0.25rem" }}>Earned</div>
                                    <div style={{ fontWeight: 600, color: "var(--color-success)" }}>${h.totalIncome.toLocaleString()}</div>
                                </div>
                            </div>

                            <button onClick={() => setSelectedAsset(h)} className="btn btn-primary" style={{ width: "100%", marginTop: "auto" }}>
                                List on Marketplace
                            </button>
                        </div>
                    ))
                )}
            </div>

            {selectedAsset && (
                <SellAssetModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
            )}

            {showWithdraw && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
                    <div className="card" style={{ width: "100%", maxWidth: 450, padding: "2rem" }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>Withdraw to Bank</h2>
                        <form onSubmit={handleWithdraw}>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-muted)" }}>Amount (USD)</label>
                                <input className="input" type="number" min="50" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} style={{ width: "100%" }} placeholder="Min $50" required />
                            </div>
                            <div style={{ marginBottom: "1.5rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--color-muted)" }}>Bank Account Number</label>
                                <input className="input" type="text" value={accountNum} onChange={(e) => setAccountNum(e.target.value)} style={{ width: "100%" }} placeholder="e.g. 123456789" required />
                            </div>
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <button type="button" onClick={() => setShowWithdraw(false)} className="btn" style={{ flex: 1, background: "var(--color-surface-2)", color: "white", border: "1px solid var(--color-border)" }}>Cancel</button>
                                <button type="submit" disabled={withdrawing} className="btn btn-primary" style={{ flex: 2 }}>
                                    {withdrawing ? "Processing..." : "Submit Request"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
