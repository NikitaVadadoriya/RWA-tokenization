import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import Asset from "@/models/Asset";
import { auth } from "@/lib/auth";

const orderSchema = z.object({
    assetId: z.string(),
    type: z.enum(["buy", "sell"]),
    quantity: z.number().int().positive(),
    pricePerToken: z.number().positive(),
    onChainOrderId: z.number().optional(),
    txHash: z.string().optional()
});

// M4: List open orders for an asset
export async function GET(req: NextRequest) {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("assetId");
    const filter = assetId ? { assetId, status: "open" } : { status: "open" };
    const orders = await Order.find(filter)
        .populate("userId", "name walletAddress")
        .populate("assetId", "name assetType")
        .sort({ createdAt: -1 });
    return NextResponse.json(orders);
}

// M4: Place a buy or sell order
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as { id: string; kycStatus?: string };
    if (user.kycStatus !== "verified") {
        return NextResponse.json({ error: "KYC required to trade" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const parsed = orderSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        await connectDB();
        const asset = await Asset.findById(parsed.data.assetId);
        if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

        const order = await Order.create({
            ...parsed.data,
            userId: user.id,
            status: "open",
            onChainOrderId: parsed.data.onChainOrderId,
            txHash: parsed.data.txHash
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error("Order error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
