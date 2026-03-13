import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import WalletConnect from "@/components/WalletConnect";

export default async function InvestorDashboardPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    await connectDB();
    const liveUser = await User.findById(session.user.id);
    if (!liveUser) redirect("/login");

    const user = {
        id: liveUser._id.toString(),
        name: liveUser.name,
        kycStatus: liveUser.kycStatus,
        walletAddress: liveUser.walletAddress
    };

    return (
        <div style={{ minHeight: "100vh", padding: "2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700 }}>
                            Welcome back, <span className="gradient-text">{user.name?.split(" ")[0]}</span>
                        </h1>
                        <p style={{ color: "var(--color-muted)", marginTop: "0.25rem" }}>Track your real-world asset portfolio</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <WalletConnect currentWallet={user.walletAddress} />
                        {user.kycStatus !== "verified" && (
                            <a href="/investor/kyc" className="btn btn-gold" style={{ padding: "0.6rem 1.25rem" }}>
                                ⚠ Complete KYC
                            </a>
                        )}
                        <a href="/investor/marketplace" className="btn btn-primary" style={{ padding: "0.6rem 1.25rem" }}>
                            + Invest
                        </a>
                        <a href="/investor/assets/new" className="btn" style={{ background: "var(--color-surface-2)", color: "white", padding: "0.6rem 1.25rem", border: "1px solid var(--color-border)" }}>
                            List Asset
                        </a>
                    </div>
                </div>

                {/* KYC Banner */}
                {user.kycStatus === "pending" && (
                    <div style={{
                        marginBottom: "1.5rem",
                        background: "oklch(0.82 0.18 80 / 0.1)", border: "1px solid oklch(0.82 0.18 80 / 0.3)",
                        borderRadius: 12, padding: "1rem 1.5rem",
                        display: "flex", alignItems: "center", gap: "1rem"
                    }}>
                        <span style={{ fontSize: "1.5rem" }}>⏳</span>
                        <div>
                            <div style={{ fontWeight: 600, color: "var(--color-warning)" }}>KYC Under Review</div>
                            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Your documents are being verified. This usually takes 5–10 minutes.</div>
                        </div>
                    </div>
                )}

                {user.kycStatus === "not_started" && (
                    <div style={{
                        marginBottom: "1.5rem",
                        background: "oklch(0.65 0.2 25 / 0.1)", border: "1px solid oklch(0.65 0.2 25 / 0.3)",
                        borderRadius: 12, padding: "1rem 1.5rem",
                        display: "flex", alignItems: "center", gap: "1rem"
                    }}>
                        <span style={{ fontSize: "1.5rem" }}>🔒</span>
                        <div>
                            <div style={{ fontWeight: 600, color: "var(--color-danger)" }}>Identity Verification Required</div>
                            <div style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Complete KYC to invest in assets and trade on the marketplace.</div>
                        </div>
                        <a href="/investor/kyc" className="btn btn-primary" style={{ marginLeft: "auto", whiteSpace: "nowrap", padding: "0.5rem 1.25rem" }}>
                            Start KYC →
                        </a>
                    </div>
                )}

                {/* Stats Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                    {[
                        { label: "Portfolio Value", value: "$0.00", icon: "💼", change: "+0%" },
                        { label: "Income Earned", value: "$0.00", icon: "💰", change: "Total" },
                        { label: "Active Holdings", value: "0", icon: "📊", change: "Assets" },
                        { label: "Avg Yield", value: "0%", icon: "↗", change: "Annual" },
                    ].map((stat) => (
                        <div key={stat.label} className="stat-card">
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                                <span style={{ fontSize: "1.25rem" }}>{stat.icon}</span>
                                <span style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>{stat.label}</span>
                            </div>
                            <div style={{ fontSize: "1.75rem", fontWeight: 800 }}>{stat.value}</div>
                            <div style={{ color: "var(--color-success)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{stat.change}</div>
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                    {/* Holdings */}
                    <div className="card">
                        <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1.1rem" }}>Your Holdings</h2>
                        <div style={{ color: "var(--color-muted)", textAlign: "center", padding: "3rem 1rem" }}>
                            {user.kycStatus === "verified"
                                ? "No holdings yet. Browse the marketplace to invest."
                                : "Complete KYC verification to start investing."}
                        </div>
                        <a href="/investor/marketplace" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>
                            Browse Marketplace
                        </a>
                    </div>

                    {/* Recent Income */}
                    <div className="card">
                        <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1.1rem" }}>Recent Income</h2>
                        <div style={{ color: "var(--color-muted)", textAlign: "center", padding: "3rem 1rem" }}>
                            Income distributions will appear here once you own asset tokens.
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "1.5rem" }}>
                    {[
                        { href: "/investor/marketplace", label: "🏢 Real Estate", sub: "Browse properties" },
                        { href: "/investor/portfolio", label: "💼 Portfolio", sub: "Manage holdings" },
                        { href: "/investor/trade", label: "⚡ Trade", sub: "Secondary market" },
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
