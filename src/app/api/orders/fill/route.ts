import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import OrderModel from "@/models/Order";
import TransactionModel from "@/models/Transaction";
import UserModel from "@/models/User";
import AssetModel from "@/models/Asset";
import { getRWATokenContract } from "@/lib/blockchain";

// POST /api/orders/fill — Fill an order: backend facilitates token transfer
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const fillerId = String((session.user as unknown as Record<string, unknown>).id);
        const body = await req.json();
        const { orderId, quantity, txHash, walletAddress } = body;

        if (!orderId || !quantity) {
            return NextResponse.json({ error: "Missing required fields (orderId, quantity)" }, { status: 400 });
        }

        // Find the order with asset details
        const order = await OrderModel.findById(orderId)
            .populate("assetId", "name tokenPrice tokenPriceEth contractAddress orderBookAddress");
        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        if (order.status !== "open" && order.status !== "partial") {
            return NextResponse.json({ error: "Order is not active" }, { status: 400 });
        }

        const remainingQty = order.quantity - (order.filled || 0);
        if (quantity > remainingQty) {
            return NextResponse.json({ error: `Cannot fill more than remaining quantity (${remainingQty})` }, { status: 400 });
        }

        // Get asset contract address
        const asset = order.assetId as unknown as Record<string, unknown>;
        const contractAddress = asset?.contractAddress as string;

        // Update filler's wallet address
        if (walletAddress) {
            await UserModel.findByIdAndUpdate(fillerId, { walletAddress });
        }

        // Get order maker's wallet
        const orderMaker = await UserModel.findById(order.userId);
        const orderMakerWallet = orderMaker?.walletAddress;

        let tokenTxHash = "";

        // ---- TOKEN TRANSFER LOGIC ----
        // If the asset has an OrderBook, the on-chain fillOrder already transferred the tokens.
        // The backend should only record the DB transaction — NOT duplicate the transfer.
        const orderBookAddress = asset?.orderBookAddress as string;

        if (orderBookAddress && txHash) {
            // On-chain OrderBook handled the transfer — use the frontend's txHash
            tokenTxHash = txHash;
            console.log(`✅ On-chain OrderBook fill confirmed (TX: ${txHash})`);
        } else if (contractAddress && walletAddress && orderMakerWallet) {
            // LEGACY FALLBACK: No OrderBook — backend facilitates transfer via admin
            try {
                const rwaToken = getRWATokenContract(contractAddress, true);

                if (order.type === "sell") {
                    // Filler is BUYER, order maker is SELLER
                    console.log(`📦 Transferring ${quantity} tokens: ${orderMakerWallet} → ${walletAddress} on ${contractAddress}`);

                    try {
                        await (await rwaToken.setKYCStatus(walletAddress, true)).wait();
                    } catch (e) {
                        console.warn("KYC set warning:", e);
                    }

                    // Use 18-decimal amount for transferFrom
                    const amountWei = BigInt(quantity) * BigInt("1000000000000000000");
                    const tx = await rwaToken.transferFrom(orderMakerWallet, walletAddress, amountWei);
                    await tx.wait();
                    tokenTxHash = tx.hash;
                    console.log(`✅ Token transfer complete: ${tokenTxHash}`);
                } else {
                    // Filler is SELLER, order maker is BUYER
                    console.log(`📦 Transferring ${quantity} tokens: ${walletAddress} → ${orderMakerWallet} on ${contractAddress}`);

                    try {
                        await (await rwaToken.setKYCStatus(orderMakerWallet, true)).wait();
                    } catch (e) {
                        console.warn("KYC set warning:", e);
                    }

                    // Use 18-decimal amount for transferFrom
                    const amountWei = BigInt(quantity) * BigInt("1000000000000000000");
                    const tx = await rwaToken.transferFrom(walletAddress, orderMakerWallet, amountWei);
                    await tx.wait();
                    tokenTxHash = tx.hash;
                    console.log(`✅ Token transfer complete: ${tokenTxHash}`);
                }
            } catch (error: unknown) {
                const errMsg = error instanceof Error ? error.message : "Unknown error";
                console.error("Token transfer failed:", errMsg);

                if (errMsg.includes("allowance") || errMsg.includes("insufficient") || errMsg.includes("exceeds")) {
                    return NextResponse.json({
                        error: "Token transfer failed: seller may not have approved the platform to transfer tokens.",
                    }, { status: 400 });
                }

                return NextResponse.json({
                    error: `Token transfer failed: ${errMsg}`,
                }, { status: 500 });
            }
        }

        const totalAmount = quantity * order.pricePerToken;
        const orderMakerId = String(order.userId);
        const finalTxHash = tokenTxHash || txHash || "";

        // Create transaction records for BOTH parties
        if (order.type === "sell") {
            // Filler is BUYER, order maker is SELLER
            await TransactionModel.create({
                userId: fillerId,
                assetId: order.assetId,
                type: "purchase",
                quantity,
                pricePerToken: order.pricePerToken,
                totalAmount,
                txHash: finalTxHash,
                status: "confirmed",
            });
            await TransactionModel.create({
                userId: orderMakerId,
                assetId: order.assetId,
                type: "sale",
                quantity,
                pricePerToken: order.pricePerToken,
                totalAmount,
                txHash: finalTxHash,
                status: "confirmed",
            });
        } else {
            // Filler is SELLER, order maker is BUYER
            await TransactionModel.create({
                userId: fillerId,
                assetId: order.assetId,
                type: "sale",
                quantity,
                pricePerToken: order.pricePerToken,
                totalAmount,
                txHash: finalTxHash,
                status: "confirmed",
            });
            await TransactionModel.create({
                userId: orderMakerId,
                assetId: order.assetId,
                type: "purchase",
                quantity,
                pricePerToken: order.pricePerToken,
                totalAmount,
                txHash: finalTxHash,
                status: "confirmed",
            });
        }

        // Update order filled count and status
        const newFilled = (order.filled || 0) + quantity;
        const newStatus = newFilled >= order.quantity ? "filled" : "partial";
        await OrderModel.findByIdAndUpdate(orderId, {
            filled: newFilled,
            status: newStatus,
        });

        console.log(`✅ Order ${orderId} filled: ${quantity} tokens of ${asset?.name || "Unknown"} (Token TX: ${tokenTxHash || "off-chain"})`);

        return NextResponse.json({
            message: `Order filled! ${quantity} tokens transferred${tokenTxHash ? ` (Token TX: ${tokenTxHash.slice(0, 12)}...)` : ""}`,
            txHash: finalTxHash,
            tokenTxHash,
            newStatus,
        });
    } catch (error) {
        console.error("Fill order error:", error);
        return NextResponse.json({ error: "Failed to fill order" }, { status: 500 });
    }
}

// PATCH /api/orders/fill — Manually reconcile an order that was filled on-chain but DB wasn't updated
export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();
        const { orderId, quantity, txHash, buyerWalletAddress } = body;

        if (!orderId || !quantity || !txHash) {
            return NextResponse.json({ error: "Missing required fields (orderId, quantity, txHash)" }, { status: 400 });
        }

        const order = await OrderModel.findById(orderId)
            .populate("assetId", "name tokenPrice tokenPriceEth contractAddress orderBookAddress");
        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Check if transactions already exist for this txHash to prevent duplicates
        const existingTx = await TransactionModel.findOne({ txHash });
        if (existingTx) {
            return NextResponse.json({ error: "Transactions already recorded for this txHash" }, { status: 400 });
        }

        // Find the buyer user by wallet address
        let buyerUserId: string | null = null;
        if (buyerWalletAddress) {
            const buyer = await UserModel.findOne({ walletAddress: { $regex: new RegExp(`^${buyerWalletAddress}$`, 'i') } });
            if (buyer) {
                buyerUserId = String(buyer._id);
            }
        }

        const totalAmount = quantity * order.pricePerToken;
        const orderMakerId = String(order.userId);
        const fillerId = buyerUserId || String((session.user as unknown as Record<string, unknown>).id);

        // Create transaction records
        if (order.type === "sell") {
            await TransactionModel.create({
                userId: fillerId,
                assetId: order.assetId,
                type: "purchase",
                quantity,
                pricePerToken: order.pricePerToken,
                totalAmount,
                txHash,
                status: "confirmed",
            });
            await TransactionModel.create({
                userId: orderMakerId,
                assetId: order.assetId,
                type: "sale",
                quantity,
                pricePerToken: order.pricePerToken,
                totalAmount,
                txHash,
                status: "confirmed",
            });
        } else {
            await TransactionModel.create({
                userId: fillerId,
                assetId: order.assetId,
                type: "sale",
                quantity,
                pricePerToken: order.pricePerToken,
                totalAmount,
                txHash,
                status: "confirmed",
            });
            await TransactionModel.create({
                userId: orderMakerId,
                assetId: order.assetId,
                type: "purchase",
                quantity,
                pricePerToken: order.pricePerToken,
                totalAmount,
                txHash,
                status: "confirmed",
            });
        }

        // Update order filled count and status
        const newFilled = (order.filled || 0) + quantity;
        const newStatus = newFilled >= order.quantity ? "filled" : "partial";
        await OrderModel.findByIdAndUpdate(orderId, {
            filled: newFilled,
            status: newStatus,
        });

        console.log(`✅ RECONCILED Order ${orderId}: ${quantity} tokens (TX: ${txHash})`);

        return NextResponse.json({
            message: `Order reconciled! ${quantity} tokens recorded for both parties.`,
            txHash,
            newStatus,
        });
    } catch (error) {
        console.error("Reconcile order error:", error);
        return NextResponse.json({ error: "Failed to reconcile order" }, { status: 500 });
    }
}
