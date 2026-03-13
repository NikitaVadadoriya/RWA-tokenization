import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import User from "@/models/User";
import InvestForm from "@/components/InvestForm";

async function getAsset(id: string) {
    try {
        await connectDB();
        const asset = await Asset.findById(id);
        if (!asset) return null;
        return JSON.parse(JSON.stringify(asset));
    } catch {
        return null;
    }
}

async function getUserKycStatus(userId: string) {
    await connectDB();
    const user = await User.findById(userId);
    return user?.kycStatus || "not_started";
}

export default async function AssetDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const resolvedParams = await params;
    const asset = await getAsset(resolvedParams.id);
    if (!asset) notFound();

    const kycStatus = await getUserKycStatus(session.user.id as string);
    const isVerified = kycStatus === "verified";

    const pct = Math.round(((asset.totalTokens - asset.availableTokens) / asset.totalTokens) * 100);

    return (
        <div style={{ minHeight: "100vh", padding: "2rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 400px", gap: "2rem", alignItems: "start" }}>

                {/* Left Column: Asset Details */}
                <div>
                    {/* Header */}
                    <div style={{ marginBottom: "2rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                            <span style={{ background: "var(--color-surface-2)", padding: "0.2rem 0.75rem", borderRadius: 99, fontSize: "0.8rem", fontWeight: 600, textTransform: "capitalize" }}>
                                {asset.assetType.replace("_", " ")}
                            </span>
                            {asset.status === "funding" && (
                                <span style={{ background: "oklch(0.55 0.15 150 / 0.15)", color: "var(--color-success)", padding: "0.2rem 0.75rem", borderRadius: 99, fontSize: "0.8rem", fontWeight: 600 }}>
                                    ● Active Funding
                                </span>
                            )}
                        </div>
                        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", fontWeight: 800 }}>{asset.name}</h1>
                        <p style={{ color: "var(--color-muted)", fontSize: "1.1rem" }}>📍 {asset.location}</p>
                    </div>

                    {/* Image Gallery */}
                    <div style={{ aspectRatio: "16/9", background: "var(--color-surface-2)", borderRadius: 16, overflow: "hidden", marginBottom: "2rem", border: "1px solid var(--color-border)" }}>
                        {asset.images && asset.images.length > 0 ? (
                            <img src={asset.images[0]} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)" }}>
                                No images available
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="card" style={{ marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Investment Overview</h2>
                        <p style={{ color: "var(--color-muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {asset.description}
                        </p>
                    </div>
                </div>

                {/* Right Column: Investment Panel */}
                <div style={{ position: "sticky", top: "2rem" }} className="card">
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>Investment Details</h2>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                        <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: 12 }}>
                            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Token Price</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>${asset.tokenPrice.toFixed(2)}</div>
                        </div>
                        <div style={{ background: "var(--color-surface-2)", padding: "1rem", borderRadius: 12 }}>
                            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Expected APY</div>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-primary)" }}>{asset.expectedYield || 0}%</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--color-muted)", marginBottom: "0.4rem" }}>
                            <span>{pct}% funded</span>
                            <span>{asset.availableTokens.toLocaleString()} tokens left</span>
                        </div>
                        <div style={{ height: 6, background: "var(--color-surface-2)", borderRadius: 3 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(135deg, var(--color-primary), var(--color-gold))`, borderRadius: 3 }} />
                        </div>
                    </div>

                    {asset.status === "funding" ? (
                        isVerified ? (
                            <InvestForm assetId={asset._id} maxTokens={asset.availableTokens} />
                        ) : (
                            <div style={{ background: "oklch(0.65 0.2 25 / 0.1)", border: "1px solid oklch(0.65 0.2 25 / 0.3)", borderRadius: 12, padding: "1.5rem", textAlign: "center" }}>
                                <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>🔒</span>
                                <div style={{ fontWeight: 600, color: "var(--color-danger)", marginBottom: "0.5rem" }}>KYC Required</div>
                                <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>You must complete identity verification before investing.</div>
                                <a href="/investor/kyc" className="btn btn-gold" style={{ width: "100%" }}>Complete KYC</a>
                            </div>
                        )
                    ) : (
                        <button disabled className="btn" style={{ width: "100%", padding: "1rem", background: "var(--color-surface-2)", color: "var(--color-muted)", cursor: "not-allowed" }}>
                            Funding Closed
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
