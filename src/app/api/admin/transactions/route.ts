import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import TransactionModel from "@/models/Transaction";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as unknown as Record<string, unknown>).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") || "200");

        const query: Record<string, unknown> = {};
        if (type && type !== "all") query.type = type;
        if (status && status !== "all") query.status = status;

        const transactions = await TransactionModel.find(query)
            .populate("assetId", "name assetType tokenPrice contractAddress")
            .populate("userId", "name email walletAddress")
            .sort({ createdAt: -1 })
            .limit(limit);

        // Aggregate stats
        const totalVolume = transactions.reduce((s, t) => s + t.totalAmount, 0);
        const totalFees = transactions.reduce((s, t) => s + t.fee, 0);

        return NextResponse.json({
            transactions,
            stats: {
                count: transactions.length,
                totalVolume,
                totalFees,
            },
        });
    } catch (error) {
        console.error("Admin transactions error:", error);
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}
