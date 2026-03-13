import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import TransactionModel from "@/models/Transaction";
import DistributionModel from "@/models/Distribution";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const userId = String((session.user as unknown as Record<string, unknown>).id);

        // Get user's asset IDs from transactions
        const transactions = await TransactionModel.find({ userId, type: "purchase" }).select("assetId");
        const assetIds = [...new Set(transactions.map(t => String(t.assetId)))];

        if (assetIds.length === 0) {
            return NextResponse.json({ distributions: [] });
        }

        // Get distributions for those assets
        const distributions = await DistributionModel.find({ assetId: { $in: assetIds } })
            .populate("assetId", "name assetType tokenPrice contractAddress incomeDistributorAddress")
            .sort({ createdAt: -1 });

        return NextResponse.json({ distributions });
    } catch (error) {
        console.error("Investor distributions error:", error);
        return NextResponse.json({ error: "Failed to fetch distributions" }, { status: 500 });
    }
}
