import hre from "hardhat";

/// Deploy script — run this ONCE on Ethereum Sepolia
/// After deployment, update FACTORY_ADDRESS and DISTRIBUTOR_FACTORY_ADDRESS in .env.local
/// Every new asset → call factory.createToken() (cheap clone, ~50k gas)

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // ── 1. Deploy RWATokenFactory ────────────────────────────────────────────
    console.log("1. Deploying RWATokenFactory (one-time)...");
    const RWATokenFactory = await hre.ethers.getContractFactory("RWATokenFactory");
    const tokenFactory = await RWATokenFactory.deploy(deployer.address);
    await tokenFactory.waitForDeployment();
    const tokenFactoryAddr = await tokenFactory.getAddress();
    console.log("   ✅ RWATokenFactory:", tokenFactoryAddr);

    // ── 2. Deploy IncomeDistributorFactory ──────────────────────────────────
    console.log("2. Deploying IncomeDistributorFactory (one-time)...");
    const DistributorFactory = await hre.ethers.getContractFactory("IncomeDistributorFactory");
    const distributorFactory = await DistributorFactory.deploy(deployer.address);
    await distributorFactory.waitForDeployment();
    const distributorFactoryAddr = await distributorFactory.getAddress();
    console.log("   ✅ IncomeDistributorFactory:", distributorFactoryAddr);

    // ── 3. Deploy OrderBook ──────────────────────────────────────────────────
    console.log("3. Deploying OrderBook (share between all assets)...");
    const OrderBook = await hre.ethers.getContractFactory("OrderBook");
    const orderBook = await OrderBook.deploy(deployer.address, deployer.address);
    await orderBook.waitForDeployment();
    const orderBookAddr = await orderBook.getAddress();
    console.log("   ✅ OrderBook:", orderBookAddr);

    // ── 4. Demo: Create a token for a sample asset (via factory clone) ───────
    console.log("\n4. Creating demo RWA Token via factory (cheap clone)...");
    const demoTx = await tokenFactory.createToken(
        "Downtown Tower Token",
        "DTT",
        "demo-asset-001",
        200000 // 200,000 tokens at $100 = $20M property
    );
    const demoReceipt = await demoTx.wait();
    const demoTokenAddr = await tokenFactory.tokenForAsset("demo-asset-001");
    console.log("   ✅ Demo token created:", demoTokenAddr);
    console.log("   Gas used for clone:", demoReceipt?.gasUsed.toString(), "(vs ~1,500,000 for full deploy)");

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ All contracts deployed on Ethereum Sepolia!");
    console.log("\nAdd these to your .env.local:\n");
    console.log(`TOKEN_FACTORY_ADDRESS=${tokenFactoryAddr}`);
    console.log(`DISTRIBUTOR_FACTORY_ADDRESS=${distributorFactoryAddr}`);
    console.log(`ORDER_BOOK_ADDRESS=${orderBookAddr}`);
    console.log("\nNew asset = call factory.createToken() — no new bytecode deployment needed!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
