import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import { auth } from "@/lib/auth";
import { z } from "zod";

const assetSchema = z.object({
    assetType: z.enum(["real_estate", "bond", "project", "art", "metal"]),
    name: z.string().min(3),
    description: z.string().min(10),
    location: z.string().optional(),
    images: z.array(z.string().url()).min(1),
    totalTokens: z.number().int().min(1),
    tokenPrice: z.number().min(0.01),
    expectedYield: z.number().optional(),
    legalDocuments: z.array(z.string().url()),
    spvEntity: z.string().optional(),
});

// M8: Admin lists all assets
export async function GET() {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    try {
        await connectDB();
        const assets = await Asset.find().sort({ createdAt: -1 });
        return NextResponse.json(assets);
    } catch (error) {
        console.error("Fetch assets error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// M8: Admin creates a new asset (Onboarding)
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
        return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const parsed = assetSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        await connectDB();

        const asset = await Asset.create({
            ...parsed.data,
            availableTokens: parsed.data.totalTokens,
            status: "draft", // Starts in draft until tokens are minted
            createdBy: session.user.id,
        });

        return NextResponse.json(asset, { status: 201 });
    } catch (error) {
        console.error("Asset creation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
