import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import TransactionModel from "@/models/Transaction";
import OrderModel from "@/models/Order";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const userId = String((session.user as unknown as Record<string, unknown>).id);

        // Aggregate holdings from purchase and sale transactions
        const transactions = await TransactionModel.find({ userId })
            .populate("assetId", "name assetType tokenPrice tokenPriceEth images location expectedYield")
            .sort({ createdAt: -1 });

        // Also get open/partial sell orders to deduct from holdings
        const pendingSellOrders = await OrderModel.find({
            userId,
            type: "sell",
            status: { $in: ["open", "partial"] },
        });

        // Build a map: assetId → total quantity listed for sale
        const sellOrderMap: Record<string, number> = {};
        for (const order of pendingSellOrders) {
            const assetIdStr = String(order.assetId);
            const remainingQty = order.quantity - (order.filled || 0);
            sellOrderMap[assetIdStr] = (sellOrderMap[assetIdStr] || 0) + remainingQty;
        }

        // Calculate portfolio holdings
        const holdingsMap: Record<string, {
            assetId: string;
            assetName: string;
            assetType: string;
            tokensOwned: number;
            tokensListedForSale: number;
            currentPrice: number;
            totalInvested: number;
            totalIncome: number;
            images: string[];
            location: string;
            expectedYield: number;
        }> = {};

        for (const tx of transactions) {
            const asset = tx.assetId as unknown as Record<string, unknown>;
            if (!asset || !asset._id) continue;
            const assetIdStr = String(asset._id);

            if (!holdingsMap[assetIdStr]) {
                holdingsMap[assetIdStr] = {
                    assetId: assetIdStr,
                    assetName: asset.name as string,
                    assetType: asset.assetType as string,
                    tokensOwned: 0,
                    tokensListedForSale: 0,
                    currentPrice: asset.tokenPrice as number,
                    totalInvested: 0,
                    totalIncome: 0,
                    images: asset.images as string[] || [],
                    location: asset.location as string || "",
                    expectedYield: asset.expectedYield as number || 0,
                };
            }

            const holding = holdingsMap[assetIdStr];
            if (tx.type === "purchase") {
                holding.tokensOwned += tx.quantity;
                holding.totalInvested += tx.totalAmount;
            } else if (tx.type === "sale") {
                holding.tokensOwned -= tx.quantity;
            } else if (tx.type === "distribution") {
                holding.totalIncome += tx.totalAmount;
            }
        }

        // Deduct pending sell orders from available tokens
        // To make this clear:
        // 'tokensOwned' in the UI actually represents 'Available Tokens'
        // 'tokensListedForSale' represents tokens in active sell orders
        // Total actual holdings = tokensOwned + tokensListedForSale
        for (const [assetIdStr, listedQty] of Object.entries(sellOrderMap)) {
            if (holdingsMap[assetIdStr]) {
                // Ensure we don't deduct more than we own if something went wrong
                const actualListed = Math.min(listedQty, holdingsMap[assetIdStr].tokensOwned);
                holdingsMap[assetIdStr].tokensListedForSale = actualListed;
                holdingsMap[assetIdStr].tokensOwned -= actualListed;
            }
        }

        const holdings = Object.values(holdingsMap).filter((h) => h.tokensOwned > 0 || h.tokensListedForSale > 0);
        const totalValue = holdings.reduce((sum, h) => sum + (h.tokensOwned + h.tokensListedForSale) * h.currentPrice, 0);
        const totalIncome = holdings.reduce((sum, h) => sum + h.totalIncome, 0);

        return NextResponse.json({
            holdings,
            totalValue,
            totalIncome,
            transactionCount: transactions.length,
        });
    } catch (error) {
        console.error("Portfolio error:", error);
        return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
    }
}
