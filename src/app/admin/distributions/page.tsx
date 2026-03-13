"use client";

import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/Navigation";
import { ethers } from "ethers";

declare global {
    interface Window {
        ethereum?: any;
    }
}

interface Asset {
    _id: string;
    name: string;
    assetType: string;
    contractAddress: string;
    incomeDistributorAddress?: string;
}

interface Distribution {
    _id: string;
    assetId: Asset | null;
    totalAmount: number;
    feeAmount: number;
    netAmount: number;
    schedule: string;
    description: string;
    txHash: string;
    createdAt: string;
}

const INCOME_DISTRIBUTOR_ABI = [
    "function depositIncome(string description) payable",
];

export default function AdminDistributionsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [distributions, setDistributions] = useState<Distribution[]>([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        assetId: "",
        totalAmount: "",
        schedule: "monthly",
        description: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [assetsRes, distRes] = await Promise.all([
                fetch("/api/assets"),
                fetch("/api/distributions")
            ]);
            if (assetsRes.ok) {
                const data = await assetsRes.json();
                setAssets(data.assets || []);
            }
            if (distRes.ok) {
                const data = await distRes.json();
                setDistributions(data.distributions || []);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setResult(null);

        try {
            // 1. Check Wallet & MetaMask
            if (!window.ethereum) {
                throw new Error("MetaMask not found. Please install MetaMask to deposit income.");
            }

            const totalAmt = Number(form.totalAmount);
            if (isNaN(totalAmt) || totalAmt <= 0) {
                throw new Error("Amount must be greater than 0");
            }

            // M5.4 Fee Deduction calculation matching backend: 1.5% fee
            const feePercent = 1.5;
            const feeAmt = (totalAmt * feePercent) / 100;
            const netAmt = totalAmt - feeAmt;

            setResult(`⏳ Step 1/3: Requesting MetaMask connection...`);
            const provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = await provider.getSigner();

            const adminAddress = await signer.getAddress();
            const balanceWei = await provider.getBalance(adminAddress);
            const netAmtWei = ethers.parseEther(String(netAmt));

            if (balanceWei < netAmtWei) {
                throw new Error(`Insufficient ETH balance. Wallet has ${Number(ethers.formatEther(balanceWei)).toFixed(4)} ETH, but ${netAmt} ETH is required.`);
            }

            setResult(`⏳ Step 2/3: Please confirm transaction to deposit ${netAmt} ETH to the smart contract... (Fee: ${feeAmt} ETH deducted)`);

            // Use the selected asset's IncomeDistributor contract
            const selectedAsset = assets.find(a => a._id === form.assetId);
            if (!selectedAsset?.incomeDistributorAddress) {
                throw new Error("Selected asset does not have an IncomeDistributor contract. Please redeploy the asset.");
            }

            // 2. Execute on-chain TX via MetaMask
            const contract = new ethers.Contract(selectedAsset.incomeDistributorAddress, INCOME_DISTRIBUTOR_ABI, signer);

            // Send exactly the netAmount as MSG.VALUE
            const tx = await contract.depositIncome(
                form.description || `Income distribution for ${form.schedule}`,
                { value: ethers.parseEther(String(netAmt)) }
            );

            setResult(`⏳ Step 3/3: Waiting for on-chain confirmation... (TX: ${tx.hash.slice(0, 10)}...)`);
            const receipt = await tx.wait();

            // 3. Record in backend
            setResult(`⏳ Recording distribution in database...`);
            const res = await fetch("/api/distributions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assetId: form.assetId,
                    totalAmount: totalAmt,
                    schedule: form.schedule,
                    description: form.description,
                    txHash: receipt.hash || tx.hash,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setResult(`✅ ${data.message}`);
                setForm({ assetId: "", totalAmount: "", schedule: "monthly", description: "" });
                fetchData();
            } else {
                throw new Error(data.error || "Backend failed to record distribution");
            }
        } catch (error: unknown) {
            console.error(error);
            setResult(`❌ Error: ${error instanceof Error ? error.message : "Distribution failed"}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <AdminSidebar />
            <div style={{ flex: 1, padding: 32 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Income Distributions</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: 32 }}>Manage and distribute rental yields and dividends automatically.</p>

                {result && (
                    <div style={{
                        padding: 14, borderRadius: 10, marginBottom: 24,
                        background: result.startsWith("✅") ? "rgba(16,185,129,0.1)" : result.startsWith("⏳") ? "rgba(59,130,246,0.1)" : "rgba(244,63,94,0.1)",
                        border: `1px solid ${result.startsWith("✅") ? "rgba(16,185,129,0.3)" : result.startsWith("⏳") ? "rgba(59,130,246,0.3)" : "rgba(244,63,94,0.3)"}`,
                        color: result.startsWith("✅") ? "var(--accent-emerald)" : result.startsWith("⏳") ? "var(--accent-blue)" : "var(--accent-rose)",
                    }}>
                        {result}
                    </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32 }}>

                    {/* Create Form */}
                    <div className="glass-card" style={{ padding: 24, alignSelf: "start" }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>💰 Distribute Earnings</h3>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "var(--text-muted)" }}>Target Asset</label>
                                <select className="form-input" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} required>
                                    <option value="">Select an asset...</option>
                                    {assets.map(a => (
                                        <option key={a._id} value={a._id}>{a.name} ({a.assetType})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "var(--text-muted)" }}>Total Distribution Amount (ETH)</label>
                                <input type="number" step="0.0001" min="0" className="form-input" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} placeholder="e.g. 1.5" required />
                                <div style={{ fontSize: 11, color: "var(--accent-amber)", marginTop: 4 }}>Platform will auto-deduct 1.5% management fee</div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "var(--text-muted)" }}>Schedule Type</label>
                                <select className="form-input" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })}>
                                    <option value="monthly">Monthly Distribution</option>
                                    <option value="quarterly">Quarterly Distribution</option>
                                    <option value="yearly">Yearly Distribution</option>
                                    <option value="on_sale">Distribution on Asset Sale</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "var(--text-muted)" }}>Memo / Description</label>
                                <input type="text" className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Skyline Tower March Rent" />
                            </div>

                            <button type="submit" disabled={submitting} className="glow-btn" style={{ width: "100%", opacity: submitting ? 0.7 : 1 }}>
                                {submitting ? "Processing..." : "Distribute via MetaMask"}
                            </button>

                            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, textAlign: "center" }}>
                                Requires Admin MetaMask Signature
                            </p>
                        </form>
                    </div>

                    {/* History Table */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📜 Distribution History</h3>
                        {loading ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="spinner" /></div>
                        ) : distributions.length === 0 ? (
                            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                                No distributions recorded yet.
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Asset</th>
                                            <th>Total (ETH)</th>
                                            <th>Net (ETH)</th>
                                            <th>Fee (ETH)</th>
                                            <th>TX Hash</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {distributions.map(d => (
                                            <tr key={d._id}>
                                                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                                                <td style={{ fontWeight: 600 }}>{d.assetId?.name || "Deleted Asset"}</td>
                                                <td>{d.totalAmount.toFixed(4)}</td>
                                                <td style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>{d.netAmount.toFixed(4)}</td>
                                                <td style={{ color: "var(--accent-rose)" }}>{d.feeAmount.toFixed(4)}</td>
                                                <td>
                                                    {d.txHash ? (
                                                        <a href={`https://sepolia.etherscan.io/tx/${d.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)", textDecoration: "none", fontSize: 12 }}>
                                                            {d.txHash.slice(0, 8)}... ↗
                                                        </a>
                                                    ) : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
