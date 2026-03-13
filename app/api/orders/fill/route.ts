import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import Transaction from "@/models/Transaction";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const body = await req.json();
        const { orderId, txHash } = body;

        await connectDB();

        const order = await Order.findById(orderId);
        if (!order || order.status !== "open") {
            return NextResponse.json({ error: "Order not found or inactive" }, { status: 400 });
        }

        // Mark Order as filled
        order.status = "filled";
        order.filledBy = session.user.id;
        if (txHash) order.txHash = txHash;
        await order.save();

        // Optional: We can also record dual Transactions here for the portfolio page (One sale for Seller, one purchase for Buyer)
        // Seller Record
        await Transaction.create({
            userId: order.userId,
            assetId: order.assetId,
            type: "sale",
            quantity: order.quantity,
            price: order.pricePerToken,
            amount: order.quantity * order.pricePerToken,
            status: "completed",
            txHash
        });

        // Buyer Record
        await Transaction.create({
            userId: session.user.id,
            assetId: order.assetId,
            type: "purchase",
            quantity: order.quantity,
            price: order.pricePerToken,
            amount: order.quantity * order.pricePerToken,
            status: "completed",
            txHash
        });

        return NextResponse.json({ success: true, order });
    } catch (error) {
        console.error("Fill order error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
