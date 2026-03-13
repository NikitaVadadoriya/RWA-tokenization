import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { createAssetToken, createAssetDistributor } from "@/lib/blockchain";
import mongoose from "mongoose";

const createAssetSchema = z.object({
    name: z.string().min(3),
    description: z.string().min(10),
    assetType: z.enum(["real_estate", "bond", "project", "art", "metal", "other"]),
    location: z.string().min(2),
    tokenPrice: z.number().positive(),
    totalTokens: z.number().positive(),
    expectedYield: z.number().min(0),
    riskLevel: z.enum(["low", "medium", "high"]),
    images: z.array(z.string().url()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const parsed = createAssetSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        await connectDB();

        // Generate a new ObjectId for the asset before creating it so we can pass it to the blockchain
        const assetId = new mongoose.Types.ObjectId();

        // Generate a simple token symbol from the name
        const symbol = parsed.data.name.split(" ").map(w => w[0]).join("").substring(0, 4).toUpperCase() + "RWA";

        // Deploy the ERC-20 Token Clone via the Factory on Sepolia
        const { tokenAddress } = await createAssetToken(
            parsed.data.name,
            symbol,
            assetId.toString(),
            parsed.data.totalTokens
        );

        // Deploy the Income Distributor Clone via its Factory
        const { distributorAddress } = await createAssetDistributor(
            tokenAddress,
            assetId.toString()
        );

        // Save to MongoDB with the deployed contract address and creator ID
        const asset = await Asset.create({
            _id: assetId,
            ...parsed.data,
            availableTokens: parsed.data.totalTokens,
            status: "funding", // Skip draft, go straight to active funding
            contractAddress: tokenAddress,
            distributorAddress: distributorAddress,
            createdBy: session.user.id, // Fixes Mongo ValidationError
        });

        return NextResponse.json(asset, { status: 201 });
    } catch (error: any) {
        console.error("Asset creation error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
