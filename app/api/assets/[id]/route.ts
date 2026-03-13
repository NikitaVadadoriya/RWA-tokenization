import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import Transaction from "@/models/Transaction";
import { auth } from "@/lib/auth";
import { mintTokens, whitelistInvestor } from "@/lib/blockchain";
import { z } from "zod";

// M2: Get single asset details
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await connectDB();
    const asset = await Asset.findById(id);
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(asset);
}

const purchaseSchema = z.object({
    quantity: z.number().int().positive(),
    walletAddress: z.string().min(42).max(42),
});

// M2: Investor buys tokens (purchase flow)
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as { id: string; kycStatus?: string };
    if (user.kycStatus !== "verified") {
        return NextResponse.json({ error: "KYC verification required" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const parsed = purchaseSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        await connectDB();
        const asset = await Asset.findById(id);
        if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        if (asset.availableTokens < parsed.data.quantity) {
            return NextResponse.json({ error: "Insufficient tokens available" }, { status: 400 });
        }
        if (!asset.contractAddress) {
            return NextResponse.json({ error: "Asset contract not deployed yet" }, { status: 400 });
        }

        // Whitelist investor and mint tokens on Sepolia
        await whitelistInvestor(asset.contractAddress, parsed.data.walletAddress, true);
        const txHash = await mintTokens(
            asset.contractAddress,
            parsed.data.walletAddress,
            parsed.data.quantity
        );

        // Update available tokens
        asset.availableTokens -= parsed.data.quantity;
        await asset.save();

        // Record transaction
        const transaction = await Transaction.create({
            userId: user.id,
            assetId: asset._id,
            type: "purchase",
            quantity: parsed.data.quantity,
            amount: parsed.data.quantity * asset.tokenPrice,
            pricePerToken: asset.tokenPrice,
            txHash,
            status: "confirmed",
        });

        return NextResponse.json({ transaction, txHash }, { status: 201 });
    } catch (error) {
        console.error("Purchase error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
