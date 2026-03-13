import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Asset from "@/models/Asset";
import Transaction from "@/models/Transaction";
import Distribution from "@/models/Distribution";
import { auth } from "@/lib/auth";
import { ethers, Contract, JsonRpcProvider, Wallet } from "ethers";

const distributorAbi = [
    "function distribute(address[] calldata investors) external",
    "function pendingIncome() external view returns (uint256)"
];

const rpcUrl = process.env.SEPOLIA_RPC_URL as string;
const privateKey = process.env.PRIVATE_KEY as string;

// Distribute income to an asset's investors
export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user || (session.user as { role?: string }).role !== "admin") {
        return NextResponse.json({ error: "Unauthorized (Admin only)" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { assetId, totalAmount } = body;

        if (!assetId || !totalAmount) {
            return NextResponse.json({ error: "assetId and totalAmount are required" }, { status: 400 });
        }

        await connectDB();

        const asset = await Asset.findById(assetId);
        // Fallback for older assets missing a distributor
        if (!asset || !asset.distributorAddress) {
            return NextResponse.json({ error: "Asset not found or no distributor deployed" }, { status: 404 });
        }

        // 1. Send ETH/MATIC to the distributor contract first
        const provider = new JsonRpcProvider(rpcUrl);
        const adminWallet = new Wallet(privateKey, provider);

        // Ensure Admin has ETH to send
        const amountWei = ethers.parseEther(totalAmount.toString());

        console.log(`Depositing ${totalAmount} ETH to Distributor: ${asset.distributorAddress}`);
        const tx = await adminWallet.sendTransaction({
            to: asset.distributorAddress,
            value: amountWei
        });
        const depositReceipt = await tx.wait();

        // 2. Identify all investors who own the token off-chain to pass to distribute()
        // We look at the Transaction collection where type = purchase
        const txs = await Transaction.find({ assetId: asset._id }).populate("userId");

        // Extract unique valid ethereum addresses
        const uniqueAddresses = new Set<string>();
        for (const record of txs) {
            if (record.userId && record.userId.walletAddress && ethers.isAddress(record.userId.walletAddress)) {
                uniqueAddresses.add(record.userId.walletAddress);
            }
        }

        const investorsList = Array.from(uniqueAddresses);

        if (investorsList.length === 0) {
            // Money is in the contract, but no one to distribute it to yet
            return NextResponse.json({
                success: true,
                message: "Income deposited, but no valid investors to map.",
                txHash: tx.hash
            });
        }

        // 3. Call distribute(investors)
        console.log(`Distributing to ${investorsList.length} investors on-chain...`);
        const distributorContract = new Contract(asset.distributorAddress, distributorAbi, adminWallet);

        const distributeTx = await distributorContract.distribute(investorsList);
        await distributeTx.wait();

        // 4. Save Record to MongoDB
        const amountPerToken = totalAmount / asset.totalTokens;

        const distributionDoc = await Distribution.create({
            assetId: asset._id,
            totalAmount: Number(totalAmount),
            amountPerToken: amountPerToken,
            status: "processed",
            txHash: distributeTx.hash
        });

        // Optional: Create individual 'distribution' receipt records for each user
        // (Just an approximation off-chain since on-chain determines the actual fractional split)
        // We'll skip for performance over huge lists, and let the dashboard read from `Distribution`

        return NextResponse.json({
            success: true,
            distribution: distributionDoc
        });

    } catch (error: any) {
        console.error("Distribution Error:", error);
        return NextResponse.json({ error: error.message || "Failed to process distribution" }, { status: 500 });
    }
}
