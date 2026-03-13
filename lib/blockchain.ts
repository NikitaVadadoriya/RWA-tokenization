import { ethers, ContractFactory, Contract, Wallet, JsonRpcProvider } from "ethers";
import path from "path";

// ─── Load contract ABIs (compiled by Hardhat) ──────────────────────────────
import TokenFactoryArtifact from "../contracts/artifacts/contracts/RWATokenFactory.sol/RWATokenFactory.json";
import DistributorFactoryArtifact from "../contracts/artifacts/contracts/IncomeDistributorFactory.sol/IncomeDistributorFactory.json";
import RWATokenArtifact from "../contracts/artifacts/contracts/RWAToken.sol/RWAToken.json";

// ─── Provider & Wallet ────────────────────────────────────────────────────
function getProvider(): JsonRpcProvider {
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL not set");
    return new JsonRpcProvider(rpcUrl);
}

export function getAdminWallet(): Wallet {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("PRIVATE_KEY not set");
    return new Wallet(privateKey, getProvider());
}

function getTokenFactory(): Contract {
    const address = process.env.TOKEN_FACTORY_ADDRESS;
    if (!address) throw new Error("TOKEN_FACTORY_ADDRESS not set in .env.local");
    return new Contract(address, TokenFactoryArtifact.abi, getAdminWallet());
}

function getDistributorFactory(): Contract {
    const address = process.env.DISTRIBUTOR_FACTORY_ADDRESS;
    if (!address) throw new Error("DISTRIBUTOR_FACTORY_ADDRESS not set in .env.local");
    return new Contract(address, DistributorFactoryArtifact.abi, getAdminWallet());
}

// ─── M1: Create token for new asset via Factory clone ────────────────────
/// @notice No new contract deploy — cheaply clones the implementation (~50k gas)
export async function createAssetToken(
    assetName: string,
    symbol: string,
    assetId: string,
    totalSupply: number
): Promise<{ tokenAddress: string; txHash: string }> {
    const factory = getTokenFactory();
    const tx = await factory.createToken(assetName, symbol, assetId, totalSupply);
    const receipt = await tx.wait();

    // Get the clone address from the factory mapping
    const tokenAddress: string = await factory.tokenForAsset(assetId);
    return { tokenAddress, txHash: receipt.hash };
}

// ─── M5: Create income distributor for new asset via Factory clone ────────
export async function createAssetDistributor(
    tokenAddress: string,
    assetId: string
): Promise<{ distributorAddress: string; txHash: string }> {
    const factory = getDistributorFactory();
    const tx = await factory.createDistributor(tokenAddress, assetId);
    const receipt = await tx.wait();

    const distributorAddress: string = await factory.distributorForAsset(assetId);
    return { distributorAddress, txHash: receipt.hash };
}

// ─── M3: Whitelist an investor's wallet in an asset's token ──────────────
export async function whitelistInvestor(
    tokenAddress: string,
    investorWallet: string,
    status: boolean
): Promise<string> {
    const wallet = getAdminWallet();
    const contract = new Contract(tokenAddress, RWATokenArtifact.abi, wallet);
    const tx = await contract.setWhitelist(investorWallet, status);
    const receipt = await tx.wait();
    return receipt.hash as string;
}

// ─── M3: Batch whitelist (saves gas for multiple investors) ──────────────
export async function whitelistInvestorBatch(
    tokenAddress: string,
    investorWallets: string[],
    status: boolean
): Promise<string> {
    const wallet = getAdminWallet();
    const contract = new Contract(tokenAddress, RWATokenArtifact.abi, wallet);
    const tx = await contract.setWhitelistBatch(investorWallets, status);
    const receipt = await tx.wait();
    return receipt.hash as string;
}

// ─── M2: Mint tokens to a KYC-verified investor ───────────────────────────
export async function mintTokens(
    tokenAddress: string,
    investorWallet: string,
    amount: number
): Promise<string> {
    const wallet = getAdminWallet();
    const contract = new Contract(tokenAddress, RWATokenArtifact.abi, wallet);
    const tx = await contract.mint(
        investorWallet,
        ethers.parseUnits(amount.toString(), 18)
    );
    const receipt = await tx.wait();
    return receipt.hash as string;
}

// ─── M6: Get investor's token balance ────────────────────────────────────
export async function getTokenBalance(
    tokenAddress: string,
    investorWallet: string
): Promise<string> {
    const provider = getProvider();
    const contract = new Contract(tokenAddress, RWATokenArtifact.abi, provider);
    const balance: bigint = await contract.balanceOf(investorWallet);
    return ethers.formatUnits(balance, 18);
}

// ─── M7: Get total assets tokenized by the factory ──────────────────────
export async function getTotalAssets(): Promise<number> {
    const factory = getTokenFactory();
    const total: bigint = await factory.totalAssets();
    return Number(total);
}
