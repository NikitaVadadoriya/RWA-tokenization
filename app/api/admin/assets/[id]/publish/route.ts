import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import { auth } from "@/lib/auth";
import { createAssetToken, createAssetDistributor } from "@/lib/blockchain";

/// POST /api/admin/assets/[id]/publish
/// Admin publishes a draft asset: deploys ERC-20 clone + IncomeDistributor clone via factory
/// This is the ONLY time blockchain calls are made — one factory call per asset ~50k gas
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    try {
        await connectDB();
        const asset = await Asset.findById(id);
        if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        if (asset.contractAddress) {
            return NextResponse.json({ error: "Asset already published" }, { status: 409 });
        }

        const assetId = asset._id.toString();

        // 1. Call factory.createToken() — clones the implementation (cheap, no new bytecode)
        const { tokenAddress, txHash: tokenTxHash } = await createAssetToken(
            asset.name,
            asset.name.slice(0, 5).toUpperCase().replace(/\s/g, ""), // auto-generate symbol
            assetId,
            asset.totalTokens
        );

        // 2. Call factory.createDistributor() — clones the distributor
        const { distributorAddress } = await createAssetDistributor(tokenAddress, assetId);

        // 3. Update asset in MongoDB with contract addresses
        asset.contractAddress = tokenAddress;
        asset.status = "funding";
        asset.metadata = {
            ...asset.metadata,
            distributorAddress,
            tokenTxHash,
            publishedAt: new Date().toISOString(),
        };
        await asset.save();

        return NextResponse.json({
            message: "Asset published successfully",
            tokenAddress,
            distributorAddress,
            txHash: tokenTxHash,
        });
    } catch (error) {
        console.error("Asset publish error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
