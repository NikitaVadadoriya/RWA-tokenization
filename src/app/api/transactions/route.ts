import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import TransactionModel from "@/models/Transaction";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const userId = String((session.user as unknown as Record<string, unknown>).id);

        const transactions = await TransactionModel.find({ userId })
            .populate("assetId", "name assetType tokenPrice images contractAddress")
            .sort({ createdAt: -1 })
            .limit(200);

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error("Transactions fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const userId = String((session.user as unknown as Record<string, unknown>).id);

        const body = await req.json();
        const { assetId, amount, txHash } = body;

        const newTx = await TransactionModel.create({
            userId,
            assetId,
            type: "distribution",
            quantity: 0,
            pricePerToken: 0,
            totalAmount: amount,
            fee: 0,
            txHash,
            status: "confirmed",
        });

        return NextResponse.json({ message: "Transaction recorded successfully", transaction: newTx }, { status: 201 });
    } catch (error) {
        console.error("Transactions create error:", error);
        return NextResponse.json({ error: "Failed to record transaction" }, { status: 500 });
    }
}

