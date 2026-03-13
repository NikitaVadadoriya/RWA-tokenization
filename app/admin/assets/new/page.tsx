"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAssetPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name"),
            description: formData.get("description"),
            assetType: formData.get("assetType"),
            location: formData.get("location"),
            tokenPrice: Number(formData.get("tokenPrice")),
            totalTokens: Number(formData.get("totalTokens")),
            expectedYield: Number(formData.get("expectedYield")),
            riskLevel: formData.get("riskLevel"),
            images: [formData.get("image") || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80"], // Default image fallback
        };

        try {
            const res = await fetch("/api/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const result = await res.json();
                throw new Error(result.error || "Failed to create asset");
            }

            // Redirect back to admin dashboard
            router.push("/admin/dashboard");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ minHeight: "100vh", padding: "2rem" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>
                    List New <span className="gradient-text">Asset</span>
                </h1>

                <form onSubmit={handleSubmit} className="form-group card" style={{ display: "grid", gap: "1.5rem" }}>
                    {error && (
                        <div style={{ padding: "1rem", background: "oklch(0.6 0.2 20 / 0.1)", color: "var(--color-danger)", borderRadius: 8 }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Asset Name</label>
                            <input name="name" type="text" className="input" required placeholder="e.g. Downtown Luxury Apartment" />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Asset Type</label>
                            <select name="assetType" className="input" required>
                                <option value="real_estate">Real Estate</option>
                                <option value="bond">Bond / Fixed Income</option>
                                <option value="project">Infrastructure Project</option>
                                <option value="art">Fine Art</option>
                                <option value="metal">Precious Metal</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Description</label>
                        <textarea name="description" className="input" required rows={4} placeholder="Detailed description of the asset..." />
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Location</label>
                        <input name="location" type="text" className="input" required placeholder="City, Country" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Token Price (USD)</label>
                            <input name="tokenPrice" type="number" step="0.01" className="input" required placeholder="50.00" />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Total Tokens to Issue</label>
                            <input name="totalTokens" type="number" className="input" required placeholder="10000" />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Expected Annual Yield (%)</label>
                            <input name="expectedYield" type="number" step="0.1" className="input" required placeholder="8.5" />
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Risk Level</label>
                            <select name="riskLevel" className="input" required>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem", color: "var(--color-muted)" }}>Image URL (Optional)</label>
                        <input name="image" type="url" className="input" placeholder="https://..." />
                        <p style={{ color: "var(--color-muted)", fontSize: "0.8rem", marginTop: "0.5rem" }}>Leave blank to use a default placeholder image.</p>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: "1rem", padding: "1rem", width: "100%" }}>
                        {loading ? "Deploying Smart Contract (Wait ~15s)..." : "Deploy & Publish to Sepolia"}
                    </button>
                    <p style={{ color: "var(--color-muted)", fontSize: "0.8rem", textAlign: "center" }}>
                        Clicking this will immediately deploy an ERC-20 Token clone on the Sepolia Blockchain using the Factory pattern.
                    </p>
                </form>
            </div>
        </div>
    );
}
