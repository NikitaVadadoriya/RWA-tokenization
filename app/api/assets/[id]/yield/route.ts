import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Distribution from "@/models/Distribution";
import { auth } from "@/lib/auth";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const params = await context.params;
        await connectDB();

        const distributions = await Distribution.find({ assetId: params.id })
            .sort({ createdAt: -1 })
            .limit(12); // Last 12 payouts for the chart

        return NextResponse.json(distributions);
    } catch (error: any) {
        console.error("Fetch Yield Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
