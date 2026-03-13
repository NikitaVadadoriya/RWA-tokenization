import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AssetModel from "@/models/Asset";
import { auth } from "@/lib/auth";
import { deployRWAToken } from "@/lib/blockchain";

export async function GET(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const assetType = searchParams.get("assetType");
        const status = searchParams.get("status") || "active";
        const search = searchParams.get("search");

        const query: Record<string, unknown> = {};
        if (assetType && assetType !== "all") query.assetType = assetType;
        if (status !== "all") query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } },
            ];
        }

        const assets = await AssetModel.find(query).sort({ createdAt: -1 });
        return NextResponse.json({ assets });
    } catch (error) {
        console.error("Assets fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as unknown as Record<string, unknown>).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();
        const body = await req.json();

        // Generate token symbol from asset name (e.g. "Dubai Marina Tower" -> "RW-DMT")
        const symbolBase = body.name
            .split(" ")
            .map((w: string) => w[0]?.toUpperCase())
            .join("")
            .slice(0, 4);
        const tokenSymbol = `RW-${symbolBase}`;
        const totalTokens = body.totalTokens || 10000;

        // Step 1: Deploy smart contract on Sepolia
        console.log(`📦 Creating asset "${body.name}" with on-chain token deployment...`);
        let contractAddress = "";
        let txHash = "";
        let orderBookAddress = "";
        let incomeDistributorAddress = "";

        try {
            // tokenPriceEth: price per token in ETH (e.g., 0.001 ETH = $2.50)
            // Admin can set this in the asset creation form
            const tokenPriceEth = body.tokenPriceEth || 0.001;

            const deployment = await deployRWAToken(
                `RWA ${body.name}`,
                tokenSymbol,
                totalTokens,
                tokenPriceEth
            );
            contractAddress = deployment.contractAddress;
            txHash = deployment.txHash;
            orderBookAddress = deployment.orderBookAddress;
            incomeDistributorAddress = deployment.incomeDistributorAddress;
            console.log(`✅ Contract deployed: ${contractAddress} (tx: ${txHash})`);
            console.log(`   OrderBook: ${orderBookAddress}`);
            console.log(`   IncomeDistributor: ${incomeDistributorAddress}`);
        } catch (deployError) {
            console.error("⚠️ Smart contract deployment failed:", deployError);
            // Still create asset in DB but without contract address
            // Admin can redeploy later
        }

        // Step 2: Save asset in database with contract address
        const asset = await AssetModel.create({
            ...body,
            contractAddress,
            orderBookAddress,
            incomeDistributorAddress,
            availableTokens: totalTokens,
            createdBy: String((session.user as unknown as Record<string, unknown>).id),
        });

        return NextResponse.json(
            {
                message: contractAddress
                    ? `Asset created & contracts deployed (Token: ${contractAddress}, OrderBook: ${orderBookAddress}, IncomeDistributor: ${incomeDistributorAddress})`
                    : "Asset created (contract deployment pending)",
                asset,
                contractAddress,
                orderBookAddress,
                incomeDistributorAddress,
                txHash,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Asset creation error:", error);
        return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
    }
}
