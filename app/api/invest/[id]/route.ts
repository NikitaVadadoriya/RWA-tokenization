import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { whitelistInvestor, getAdminWallet } from "@/lib/blockchain";
import { Contract, ethers } from "ethers";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RWATokenArtifact = require("../../../../contracts/artifacts/contracts/RWAToken.sol/RWAToken.json");

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    try {
        const { amount } = await req.json();
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

        const resolvedParams = await params;

        await connectDB();
        const user = await User.findById(session.user.id);
        if (!user || user.kycStatus !== "verified" || !user.walletAddress) {
            return NextResponse.json({ error: "KYC and Wallet required" }, { status: 403 });
        }

        const asset = await Asset.findById(resolvedParams.id);
        if (!asset || asset.status !== "funding") {
            return NextResponse.json({ error: "Asset not available" }, { status: 404 });
        }
        if (asset.availableTokens < numAmount) {
            return NextResponse.json({ error: "Not enough tokens available" }, { status: 400 });
        }
        if (!asset.contractAddress) {
            return NextResponse.json({ error: "Smart contract not deployed yet" }, { status: 400 });
        }

        // 1. Whitelist the investor on-chain if not already done
        const wallet = getAdminWallet();
        const tokenContract = new Contract(asset.contractAddress, RWATokenArtifact.abi, wallet);

        const isWhitelisted = await tokenContract.kycWhitelist(user.walletAddress);
        if (!isWhitelisted) {
            console.log("Whitelisting investor: ", user.walletAddress);
            await whitelistInvestor(asset.contractAddress, user.walletAddress, true);
        }

        // 2. Transfer tokens from Admin to Investor
        console.log(`Transferring ${numAmount} tokens to ${user.walletAddress}`);
        const tx = await tokenContract.transfer(
            user.walletAddress,
            ethers.parseUnits(numAmount.toString(), 18)
        );
        await tx.wait();

        // 3. Update DB
        asset.availableTokens -= numAmount;
        if (asset.availableTokens === 0) asset.status = "active";
        await asset.save();

        // 4. Create Transaction record so the portfolio UI can index this holding
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const TransactionModel = require("@/models/Transaction").default;
        await TransactionModel.create({
            userId: user._id,
            assetId: asset._id,
            type: "purchase",
            quantity: numAmount,
            amount: numAmount * asset.tokenPrice,
            txHash: tx.hash,
        });

        return NextResponse.json({ success: true, txHash: tx.hash });
    } catch (error: any) {
        console.error("Investment error:", error);
        return NextResponse.json({ error: error.message || "Failed to process investment" }, { status: 500 });
    }
}
