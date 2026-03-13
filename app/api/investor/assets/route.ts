import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";

// M2: Investor browses available marketplace assets
export async function GET() {
    try {
        await connectDB();
        // Only return assets that are funding or active
        const assets = await Asset.find({ status: { $in: ["funding", "active"] } })
            .select("-createdBy -updatedAt")
            .sort({ createdAt: -1 });

        return NextResponse.json(assets);
    } catch (error) {
        console.error("Fetch marketplace assets error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
