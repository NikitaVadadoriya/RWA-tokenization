import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import DistributionModel from "@/models/Distribution";
import AssetModel from "@/models/Asset";
import { getIncomeDistributorContract } from "@/lib/blockchain";

export async function GET() {
    try {
        await connectDB();
        const distributions = await DistributionModel.find()
            .populate("assetId", "name assetType tokenPrice contractAddress incomeDistributorAddress")
            .sort({ createdAt: -1 });

        return NextResponse.json({ distributions });
    } catch (error) {
        console.error("Distribution fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch distributions" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as unknown as Record<string, unknown>).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { assetId, totalAmount, schedule, description, txHash } = body;

        const asset = await AssetModel.findById(assetId);
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        // Management fee deduction (M5.4) — 1.5% fee
        const MANAGEMENT_FEE_PERCENT = 1.5;
        const feeAmount = (totalAmount * MANAGEMENT_FEE_PERCENT) / 100;
        const netAmount = totalAmount - feeAmount;

        // ---- DATABASE RECORD ----
        const onChainId = await DistributionModel.countDocuments();

        const distribution = await DistributionModel.create({
            assetId,
            totalAmount,
            feeAmount,
            netAmount,
            schedule: schedule || "monthly",
            description: description || "Income distribution",
            status: "completed",
            distributedAt: new Date(),
            txHash,
            onChainId,
            createdBy: String((session.user as unknown as Record<string, unknown>).id),
        });

        return NextResponse.json(
            {
                message: txHash
                    ? `Distribution deposited on-chain (net: $${netAmount}, fee: $${feeAmount}, TX: ${txHash})`
                    : `Distribution recorded (net: $${netAmount}, fee: $${feeAmount})`,
                distribution,
                txHash,
                feeAmount,
                netAmount,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Distribution error:", error);
        return NextResponse.json({ error: "Distribution failed" }, { status: 500 });
    }
}
