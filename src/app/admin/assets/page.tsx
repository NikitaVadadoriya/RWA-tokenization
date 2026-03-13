"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminSidebar } from "@/components/Navigation";
import { ASSET_TYPE_LABELS, ASSET_TYPE_ICONS } from "@/types";
import type { AssetType } from "@/types";

interface Asset {
    _id: string;
    assetType: AssetType;
    name: string;
    location: string;
    totalTokens: number;
    tokenPrice: number;
    availableTokens: number;
    expectedYield: number;
    status: string;
    contractAddress: string;
    createdAt: string;
}

export default function AdminAssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        assetType: "real_estate",
        name: "",
        description: "",
        location: "",
        totalTokens: "",
        tokenPrice: "",
        expectedYield: "",
        propertyType: "",
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        const res = await fetch("/api/assets?status=all");
        const data = await res.json();
        setAssets(data.assets || []);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        await fetch("/api/assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...form,
                totalTokens: Number(form.totalTokens),
                tokenPrice: Number(form.tokenPrice),
                expectedYield: Number(form.expectedYield),
                status: "active",
            }),
        });
        setSubmitting(false);
        setShowForm(false);
        setForm({ assetType: "real_estate", name: "", description: "", location: "", totalTokens: "", tokenPrice: "", expectedYield: "", propertyType: "" });
        fetchAssets();
    };

    const updateStatus = async (id: string, status: string) => {
        await fetch(`/api/assets/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        fetchAssets();
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <AdminSidebar />

            <div style={{ flex: 1, padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                    <h1 style={{ fontSize: 32, fontWeight: 800 }}>Asset <span className="gradient-text">Management</span></h1>
                    <button className="glow-btn" onClick={() => setShowForm(!showForm)}>
                        {showForm ? "Cancel" : "+ Add Asset"}
                    </button>
                </div>

                {/* Create Form */}
                {showForm && (
                    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Create New Asset</h3>
                        <form onSubmit={handleCreate}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Asset Type</label>
                                    <select className="form-input" value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
                                        <option value="real_estate">🏢 Real Estate</option>
                                        <option value="bond">📄 Bonds</option>
                                        <option value="project">🏗️ Infrastructure</option>
                                        <option value="art">🎨 Fine Art</option>
                                        <option value="metal">🥇 Precious Metals</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Name</label>
                                    <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Skyline Tower" required />
                                </div>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Description</label>
                                    <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the asset" required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Location</label>
                                    <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Dubai, UAE" />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Property Type</label>
                                    <input className="form-input" value={form.propertyType} onChange={(e) => setForm({ ...form, propertyType: e.target.value })} placeholder="e.g. Commercial Office" />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Total Tokens</label>
                                    <input className="form-input" type="number" value={form.totalTokens} onChange={(e) => setForm({ ...form, totalTokens: e.target.value })} placeholder="e.g. 200000" required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Token Price ($)</label>
                                    <input className="form-input" type="number" step="0.01" value={form.tokenPrice} onChange={(e) => setForm({ ...form, tokenPrice: e.target.value })} placeholder="e.g. 100" required />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Expected Yield (%)</label>
                                    <input className="form-input" type="number" step="0.1" value={form.expectedYield} onChange={(e) => setForm({ ...form, expectedYield: e.target.value })} placeholder="e.g. 8.5" />
                                </div>
                            </div>
                            <button className="glow-btn" type="submit" disabled={submitting} style={{ minWidth: 220 }}>
                                {submitting ? (
                                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span className="spinner" style={{ width: 16, height: 16 }} />
                                        Deploying to Blockchain...
                                    </span>
                                ) : "🚀 Create Asset & Deploy Contract →"}
                            </button>
                            {submitting && (
                                <p style={{ color: "var(--accent-amber)", fontSize: 13, marginTop: 12 }}>
                                    ⏳ Deploying smart contract on Sepolia... This may take 15-30 seconds.
                                </p>
                            )}
                        </form>
                    </div>
                )}

                {/* Assets Table */}
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>
                ) : (
                    <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                        <table className="data-table">
                            <thead>
                                <tr><th>Asset</th><th>Type</th><th>Contract</th><th>Tokens</th><th>Price</th><th>Yield</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {assets.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 40 }}>No assets created yet</td></tr>
                                ) : (
                                    assets.map((a) => (
                                        <tr key={a._id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.name}</div>
                                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.location}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-cyan">{ASSET_TYPE_ICONS[a.assetType]} {ASSET_TYPE_LABELS[a.assetType]}</span>
                                            </td>
                                            <td>
                                                {a.contractAddress ? (
                                                    <a
                                                        href={`https://sepolia.etherscan.io/address/${a.contractAddress}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: "var(--accent-cyan)", fontSize: 12, textDecoration: "none" }}
                                                        title={a.contractAddress}
                                                    >
                                                        {a.contractAddress.slice(0, 6)}...{a.contractAddress.slice(-4)} ↗
                                                    </a>
                                                ) : (
                                                    <span className="badge badge-amber">Not deployed</span>
                                                )}
                                            </td>
                                            <td>{a.totalTokens.toLocaleString()}</td>
                                            <td>${a.tokenPrice}</td>
                                            <td style={{ color: "var(--accent-emerald)" }}>{a.expectedYield}%</td>
                                            <td>
                                                <span className={`badge ${a.status === "active" ? "badge-emerald" : a.status === "draft" ? "badge-amber" : "badge-rose"}`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    {a.status === "draft" && (
                                                        <button onClick={() => updateStatus(a._id, "active")} style={{ padding: "4px 12px", borderRadius: 6, background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", border: "none", cursor: "pointer", fontSize: 12 }}>
                                                            Activate
                                                        </button>
                                                    )}
                                                    {a.status === "active" && (
                                                        <button onClick={() => updateStatus(a._id, "closed")} style={{ padding: "4px 12px", borderRadius: 6, background: "rgba(244, 63, 94, 0.15)", color: "var(--accent-rose)", border: "none", cursor: "pointer", fontSize: 12 }}>
                                                            Close
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
