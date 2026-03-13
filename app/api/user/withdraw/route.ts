import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Withdrawal from "@/models/Withdrawal";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "investor") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { amount, bankDetails } = body;

        if (!amount || amount < 50) {
            return NextResponse.json({ error: "Minimum withdrawal amount is $50" }, { status: 400 });
        }

        if (!bankDetails || !bankDetails.accountName || !bankDetails.accountNumber) {
            return NextResponse.json({ error: "Bank details are required" }, { status: 400 });
        }

        await connectDB();

        // Note: In a real app we'd verify they have > $amount in available fiat balance.
        // For standard flow, we log the off-ramp request.

        const withdrawal = await Withdrawal.create({
            userId: session.user.id,
            amount: Number(amount),
            bankDetails: bankDetails,
            status: "pending"
        });

        return NextResponse.json({ success: true, withdrawal });
    } catch (error: any) {
        console.error("Withdrawal Error:", error);
        return NextResponse.json({ error: "Server error handling withdrawal" }, { status: 500 });
    }
}
