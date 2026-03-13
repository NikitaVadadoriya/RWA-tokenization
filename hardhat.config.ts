import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Hardhat does NOT auto-load .env.local (Next.js convention)
// Load from process.cwd() which is always the project root
dotenv.config({ path: ".env.local" });

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

if (!SEPOLIA_RPC_URL || SEPOLIA_RPC_URL.includes("YOUR_INFURA")) {
  console.warn("⚠️  SEPOLIA_RPC_URL not configured in .env.local");
}
if (!PRIVATE_KEY || PRIVATE_KEY === "your-admin-wallet-private-key-here") {
  console.warn("⚠️  PRIVATE_KEY not configured in .env.local");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    artifacts: "./contracts/artifacts",
  },
};

export default config;
