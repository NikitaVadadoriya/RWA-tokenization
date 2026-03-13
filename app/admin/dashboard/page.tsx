import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import KYC from "@/models/KYC";
import User from "@/models/User";

async function getAdminStats() {
    await connectDB();
    const [totalAssets, pendingKYC, totalUsers, activeAssets] = await Promise.all([
        Asset.countDocuments(),
        KYC.countDocuments({ status: "pending" }),
        User.countDocuments({ role: "investor" }),
        Asset.countDocuments({ status: "funding" }),
    ]);
    const recentKYC = await KYC.find({ status: "pending" })
        .populate("userId", "name email country")
        .sort({ createdAt: 1 })
        .limit(10);
    const recentAssets = await Asset.find().sort({ createdAt: -1 }).limit(5);
    return {
        totalAssets, pendingKYC, totalUsers, activeAssets,
        recentKYC: JSON.parse(JSON.stringify(recentKYC)),
        recentAssets: JSON.parse(JSON.stringify(recentAssets)),
    };
}

export default async function AdminDashboardPage() {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") redirect("/login");

    const stats = await getAdminStats();

    return (
        <div style={{ minHeight: "100vh", padding: "2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700 }}>
                            Admin <span className="gradient-text">Control Panel</span>
                        </h1>
                        <p style={{ color: "var(--color-muted)", marginTop: "0.25rem" }}>Platform operations and management (M8)</p>
                    </div>
                    <a href="/admin/assets/new" className="btn btn-primary">+ List New Asset</a>
                </div>

                {/* Stat Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                    {[
                        { label: "Total Assets", value: stats.totalAssets, icon: "🏢", color: "var(--color-primary)" },
                        { label: "Active Listings", value: stats.activeAssets, icon: "✅", color: "var(--color-success)" },
                        { label: "Pending KYC", value: stats.pendingKYC, icon: "⏳", color: "var(--color-warning)", alert: stats.pendingKYC > 0 },
                        { label: "Total Investors", value: stats.totalUsers, icon: "👥", color: "var(--color-gold)" },
                    ].map((s) => (
                        <div key={s.label} className="stat-card" style={{ borderColor: s.alert ? "oklch(0.82 0.18 80 / 0.4)" : undefined }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                <span>{s.icon}</span>
                                <span style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>{s.label}</span>
                            </div>
                            <div style={{ fontSize: "2rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    {/* Pending KYC */}
                    <div className="card">
                        <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1.1rem" }}>
                            Pending KYC Reviews
                            {stats.pendingKYC > 0 && (
                                <span style={{ marginLeft: "0.5rem", background: "oklch(0.82 0.18 80 / 0.2)", color: "var(--color-warning)", borderRadius: 99, padding: "0.15rem 0.6rem", fontSize: "0.8rem" }}>
                                    {stats.pendingKYC}
                                </span>
                            )}
                        </h2>
                        {stats.recentKYC.length === 0 ? (
                            <div style={{ color: "var(--color-muted)", textAlign: "center", padding: "2rem" }}>No pending KYC</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                {stats.recentKYC.map((kyc: {
                                    _id: string;
                                    userId: { name?: string; email?: string; country?: string };
                                    documentType: string;
                                    createdAt: string;
                                }) => (
                                    <div key={kyc._id} style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "0.875rem", background: "var(--color-surface-2)",
                                        borderRadius: 10, border: "1px solid var(--color-border)"
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{kyc.userId?.name}</div>
                                            <div style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>
                                                {kyc.userId?.email} • {kyc.documentType} • {kyc.userId?.country}
                                            </div>
                                        </div>
                                        <a href={`/admin/investors/${kyc.userId}`} className="btn btn-ghost" style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem" }}>
                                            Review →
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Assets */}
                    <div className="card">
                        <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1.1rem" }}>Recent Assets</h2>
                        {stats.recentAssets.length === 0 ? (
                            <div style={{ color: "var(--color-muted)", textAlign: "center", padding: "2rem" }}>No assets yet</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                {stats.recentAssets.map((a: { _id: string; name: string; assetType: string; status: string; tokenPrice: number; totalTokens: number; contractAddress?: string }) => (
                                    <div key={a._id} style={{
                                        padding: "0.875rem", background: "var(--color-surface-2)",
                                        borderRadius: 10, border: "1px solid var(--color-border)"
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ fontWeight: 600 }}>{a.name}</div>
                                            <span className={`badge badge-${a.status === "active" ? "verified" : "pending"}`}>{a.status}</span>
                                        </div>
                                        <div style={{ color: "var(--color-muted)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                                            {a.assetType} • ${a.tokenPrice}/token • {a.totalTokens.toLocaleString()} tokens
                                        </div>
                                        {!a.contractAddress && (
                                            <div style={{ color: "var(--color-warning)", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                                                ⚠ Contract not deployed
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Admin Quick Actions */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "1.5rem" }}>
                    {[
                        { href: "/admin/assets", label: "🏢 Manage Assets", sub: "Onboarding & status" },
                        { href: "/admin/investors", label: "👥 Investors", sub: "KYC & accounts" },
                        { href: "/admin/distributions", label: "💰 Distributions", sub: "Trigger income payouts" },
                    ].map((link) => (
                        <a key={link.href} href={link.href} className="card card-hover" style={{ display: "block", textDecoration: "none" }}>
                            <div style={{ fontWeight: 700 }}>{link.label}</div>
                            <div style={{ color: "var(--color-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{link.sub}</div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
