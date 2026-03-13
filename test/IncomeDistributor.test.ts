import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RWAToken, IncomeDistributor } from "../typechain-types";

describe("IncomeDistributor", function () {
    let rwaToken: RWAToken;
    let distributor: IncomeDistributor;
    let admin: SignerWithAddress;
    let investor1: SignerWithAddress;
    let investor2: SignerWithAddress;

    beforeEach(async function () {
        [admin, investor1, investor2] = await ethers.getSigners();

        // Deploy Token
        const TokenFactory = await ethers.getContractFactory("RWAToken");
        // Provide 0 total supply so constructor does not mint (it's for factory setup)
        rwaToken = await TokenFactory.deploy("Test Token", "TEST", "asset1", 0, admin.address) as unknown as RWAToken;
        // Call initialize to grant roles
        await rwaToken.initialize("Test Token", "TEST", "asset1", 100, admin.address);

        // Deploy Distributor via direct deployment (but call initialize to set up roles for testing)
        const DistributorFactory = await ethers.getContractFactory("IncomeDistributor");
        distributor = await DistributorFactory.deploy(await rwaToken.getAddress(), "asset1", admin.address) as unknown as IncomeDistributor;
        await distributor.initialize(await rwaToken.getAddress(), "asset1", admin.address);

        // Setup Roles and Whitelist for Token
        const COMPLIANCE_ROLE = await rwaToken.COMPLIANCE_ROLE();
        await rwaToken.grantRole(COMPLIANCE_ROLE, admin.address);
        await rwaToken.setWhitelist(admin.address, true);
        await rwaToken.setWhitelist(investor1.address, true);
        await rwaToken.setWhitelist(investor2.address, true);

        // Transfer 60 tokens to investor1 and 40 to investor2 (total 100 format)
        await rwaToken.transfer(investor1.address, ethers.parseUnits("60", 18));
        await rwaToken.transfer(investor2.address, ethers.parseUnits("40", 18));
    });

    it("should distribute income proportionally based on token balance", async function () {
        // Admin deposits 1 ETH
        await admin.sendTransaction({
            to: await distributor.getAddress(),
            value: ethers.parseEther("1.0"),
        });

        const pending = await distributor.pendingIncome();
        expect(pending).to.equal(ethers.parseEther("1.0"));

        const initialBalance1 = await ethers.provider.getBalance(investor1.address);
        const initialBalance2 = await ethers.provider.getBalance(investor2.address);

        // Distribute to all
        await distributor.distribute([investor1.address, investor2.address]);

        const finalBalance1 = await ethers.provider.getBalance(investor1.address);
        const finalBalance2 = await ethers.provider.getBalance(investor2.address);

        // Investor 1 should receive 0.6 ETH (60% of 1 ETH)
        expect(finalBalance1 - initialBalance1).to.equal(ethers.parseEther("0.6"));

        // Investor 2 should receive 0.4 ETH (40% of 1 ETH)
        expect(finalBalance2 - initialBalance2).to.equal(ethers.parseEther("0.4"));
    });

    it("should fail if unauthorized user tries to distribute", async function () {
        await expect(distributor.connect(investor1).distribute([investor1.address]))
            .to.be.revertedWithCustomError(distributor, "AccessControlUnauthorizedAccount");
    });
});
