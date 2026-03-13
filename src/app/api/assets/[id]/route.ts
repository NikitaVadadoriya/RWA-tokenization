import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AssetModel from "@/models/Asset";
import { auth } from "@/lib/auth";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const asset = await AssetModel.findById(id);
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }
        return NextResponse.json({ asset });
    } catch (error) {
        console.error("Asset fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;
        const body = await req.json();
        const asset = await AssetModel.findByIdAndUpdate(id, body, { new: true });
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Asset updated", asset });
    } catch (error) {
        console.error("Asset update error:", error);
        return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
    }
}
