import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Transaction from "@/models/Transaction";
import Asset from "@/models/Asset";
import { auth } from "@/lib/auth";

// M6: Get investor portfolio (all their holdings + income earned)
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id: string }).id;

    await connectDB();

    // All transactions for this user
    const transactions = await Transaction.find({ userId })
        .populate("assetId", "name assetType tokenPrice images contractAddress")
        .sort({ createdAt: -1 });

    // Aggregate holdings per asset
    const holdingsMap: Record<string, {
        asset: unknown;
        totalTokens: number;
        totalInvested: number;
        totalIncome: number;
    }> = {};

    for (const tx of transactions) {
        if (!tx.assetId || !tx.assetId._id) continue;

        const assetIdStr = tx.assetId._id.toString();
        if (!holdingsMap[assetIdStr]) {
            holdingsMap[assetIdStr] = {
                asset: tx.assetId,
                totalTokens: 0,
                totalInvested: 0,
                totalIncome: 0,
            };
        }

        if (tx.type === "purchase") {
            holdingsMap[assetIdStr].totalTokens += tx.quantity || 0;
            holdingsMap[assetIdStr].totalInvested += tx.amount || 0;
        } else if (tx.type === "sale") {
            holdingsMap[assetIdStr].totalTokens -= tx.quantity || 0;
        } else if (tx.type === "distribution") {
            holdingsMap[assetIdStr].totalIncome += tx.amount || 0;
        }
    }

    const holdings = Object.values(holdingsMap).filter((h) => h.totalTokens > 0);
    const totalInvested = holdings.reduce((s, h) => s + h.totalInvested, 0);
    const totalIncome = holdings.reduce((s, h) => s + h.totalIncome, 0);

    return NextResponse.json({
        holdings,
        totalInvested,
        totalIncome,
        recentTransactions: transactions.slice(0, 10),
    });
}
