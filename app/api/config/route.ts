import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        orderBookAddress: process.env.ORDER_BOOK_ADDRESS || "",
        chainId: process.env.NEXT_PUBLIC_CHAIN_ID || "11155111" // Sepolia default
    });
}
