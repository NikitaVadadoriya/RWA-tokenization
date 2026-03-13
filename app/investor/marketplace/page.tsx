import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import Link from "next/link";

const assetTypeColors: Record<string, string> = {
    real_estate: "#0ea5e9",
    bond: "#a78bfa",
    project: "#f59e0b",
    art: "#ec4899",
    metal: "#d97706",
};

const assetTypeLabels: Record<string, string> = {
    real_estate: "Real Estate",
    bond: "Bond",
    project: "Infrastructure",
    art: "Fine Art",
    metal: "Precious Metal",
};

async function getAssets(type?: string) {
    await connectDB();
    const filter = type ? { assetType: type, status: "funding" } : { status: "funding" };
    return JSON.parse(JSON.stringify(await Asset.find(filter).sort({ createdAt: -1 })));
}

export default async function MarketplacePage({
    searchParams,
}: {
    searchParams: { type?: string };
}) {
    const assets = await getAssets(searchParams.type);
    const tabs = ["All", "real_estate", "bond", "project", "art", "metal"];

    return (
        <div style={{ minHeight: "100vh", padding: "2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                {/* Header */}
                <div style={{ marginBottom: "2.5rem" }}>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 700 }}>
                        Asset <span className="gradient-text">Marketplace</span>
                    </h1>
                    <p style={{ color: "var(--color-muted)", marginTop: "0.5rem" }}>
                        Invest in vetted, legally-structured real-world assets from $100
                    </p>
                </div>

                {/* Filters */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
                    {tabs.map((t) => {
                        const isActive = (searchParams.type || "All") === t;
                        return (
                            <Link
                                key={t}
                                href={t === "All" ? "/investor/marketplace" : `/investor/marketplace?type=${t}`}
                                className="btn"
                                style={{
                                    padding: "0.4rem 1rem",
                                    fontSize: "0.875rem",
                                    background: isActive ? "var(--color-primary)" : "var(--color-surface-2)",
                                    color: isActive ? "white" : "var(--color-muted)",
                                    border: "1px solid " + (isActive ? "var(--color-primary)" : "var(--color-border)"),
                                }}
                            >
                                {assetTypeLabels[t] || t}
                            </Link>
                        );
                    })}
                </div>

                {/* Asset Grid */}
                {assets.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "4rem", color: "var(--color-muted)" }}>
                        No assets available in this category yet.
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
                        {assets.map((asset: {
                            _id: string;
                            name: string;
                            assetType: string;
                            location?: string;
                            tokenPrice: number;
                            availableTokens: number;
                            totalTokens: number;
                            expectedYield?: number;
                            description: string;
                        }) => {
                            const pct = Math.round(((asset.totalTokens - asset.availableTokens) / asset.totalTokens) * 100);
                            const color = assetTypeColors[asset.assetType] || "#0ea5e9";
                            return (
                                <div key={asset._id} className="card card-hover" style={{ display: "flex", flexDirection: "column" }}>
                                    {/* Type Banner */}
                                    <div style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        marginBottom: "1rem"
                                    }}>
                                        <span style={{
                                            background: `${color}18`, border: `1px solid ${color}30`,
                                            color, borderRadius: 99, padding: "0.2rem 0.75rem",
                                            fontSize: "0.8rem", fontWeight: 600
                                        }}>
                                            {assetTypeLabels[asset.assetType]}
                                        </span>
                                        {asset.expectedYield && (
                                            <span className="yield-tag">↑ {asset.expectedYield}% APY</span>
                                        )}
                                    </div>

                                    <h3 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>{asset.name}</h3>
                                    {asset.location && (
                                        <p style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                                            📍 {asset.location}
                                        </p>
                                    )}
                                    <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", lineHeight: 1.55, marginBottom: "1.25rem", flexGrow: 1 }}>
                                        {asset.description.slice(0, 100)}...
                                    </p>

                                    {/* Progress */}
                                    <div style={{ marginBottom: "1.25rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "0.4rem" }}>
                                            <span>{pct}% funded</span>
                                            <span>{asset.availableTokens.toLocaleString()} tokens left</span>
                                        </div>
                                        <div style={{ height: 6, background: "var(--color-surface-2)", borderRadius: 3 }}>
                                            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(135deg, ${color}, ${color}99)`, borderRadius: 3, transition: "width 0.3s" }} />
                                        </div>
                                    </div>

                                    {/* Price & CTA */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div>
                                            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>${asset.tokenPrice}</div>
                                            <div style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>per token</div>
                                        </div>
                                        <Link href={`/investor/marketplace/${asset._id}`} className="btn btn-primary">
                                            Invest Now
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
