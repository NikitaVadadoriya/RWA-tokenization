import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";

async function getAssets() {
    await connectDB();
    const assets = await Asset.find().sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(assets));
}

export default async function AdminAssetsPage() {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") redirect("/login");

    const assets = await getAssets();

    return (
        <div style={{ minHeight: "100vh", padding: "2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700 }}>
                            Manage <span className="gradient-text">Assets</span>
                        </h1>
                        <p style={{ color: "var(--color-muted)", marginTop: "0.25rem" }}>Review drafts and publish them to the blockchain</p>
                    </div>
                    <a href="/admin/assets/new" className="btn btn-primary">+ List New Asset</a>
                </div>

                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}>
                                <th style={{ textAlign: "left", padding: "1rem", color: "var(--color-muted)", fontWeight: 500, fontSize: "0.875rem" }}>Asset Name</th>
                                <th style={{ textAlign: "left", padding: "1rem", color: "var(--color-muted)", fontWeight: 500, fontSize: "0.875rem" }}>Type & Location</th>
                                <th style={{ textAlign: "right", padding: "1rem", color: "var(--color-muted)", fontWeight: 500, fontSize: "0.875rem" }}>Financials</th>
                                <th style={{ textAlign: "center", padding: "1rem", color: "var(--color-muted)", fontWeight: 500, fontSize: "0.875rem" }}>Status</th>
                                <th style={{ textAlign: "right", padding: "1rem", color: "var(--color-muted)", fontWeight: 500, fontSize: "0.875rem" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "var(--color-muted)" }}>
                                        No assets found. Click "List New Asset" to create one.
                                    </td>
                                </tr>
                            ) : (
                                assets.map((asset: any) => (
                                    <tr key={asset._id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                                        <td style={{ padding: "1rem" }}>
                                            <div style={{ fontWeight: 600 }}>{asset.name}</div>
                                            <div style={{ color: "var(--color-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                                ID: {asset._id.substring(0, 8)}...
                                            </div>
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <div style={{ textTransform: "capitalize" }}>{asset.assetType.replace("_", " ")}</div>
                                            <div style={{ color: "var(--color-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{asset.location}</div>
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "right" }}>
                                            <div>${asset.tokenPrice} / token</div>
                                            <div style={{ color: "var(--color-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                                {asset.totalTokens.toLocaleString()} tokens ({asset.expectedYield}% yield)
                                            </div>
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "center" }}>
                                            <span className={`badge badge-${asset.status === "draft" ? "pending" : asset.status === "funding" ? "verified" : "ghost"}`}>
                                                {asset.status.toUpperCase()}
                                            </span>
                                            {asset.contractAddress && (
                                                <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--color-primary)", marginTop: "0.5rem" }}>
                                                    {asset.contractAddress.substring(0, 6)}...{asset.contractAddress.substring(38)}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "1rem", textAlign: "right" }}>
                                            {asset.status === "draft" ? (
                                                <form action={`/api/admin/assets/${asset._id}/publish`} method="POST">
                                                    <button type="submit" className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                                                        Deploy & Publish
                                                    </button>
                                                </form>
                                            ) : (
                                                <span style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>Live on Chain</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
