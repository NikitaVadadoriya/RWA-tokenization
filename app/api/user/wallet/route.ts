import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const { walletAddress } = await req.json();
        if (!walletAddress) return NextResponse.json({ error: "Missing address" }, { status: 400 });

        await connectDB();
        await User.findByIdAndUpdate(session.user.id, { walletAddress });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Wallet update error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
