import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with:", deployer.address);

    // Deploy RWAToken
    const RWAToken = await ethers.getContractFactory("RWAToken");
    const rwaToken = await RWAToken.deploy("RWA Real Estate Token", "RWRE", 1000000);
    await rwaToken.waitForDeployment();
    const tokenAddress = await rwaToken.getAddress();
    console.log("RWAToken deployed to:", tokenAddress);

    // Deploy IncomeDistributor
    const IncomeDistributor = await ethers.getContractFactory("IncomeDistributor");
    const distributor = await IncomeDistributor.deploy(tokenAddress);
    await distributor.waitForDeployment();
    console.log("IncomeDistributor deployed to:", await distributor.getAddress());

    // Deploy OrderBook
    const OrderBook = await ethers.getContractFactory("OrderBook");
    const orderBook = await OrderBook.deploy(tokenAddress);
    await orderBook.waitForDeployment();
    console.log("OrderBook deployed to:", await orderBook.getAddress());

    // Enable trading
    await rwaToken.setTradingEnabled(true);
    console.log("Trading enabled on RWAToken");

    console.log("\nDeployment complete!");
    console.log("Save these addresses in your .env.local file.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
