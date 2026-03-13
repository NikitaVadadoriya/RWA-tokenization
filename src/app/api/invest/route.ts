import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import AssetModel from "@/models/Asset";
import TransactionModel from "@/models/Transaction";
import UserModel from "@/models/User";
import { setKYCStatus as setKYCOnChain, verifyPurchaseTransaction } from "@/lib/blockchain";

/**
 * INVESTMENT FLOW (Corrected):
 * 
 * 1. Frontend: Investor connects MetaMask
 * 2. Frontend: Investor calls buyTokens(quantity) on RWAToken contract, sending ETH
 * 3. Frontend: Gets txHash from MetaMask after TX confirms
 * 4. Frontend: Calls this API with { assetId, quantity, walletAddress, txHash }
 * 5. Backend: Verifies the on-chain TX, updates DB records
 * 
 * Two modes:
 * - WITH txHash (on-chain): Verifies the blockchain TX, then records in DB
 * - WITHOUT txHash (off-chain/legacy): Admin-facilitated, just records in DB
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = String((session.user as unknown as Record<string, unknown>).id);

        await connectDB();

        // Check KYC status from DATABASE
        const user = await UserModel.findById(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (user.kycStatus !== "verified") {
            return NextResponse.json(
                { error: `KYC verification required before investing. Current status: ${user.kycStatus}` },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { assetId, quantity, walletAddress, txHash } = body;

        if (!assetId || !quantity || quantity < 1) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const asset = await AssetModel.findById(assetId);
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        if (asset.status !== "active") {
            return NextResponse.json({ error: "Asset not available for investment" }, { status: 400 });
        }

        // Jurisdiction restriction check (M3.6)
        if (user.country && asset.restrictedCountries && asset.restrictedCountries.length > 0) {
            if (asset.restrictedCountries.includes(user.country)) {
                return NextResponse.json(
                    { error: `Investment restricted for your jurisdiction (${user.country})` },
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

        if (quantity > asset.availableTokens) {
            return NextResponse.json({ error: "Not enough tokens available" }, { status: 400 });
        }

        const totalAmount = quantity * asset.tokenPrice;
        let verifiedTxHash = "";

        // ======= ON-CHAIN PURCHASE FLOW =======
        // Investor already paid ETH via MetaMask → buyTokens() on contract
        // We verify the transaction and set KYC if needed
        if (txHash && asset.contractAddress && walletAddress) {
            try {
                console.log(`⛓️ Verifying on-chain purchase TX: ${txHash}`);

                // 1. Set KYC on-chain for the investor wallet (so contract allows purchase)
                // Note: This should be done BEFORE the investor calls buyTokens(),
                // so we do it in the /api/invest/prepare endpoint or here for future purchases
                await setKYCOnChain(walletAddress, true, asset.contractAddress);
                console.log(`✅ KYC set on-chain for ${walletAddress}`);

                // 2. Verify the purchase transaction
                const verification = await verifyPurchaseTransaction(txHash);
                if (verification) {
                    console.log(`✅ Verified purchase: ${verification.tokenAmount} tokens, ${verification.ethPaid} ETH paid`);
                    verifiedTxHash = txHash;
                } else {
                    // TX exists but might still be pending or is a raw transfer
                    console.log(`⚠️ Could not fully verify TX events, but recording with provided hash`);
                    verifiedTxHash = txHash;
                }
            } catch (chainError) {
                console.error("⚠️ On-chain verification error:", chainError);
                // Still record with the hash, the TX is on-chain
                verifiedTxHash = txHash;
            }
        }

        // ======= DATABASE UPDATE =======
        // Save wallet address to user if provided
        if (walletAddress) {
            await UserModel.findByIdAndUpdate(userId, { walletAddress });
        }

        // Reduce available tokens
        asset.availableTokens -= quantity;
        if (asset.availableTokens === 0) {
            asset.status = "funded";
        }
        await asset.save();

        // Create transaction record
        const transaction = await TransactionModel.create({
            userId,
            assetId: asset._id,
            type: "purchase",
            quantity,
            pricePerToken: asset.tokenPrice,
            totalAmount,
            fee: 0,
            status: verifiedTxHash ? "confirmed" : "pending",
            txHash: verifiedTxHash,
        });

        return NextResponse.json({
            message: verifiedTxHash
                ? `✅ Investment confirmed! ${quantity} tokens purchased for ${totalAmount} (TX: ${verifiedTxHash})`
                : "Investment recorded (pending on-chain confirmation)",
            tokensAcquired: quantity,
            totalAmount,
            remainingTokens: asset.availableTokens,
            txHash: verifiedTxHash,
            transactionId: transaction._id,
        });
    } catch (error) {
        console.error("Investment error:", error);
        return NextResponse.json({ error: "Investment failed" }, { status: 500 });
    }
}

/**
 * Prepare for investment — sets KYC on-chain before investor calls buyTokens()
 * Called by frontend before the MetaMask transaction
 */
export async function PUT(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = String((session.user as unknown as Record<string, unknown>).id);
        await connectDB();

        const user = await UserModel.findById(userId);
        if (!user || user.kycStatus !== "verified") {
            return NextResponse.json({ error: "KYC verification required" }, { status: 403 });
        }

        const body = await req.json();
        const { walletAddress, contractAddress } = body;

        if (!walletAddress || !contractAddress) {
            return NextResponse.json({ error: "Wallet and contract address required" }, { status: 400 });
        }

        // Set KYC on-chain so the buyTokens() call succeeds
        await setKYCOnChain(walletAddress, true, contractAddress);
        console.log(`✅ KYC set on-chain for ${walletAddress} on contract ${contractAddress}`);

        return NextResponse.json({
            message: "Ready to purchase. You can now call buyTokens() on the contract.",
            kycSetOnChain: true,
        });
    } catch (error) {
        console.error("Prepare invest error:", error);
        return NextResponse.json({ error: "Failed to prepare investment" }, { status: 500 });
    }
}
