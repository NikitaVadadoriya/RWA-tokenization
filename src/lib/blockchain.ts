import { ethers } from "ethers";

// Contract addresses from Sepolia deployment
const RWA_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_RWA_TOKEN_ADDRESS || "0xCdf4a9829f1C0d329D1e00bd127B57C80De2f7C0";
const INCOME_DISTRIBUTOR_ADDRESS = process.env.NEXT_PUBLIC_INCOME_DISTRIBUTOR_ADDRESS || "0x6Af7631d5Ed5a7B8f14F0aF3AB4523406fEa8fDe";
const ORDER_BOOK_ADDRESS = process.env.NEXT_PUBLIC_ORDER_BOOK_ADDRESS || "0xa32a0d6713aeA10421112095C5399534472C3Ea9";

const RWA_TOKEN_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function mint(address to, uint256 amount)",
    "function setKYCStatus(address account, bool status)",
    "function batchSetKYCStatus(address[] accounts, bool status)",
    "function setTradingEnabled(bool enabled)",
    "function kycApproved(address) view returns (bool)",
    "function owner() view returns (address)",
    // New purchase flow functions
    "function buyTokens(uint256 quantity) payable",
    "function availableTokens() view returns (uint256)",
    "function tokenPriceWei() view returns (uint256)",
    "function setTokenPrice(uint256 newPriceWei)",
    "function withdrawFunds()",
    // Events
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Mint(address indexed to, uint256 amount)",
    "event TokensPurchased(address indexed buyer, uint256 tokenAmount, uint256 ethPaid)",
    "event FundsWithdrawn(address indexed to, uint256 amount)",
];

const INCOME_DISTRIBUTOR_ABI = [
    "function depositIncome(string description) payable",
    "function claimIncome(uint256 distributionId)",
    "function getDistributionCount() view returns (uint256)",
    "function getClaimableAmount(uint256 distributionId, address investor) view returns (uint256)",
    "function distributions(uint256) view returns (uint256 totalAmount, uint256 timestamp, uint256 totalSupplyAtTime, string description)",
];

const ORDER_BOOK_ABI = [
    "function placeBuyOrder(uint256 quantity, uint256 pricePerToken) payable",
    "function placeSellOrder(uint256 quantity, uint256 pricePerToken)",
    "function fillOrder(uint256 orderId, uint256 quantity) payable",
    "function cancelOrder(uint256 orderId)",
    "function getOrderCount() view returns (uint256)",
    "function orders(uint256) view returns (uint256 id, address trader, bool isBuyOrder, uint256 quantity, uint256 pricePerToken, uint256 filled, bool active, uint256 timestamp)",
];

function getProvider() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL not configured");
    return new ethers.JsonRpcProvider(rpcUrl);
}

function getAdminSigner() {
    const provider = getProvider();
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not configured");
    return new ethers.Wallet(privateKey, provider);
}

// Default contract getters using deployed addresses
export function getRWATokenContract(contractAddress?: string, withSigner = false) {
    const address = contractAddress || RWA_TOKEN_ADDRESS;
    if (withSigner) {
        return new ethers.Contract(address, RWA_TOKEN_ABI, getAdminSigner());
    }
    return new ethers.Contract(address, RWA_TOKEN_ABI, getProvider());
}

export function getIncomeDistributorContract(contractAddress?: string, withSigner = false) {
    const address = contractAddress || INCOME_DISTRIBUTOR_ADDRESS;
    if (withSigner) {
        return new ethers.Contract(address, INCOME_DISTRIBUTOR_ABI, getAdminSigner());
    }
    return new ethers.Contract(address, INCOME_DISTRIBUTOR_ABI, getProvider());
}

export function getOrderBookContract(contractAddress?: string, withSigner = false) {
    const address = contractAddress || ORDER_BOOK_ADDRESS;
    if (withSigner) {
        return new ethers.Contract(address, ORDER_BOOK_ABI, getAdminSigner());
    }
    return new ethers.Contract(address, ORDER_BOOK_ABI, getProvider());
}

export async function mintTokens(investorAddress: string, amount: string, contractAddress?: string) {
    const contract = getRWATokenContract(contractAddress, true);
    const tx = await contract.mint(investorAddress, ethers.parseEther(amount));
    await tx.wait();
    return tx.hash;
}

export async function getTokenBalance(walletAddress: string, contractAddress?: string) {
    const contract = getRWATokenContract(contractAddress);
    const balance = await contract.balanceOf(walletAddress);
    return ethers.formatEther(balance);
}

export async function setKYCStatus(walletAddress: string, approved: boolean, contractAddress?: string) {
    const contract = getRWATokenContract(contractAddress, true);
    const tx = await contract.setKYCStatus(walletAddress, approved);
    await tx.wait();
    return tx.hash;
}

/**
 * Get token price in wei from the contract
 */
export async function getTokenPriceWei(contractAddress?: string): Promise<bigint> {
    const contract = getRWATokenContract(contractAddress);
    return await contract.tokenPriceWei();
}

/**
 * Get available tokens from the contract (whole tokens, not raw decimals)
 */
export async function getAvailableTokens(contractAddress?: string): Promise<number> {
    const contract = getRWATokenContract(contractAddress);
    const available = await contract.availableTokens();
    return Number(available);
}

/**
 * Verify a purchase transaction on-chain
 * Returns the buyer address and amount if valid
 */
export async function verifyPurchaseTransaction(txHash: string): Promise<{
    buyer: string;
    tokenAmount: number;
    ethPaid: string;
    contractAddress: string;
} | null> {
    try {
        const provider = getProvider();
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt || receipt.status !== 1) return null;

        // Look for TokensPurchased event
        const iface = new ethers.Interface(RWA_TOKEN_ABI);
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
                if (parsed && parsed.name === "TokensPurchased") {
                    return {
                        buyer: parsed.args[0],
                        tokenAmount: Number(parsed.args[1]),
                        ethPaid: ethers.formatEther(parsed.args[2]),
                        contractAddress: log.address,
                    };
                }
            } catch {
                // Not our event, skip
            }
        }
        return null;
    } catch {
        return null;
    }
}

// Export addresses for use in other components
export const CONTRACT_ADDRESSES = {
    rwaToken: RWA_TOKEN_ADDRESS,
    incomeDistributor: INCOME_DISTRIBUTOR_ADDRESS,
    orderBook: ORDER_BOOK_ADDRESS,
};

// Deploy a NEW RWAToken contract for an asset
export async function deployRWAToken(
    name: string,
    symbol: string,
    totalSupply: number,
    tokenPriceEth: number // Price per token in ETH (e.g., 0.001)
): Promise<{ contractAddress: string; txHash: string; orderBookAddress: string; incomeDistributorAddress: string }> {
    // Load compiled contract artifact
    const fs = await import("fs");
    const path = await import("path");
    const artifactPath = path.join(process.cwd(), "artifacts/contracts/RWAToken.sol/RWAToken.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

    const signer = getAdminSigner();
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

    // Convert price to wei (e.g., 0.001 ETH = 1000000000000000 wei)
    const tokenPriceWei = ethers.parseEther(String(tokenPriceEth));

    console.log(`🚀 Deploying RWAToken: ${name} (${symbol}) supply: ${totalSupply}, price: ${tokenPriceEth} ETH...`);
    const contract = await factory.deploy(name, symbol, totalSupply, tokenPriceWei);
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    const txHash = contract.deploymentTransaction()?.hash || "";

    // Enable trading on the new contract
    const tokenContract = new ethers.Contract(contractAddress, artifact.abi, signer);
    const enableTx = await tokenContract.setTradingEnabled(true);
    await enableTx.wait();

    console.log(`✅ RWAToken deployed at: ${contractAddress} (tx: ${txHash})`);

    // Deploy OrderBook for this token
    let orderBookAddress = "";
    try {
        orderBookAddress = await deployOrderBook(contractAddress);
        console.log(`✅ OrderBook deployed at: ${orderBookAddress}`);
    } catch (e) {
        console.error("⚠️ OrderBook deployment failed:", e);
    }

    // Deploy IncomeDistributor for this token
    let incomeDistributorAddress = "";
    try {
        incomeDistributorAddress = await deployIncomeDistributor(contractAddress);
        console.log(`✅ IncomeDistributor deployed at: ${incomeDistributorAddress}`);
    } catch (e) {
        console.error("⚠️ IncomeDistributor deployment failed:", e);
    }

    console.log(`   Tokens held by contract for sale. Price: ${tokenPriceEth} ETH per token.`);
    return { contractAddress, txHash, orderBookAddress, incomeDistributorAddress };
}

// Deploy a NEW OrderBook contract for a specific token
export async function deployOrderBook(tokenContractAddress: string): Promise<string> {
    const fs = await import("fs");
    const path = await import("path");
    const artifactPath = path.join(process.cwd(), "artifacts/contracts/OrderBook.sol/OrderBook.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

    const signer = getAdminSigner();
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

    console.log(`🚀 Deploying OrderBook for token: ${tokenContractAddress}...`);
    const contract = await factory.deploy(tokenContractAddress);
    await contract.waitForDeployment();

    return await contract.getAddress();
}

// Deploy a NEW IncomeDistributor contract for a specific token
export async function deployIncomeDistributor(tokenContractAddress: string): Promise<string> {
    const fs = await import("fs");
    const path = await import("path");
    const artifactPath = path.join(process.cwd(), "artifacts/contracts/IncomeDistributor.sol/IncomeDistributor.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));

    const signer = getAdminSigner();
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

    console.log(`🚀 Deploying IncomeDistributor for token: ${tokenContractAddress}...`);
    const contract = await factory.deploy(tokenContractAddress);
    await contract.waitForDeployment();

    return await contract.getAddress();
}

export { ethers };

