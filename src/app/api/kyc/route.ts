import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import KYCModel from "@/models/KYC";
import UserModel from "@/models/User";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const userId = String((session.user as unknown as Record<string, unknown>).id);
        const kyc = await KYCModel.findOne({ userId }).sort({ createdAt: -1 });

        return NextResponse.json({ kyc });
    } catch (error) {
        console.error("KYC fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch KYC" }, { status: 500 });
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

        const kyc = await KYCModel.create({
            userId,
            documentType: body.documentType,
            documentUrl: body.documentUrl || "/uploads/placeholder-id.jpg",
            proofOfAddress: body.proofOfAddress || "/uploads/placeholder-address.jpg",
            tier: body.tier || "retail",
            status: "pending",
        });

        await UserModel.findByIdAndUpdate(String(userId), { kycStatus: "pending" });

        return NextResponse.json({ message: "KYC submitted successfully", kyc }, { status: 201 });
    } catch (error) {
        console.error("KYC submit error:", error);
        return NextResponse.json({ error: "KYC submission failed" }, { status: 500 });
    }
}
