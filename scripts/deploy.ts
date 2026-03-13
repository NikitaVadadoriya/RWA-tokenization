import hre from "hardhat";
const { ethers, network } = hre;
import fs from "fs";
import path from "path";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contracts to ${network.name} with account: ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`Account balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
        throw new Error("Insufficient funds to deploy contracts.");
    }

    // 1. Deploy Factories
    console.log("Deploying RWATokenFactory...");
    const TokenFactory = await ethers.getContractFactory("RWATokenFactory");
    const tokenFactory = await TokenFactory.deploy(deployer.address);
    await tokenFactory.waitForDeployment();
    const tokenFactoryAddress = await tokenFactory.getAddress();
    console.log("✅ RWATokenFactory deployed to:", tokenFactoryAddress);

    console.log("Deploying IncomeDistributorFactory...");
    const DistFactory = await ethers.getContractFactory("IncomeDistributorFactory");
    const distFactory = await DistFactory.deploy(deployer.address);
    await distFactory.waitForDeployment();
    const distFactoryAddress = await distFactory.getAddress();
    console.log("✅ IncomeDistributorFactory deployed to:", distFactoryAddress);

    // 2. Deploy OrderBook
    console.log("Deploying OrderBook...");
    const OrderBook = await ethers.getContractFactory("OrderBook");
    const feeCollector = deployer.address; // Admin collects fees
    const orderBook = await OrderBook.deploy(deployer.address, feeCollector);
    await orderBook.waitForDeployment();
    const orderBookAddress = await orderBook.getAddress();
    console.log("✅ OrderBook deployed to:", orderBookAddress);

    // 3. Update .env.local
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = fs.readFileSync(envPath, "utf-8");

    // Regex to replace existing or append if not exists
    const updateEnv = (key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*`, "m");
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
    };

    updateEnv("TOKEN_FACTORY_ADDRESS", tokenFactoryAddress);
    updateEnv("DISTRIBUTOR_FACTORY_ADDRESS", distFactoryAddress);
    updateEnv("ORDER_BOOK_ADDRESS", orderBookAddress);

    const currentDate = new Date().toISOString().split('T')[0];
    envContent = envContent.replace(/# --- Deployed on Ethereum Sepolia \([^\)]+\) ---/g, `# --- Deployed on Ethereum Sepolia (${currentDate}) ---`);

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated .env.local with new contract addresses.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
