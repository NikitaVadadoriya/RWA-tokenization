// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRWAToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function kycApproved(address account) external view returns (bool);
}

/**
 * @title OrderBook
 * @dev Secondary marketplace for buying and selling RWA tokens
 * Features: order matching, 0.5% trading fee, KYC enforcement
 */
contract OrderBook {
    address public owner;
    address public tokenContract;
    uint256 public tradingFeePercent = 50; // 0.5% = 50 basis points
    uint256 public collectedFees;

    struct Order {
        uint256 id;
        address trader;
        bool isBuyOrder;
        uint256 quantity;
        uint256 pricePerToken;
        uint256 filled;
        bool active;
        uint256 timestamp;
    }

    Order[] public orders;
    uint256 public nextOrderId;

    event OrderPlaced(uint256 indexed orderId, address indexed trader, bool isBuyOrder, uint256 quantity, uint256 pricePerToken);
    event OrderFilled(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 quantity, uint256 totalPrice);
    event OrderCancelled(uint256 indexed orderId);
    event FeesCollected(uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "OrderBook: not owner");
        _;
    }

    constructor(address _tokenContract) {
        owner = msg.sender;
        tokenContract = _tokenContract;
    }

    // Convert whole-token quantity to token-wei (18 decimals) for ERC-20 calls
    function toTokenWei(uint256 quantity) internal pure returns (uint256) {
        return quantity * 1e18;
    }

    function placeSellOrder(uint256 quantity, uint256 pricePerToken) external {
        require(IRWAToken(tokenContract).kycApproved(msg.sender), "OrderBook: KYC required");
        require(IRWAToken(tokenContract).balanceOf(msg.sender) >= toTokenWei(quantity), "OrderBook: insufficient tokens");

        uint256 orderId = nextOrderId++;
        orders.push(Order({
            id: orderId,
            trader: msg.sender,
            isBuyOrder: false,
            quantity: quantity,
            pricePerToken: pricePerToken,
            filled: 0,
            active: true,
            timestamp: block.timestamp
        }));

        emit OrderPlaced(orderId, msg.sender, false, quantity, pricePerToken);
    }

    function placeBuyOrder(uint256 quantity, uint256 pricePerToken) external payable {
        require(IRWAToken(tokenContract).kycApproved(msg.sender), "OrderBook: KYC required");
        uint256 totalCost = quantity * pricePerToken;
        uint256 fee = (totalCost * tradingFeePercent) / 10000;
        require(msg.value >= totalCost + fee, "OrderBook: insufficient ETH");

        uint256 orderId = nextOrderId++;
        orders.push(Order({
            id: orderId,
            trader: msg.sender,
            isBuyOrder: true,
            quantity: quantity,
            pricePerToken: pricePerToken,
            filled: 0,
            active: true,
            timestamp: block.timestamp
        }));

        collectedFees += fee;
        emit OrderPlaced(orderId, msg.sender, true, quantity, pricePerToken);
    }

    function fillOrder(uint256 orderId, uint256 quantity) external payable {
        require(orderId < orders.length, "OrderBook: invalid order");
        Order storage order = orders[orderId];
        require(order.active, "OrderBook: order not active");
        require(quantity <= order.quantity - order.filled, "OrderBook: exceeds available");

        if (order.isBuyOrder) {
            // Seller fills a buy order
            require(IRWAToken(tokenContract).kycApproved(msg.sender), "OrderBook: KYC required");
            uint256 totalPrice = quantity * order.pricePerToken;

            // Transfer token-wei amount (quantity * 10^18)
            IRWAToken(tokenContract).transferFrom(msg.sender, order.trader, toTokenWei(quantity));
            (bool sent, ) = payable(msg.sender).call{value: totalPrice}("");
            require(sent, "OrderBook: ETH transfer failed");

            emit OrderFilled(orderId, order.trader, msg.sender, quantity, totalPrice);
        } else {
            // Buyer fills a sell order
            require(IRWAToken(tokenContract).kycApproved(msg.sender), "OrderBook: KYC required");
            uint256 totalPrice = quantity * order.pricePerToken;
            uint256 fee = (totalPrice * tradingFeePercent) / 10000;
            require(msg.value >= totalPrice + fee, "OrderBook: insufficient ETH");

            // Transfer token-wei amount (quantity * 10^18)
            IRWAToken(tokenContract).transferFrom(order.trader, msg.sender, toTokenWei(quantity));
            (bool sent, ) = payable(order.trader).call{value: totalPrice}("");
            require(sent, "OrderBook: ETH transfer failed");

            collectedFees += fee;
            emit OrderFilled(orderId, msg.sender, order.trader, quantity, totalPrice);
        }

        order.filled += quantity;
        if (order.filled >= order.quantity) {
            order.active = false;
        }
    }

    function cancelOrder(uint256 orderId) external {
        require(orderId < orders.length, "OrderBook: invalid order");
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "OrderBook: not your order");
        require(order.active, "OrderBook: already inactive");

        order.active = false;

        if (order.isBuyOrder) {
            uint256 remainingQuantity = order.quantity - order.filled;
            uint256 refund = remainingQuantity * order.pricePerToken;
            (bool sent, ) = payable(msg.sender).call{value: refund}("");
            require(sent, "OrderBook: refund failed");
        }

        emit OrderCancelled(orderId);
    }

    function withdrawFees() external onlyOwner {
        uint256 fees = collectedFees;
        collectedFees = 0;
        (bool sent, ) = payable(owner).call{value: fees}("");
        require(sent, "OrderBook: withdrawal failed");
        emit FeesCollected(fees);
    }

    function getOrderCount() external view returns (uint256) {
        return orders.length;
    }

    function setTradingFee(uint256 _basisPoints) external onlyOwner {
        require(_basisPoints <= 1000, "OrderBook: fee too high");
        tradingFeePercent = _basisPoints;
    }
}
