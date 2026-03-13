import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import OrderModel from "@/models/Order";
import UserModel from "@/models/User";
import AssetModel from "@/models/Asset";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const userId = String((session.user as unknown as Record<string, unknown>).id);
        const { searchParams } = new URL(req.url);
        const mine = searchParams.get("mine");

        const query: Record<string, unknown> = {
            status: { $in: ["open", "partial"] },
        };

        // If mine=true, filter to only current user's orders
        if (mine === "true") {
            query.userId = userId;
        }

        const orders = await OrderModel.find(query)
            .populate("assetId", "name assetType tokenPrice tokenPriceEth images contractAddress orderBookAddress")
            .populate("userId", "name walletAddress")
            .sort({ createdAt: -1 })
            .limit(100);

        return NextResponse.json({
            orders,
            currentUserId: userId, // So frontend can highlight user's own orders
        });
    } catch (error) {
        console.error("Orders fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
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

        // Check KYC from DB (not session)
        const user = await UserModel.findById(userId);
        if (!user || user.kycStatus !== "verified") {
            return NextResponse.json({ error: "KYC verification required" }, { status: 403 });
        }

        const body = await req.json();
        const { assetId, type, quantity, pricePerToken, walletAddress, txHash: frontendTxHash, onChainOrderId: frontendOnChainOrderId } = body;

        if (!assetId || !type || !quantity || !pricePerToken) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const asset = await AssetModel.findById(assetId);
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        // Jurisdiction restriction check (M3.6)
        if (user.country && asset.restrictedCountries && asset.restrictedCountries.length > 0) {
            if (asset.restrictedCountries.includes(user.country)) {
                return NextResponse.json(
                    { error: `Trading restricted for your jurisdiction (${user.country})` },
                    { status: 403 }
                );
            }
        }

        // Investor tier access control (M3.7)
        const tierRank: Record<string, number> = { retail: 1, accredited: 2, institutional: 3 };
        const userTierRank = tierRank[user.investorTier] || 1;
        const requiredTierRank = tierRank[asset.minimumTier || "retail"] || 1;
        if (userTierRank < requiredTierRank) {
            return NextResponse.json(
                { error: `This asset requires ${asset.minimumTier} tier or higher. Your tier: ${user.investorTier}` },
                { status: 403 }
            );
        }
        // ---- PRICE VALIDATION ----
        // For buy orders: price must be >= asset's tokenPriceEth (can't buy below actual price)
        if (type === "buy" && asset.tokenPriceEth) {
            if (pricePerToken < asset.tokenPriceEth) {
                return NextResponse.json(
                    { error: `Buy price (${pricePerToken} ETH) cannot be below the token's minimum price (${asset.tokenPriceEth} ETH)` },
                    { status: 400 }
                );
            }
        }

        // For sell orders: check that user has enough tokens (from transactions & existing sell orders)
        if (type === "sell") {
            const TransactionModel = (await import("@/models/Transaction")).default;
            const txns = await TransactionModel.find({ userId, assetId });
            let balance = 0;
            for (const tx of txns) {
                if (tx.type === "purchase") balance += tx.quantity;
                else if (tx.type === "sale") balance -= tx.quantity;
            }
            // Deduct tokens already listed in open sell orders
            const existingSellOrders = await OrderModel.find({
                userId, assetId, type: "sell",
                status: { $in: ["open", "partial"] },
            });
            for (const o of existingSellOrders) {
                balance -= (o.quantity - (o.filled || 0));
            }
            if (quantity > balance) {
                return NextResponse.json(
                    { error: `Insufficient tokens. Available: ${balance}, Requested: ${quantity}` },
                    { status: 400 }
                );
            }
        }

        const totalPrice = quantity * pricePerToken;
        const onChainOrderId = frontendOnChainOrderId !== undefined ? Number(frontendOnChainOrderId) : undefined;

        // Use txHash from frontend (MetaMask-signed) if provided
        const txHash = frontendTxHash || "";

        // ---- DATABASE RECORD ----
        if (walletAddress) {
            await UserModel.findByIdAndUpdate(userId, { walletAddress });
        }

        const order = await OrderModel.create({
            userId,
            assetId,
            type,
            quantity,
            pricePerToken,
            totalPrice,
            status: "open",
            txHash,
            onChainOrderId,
        });

        return NextResponse.json({
            message: txHash
                ? `Order placed on-chain (TX: ${txHash})`
                : "Order placed (off-chain)",
            order,
            txHash,
        }, { status: 201 });
    } catch (error) {
        console.error("Order placement error:", error);
        return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
    }
}
