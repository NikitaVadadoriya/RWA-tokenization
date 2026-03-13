import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { RWAToken, OrderBook } from "../typechain-types"; // Assuming typechain is generated, else any

describe("OrderBook", function () {
    let rwaToken: any;
    let orderBook: any;
    let admin: SignerWithAddress;
    let feeCollector: SignerWithAddress;
    let seller: SignerWithAddress;
    let buyer: SignerWithAddress;
    let unauthorized: SignerWithAddress;

    const SUPPLY = 1000;
    const QUANTITY = 100;
    const PRICE_PER_TOKEN = ethers.parseEther("0.01"); // 0.01 ETH per token

    beforeEach(async function () {
        [admin, feeCollector, seller, buyer, unauthorized] = await ethers.getSigners();

        // 1. Deploy RWAToken
        const TokenFactory = await ethers.getContractFactory("RWAToken");
        rwaToken = await TokenFactory.deploy("Test Asset", "TST", "asset-id", 0, admin.address);
        await rwaToken.initialize("Test Asset", "TST", "asset-id", SUPPLY, admin.address);

        // 2. Setup KYC Whitelist
        const COMPLIANCE_ROLE = await rwaToken.COMPLIANCE_ROLE();
        await rwaToken.grantRole(COMPLIANCE_ROLE, admin.address);
        await rwaToken.setWhitelist(admin.address, true);
        await rwaToken.setWhitelist(seller.address, true);
        await rwaToken.setWhitelist(buyer.address, true);

        // Transfer tokens to seller so they can list them
        await rwaToken.transfer(seller.address, QUANTITY);

        // 3. Deploy OrderBook
        const OrderBookFactory = await ethers.getContractFactory("OrderBook");
        orderBook = await OrderBookFactory.deploy(admin.address, feeCollector.address);

        // Seller approves OrderBook to move tokens
        await rwaToken.connect(seller).approve(await orderBook.getAddress(), QUANTITY);
    });

    describe("Order Placement", function () {
        it("should allow a seller to place an order", async function () {
            const tx = await orderBook.connect(seller).placeOrder(await rwaToken.getAddress(), QUANTITY, PRICE_PER_TOKEN);
            await expect(tx).to.emit(orderBook, "OrderPlaced").withArgs(
                0, seller.address, await rwaToken.getAddress(), QUANTITY, PRICE_PER_TOKEN
            );

            const order = await orderBook.orders(0);
            expect(order.seller).to.equal(seller.address);
            expect(order.quantity).to.equal(QUANTITY);
            expect(order.pricePerToken).to.equal(PRICE_PER_TOKEN);
            expect(order.active).to.be.true;
        });

        it("should revert if quantity is zero", async function () {
            await expect(
                orderBook.connect(seller).placeOrder(await rwaToken.getAddress(), 0, PRICE_PER_TOKEN)
            ).to.be.revertedWith("OrderBook: zero quantity");
        });
    });

    describe("Order Filling & Fees", function () {
        beforeEach(async function () {
            await orderBook.connect(seller).placeOrder(await rwaToken.getAddress(), QUANTITY, PRICE_PER_TOKEN);
        });

        it("should successfully fill an order, transfer tokens, and distribute ETH including fees", async function () {
            const totalCost = PRICE_PER_TOKEN * BigInt(QUANTITY);

            const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
            const feeCollectorBalanceBefore = await ethers.provider.getBalance(feeCollector.address);

            const tx = await orderBook.connect(buyer).fillOrder(0, { value: totalCost });

            // Check Token Transfer
            expect(await rwaToken.balanceOf(buyer.address)).to.equal(QUANTITY);
            expect(await rwaToken.balanceOf(seller.address)).to.equal(0);

            // Check Order Status
            const order = await orderBook.orders(0);
            expect(order.active).to.be.false;

            // Check ETH balances
            // Fee is 0.5% by default
            const fee = (totalCost * 50n) / 10000n;
            const sellerPart = totalCost - fee;

            const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
            const feeCollectorBalanceAfter = await ethers.provider.getBalance(feeCollector.address);

            expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(sellerPart);
            expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(fee);

            await expect(tx).to.emit(orderBook, "OrderFilled").withArgs(0, buyer.address, QUANTITY, totalCost);
        });

        it("should revert if payment is insufficient", async function () {
            const totalCost = (PRICE_PER_TOKEN * BigInt(QUANTITY)) - 1n; // 1 wei short
            await expect(
                orderBook.connect(buyer).fillOrder(0, { value: totalCost })
            ).to.be.revertedWith("OrderBook: insufficient payment");
        });

        it("should revert if order is not active", async function () {
            const totalCost = PRICE_PER_TOKEN * BigInt(QUANTITY);
            await orderBook.connect(buyer).fillOrder(0, { value: totalCost });

            // Try to fill again
            await expect(
                orderBook.connect(buyer).fillOrder(0, { value: totalCost })
            ).to.be.revertedWith("OrderBook: order not active");
        });

        it("should block unverified buyers due to token KYC rules", async function () {
            const totalCost = PRICE_PER_TOKEN * BigInt(QUANTITY);
            // unauthorized trying to buy without KYC
            await expect(
                orderBook.connect(unauthorized).fillOrder(0, { value: totalCost })
            ).to.be.revertedWith("OrderBook: token transfer failed");
        });
    });

    describe("Order Cancellation", function () {
        beforeEach(async function () {
            await orderBook.connect(seller).placeOrder(await rwaToken.getAddress(), QUANTITY, PRICE_PER_TOKEN);
        });

        it("should allow seller to cancel their active order", async function () {
            const tx = await orderBook.connect(seller).cancelOrder(0);
            await expect(tx).to.emit(orderBook, "OrderCancelled").withArgs(0);

            const order = await orderBook.orders(0);
            expect(order.active).to.be.false;
        });

        it("should not allow others to cancel the order", async function () {
            await expect(
                orderBook.connect(buyer).cancelOrder(0)
            ).to.be.revertedWith("OrderBook: not your order");
        });
    });

    describe("AccessControl & Pausable", function () {
        it("should restrict pausing to PAUSER_ROLE", async function () {
            const PAUSER_ROLE = await orderBook.PAUSER_ROLE();
            await expect(
                orderBook.connect(unauthorized).pause()
            ).to.be.revertedWithCustomError(orderBook, "AccessControlUnauthorizedAccount").withArgs(unauthorized.address, PAUSER_ROLE);

            await orderBook.connect(admin).pause();
            expect(await orderBook.paused()).to.be.true;
        });

        it("should prevent placing, filling, and canceling orders while paused", async function () {
            await orderBook.connect(seller).placeOrder(await rwaToken.getAddress(), QUANTITY, PRICE_PER_TOKEN);
            await orderBook.connect(admin).pause();

            const totalCost = PRICE_PER_TOKEN * BigInt(QUANTITY);

            await expect(
                orderBook.connect(seller).placeOrder(await rwaToken.getAddress(), QUANTITY, PRICE_PER_TOKEN)
            ).to.be.revertedWithCustomError(orderBook, "EnforcedPause");

            await expect(
                orderBook.connect(buyer).fillOrder(0, { value: totalCost })
            ).to.be.revertedWithCustomError(orderBook, "EnforcedPause");

            await expect(
                orderBook.connect(seller).cancelOrder(0)
            ).to.be.revertedWithCustomError(orderBook, "EnforcedPause");
        });

        it("should restrict fee updates to FEE_MANAGER_ROLE", async function () {
            const FEE_MANAGER_ROLE = await orderBook.FEE_MANAGER_ROLE();
            await expect(
                orderBook.connect(unauthorized).setTradingFee(100)
            ).to.be.revertedWithCustomError(orderBook, "AccessControlUnauthorizedAccount").withArgs(unauthorized.address, FEE_MANAGER_ROLE);

            await orderBook.connect(admin).setTradingFee(100);
            expect(await orderBook.tradingFeePercent()).to.equal(100);
        });

        it("should restrict fee collector updates to FEE_MANAGER_ROLE", async function () {
            const FEE_MANAGER_ROLE = await orderBook.FEE_MANAGER_ROLE();
            await expect(
                orderBook.connect(unauthorized).setFeeCollector(buyer.address)
            ).to.be.revertedWithCustomError(orderBook, "AccessControlUnauthorizedAccount").withArgs(unauthorized.address, FEE_MANAGER_ROLE);

            await orderBook.connect(admin).setFeeCollector(buyer.address);
            expect(await orderBook.feeCollector()).to.equal(buyer.address);
        });
    });
});
