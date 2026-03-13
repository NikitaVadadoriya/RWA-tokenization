// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title OrderBook — On-chain secondary marketplace for RWA token trading
contract OrderBook is AccessControl, Pausable {
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    struct Order {
        uint256 id;
        address seller;
        address tokenContract;
        uint256 quantity;
        uint256 pricePerToken; // in wei
        bool active;
    }

    uint256 public nextOrderId;
    uint256 public tradingFeePercent = 50; // 0.5% (50 basis points)
    address public feeCollector;

    mapping(uint256 => Order) public orders;

    event OrderPlaced(uint256 indexed orderId, address seller, address token, uint256 qty, uint256 price);
    event OrderFilled(uint256 indexed orderId, address buyer, uint256 qty, uint256 totalPaid);
    event OrderCancelled(uint256 indexed orderId);

    constructor(address _admin, address _feeCollector) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(FEE_MANAGER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        
        feeCollector = _feeCollector;
    }

    // ─── Emergency Stop ──────────────────────────────────────────────────────
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Seller lists tokens for sale (must approve this contract first)
    function placeOrder(
        address _tokenContract,
        uint256 _quantity,
        uint256 _pricePerToken
    ) external whenNotPaused returns (uint256 orderId) {
        require(_quantity > 0, "OrderBook: zero quantity");

        orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            seller: msg.sender,
            tokenContract: _tokenContract,
            quantity: _quantity,
            pricePerToken: _pricePerToken,
            active: true
        });

        emit OrderPlaced(orderId, msg.sender, _tokenContract, _quantity, _pricePerToken);
    }

    /// @notice Buyer fills an existing order (sends ETH)
    function fillOrder(uint256 _orderId) external payable whenNotPaused {
        Order storage order = orders[_orderId];
        require(order.active, "OrderBook: order not active");

        uint256 totalCost = order.quantity * order.pricePerToken;
        require(msg.value >= totalCost, "OrderBook: insufficient payment");

        uint256 fee = (totalCost * tradingFeePercent) / 10000;
        uint256 sellerAmount = totalCost - fee;

        order.active = false;

        // Transfer tokens from seller to buyer
        (bool transferOk, ) = order.tokenContract.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", order.seller, msg.sender, order.quantity)
        );
        require(transferOk, "OrderBook: token transfer failed");

        // Pay seller
        (bool sellerPaid, ) = payable(order.seller).call{value: sellerAmount}("");
        require(sellerPaid, "OrderBook: seller payment failed");

        // Collect fee
        (bool feePaid, ) = payable(feeCollector).call{value: fee}("");
        require(feePaid, "OrderBook: fee payment failed");

        // Refund excess
        if (msg.value > totalCost) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(refunded, "OrderBook: refund failed");
        }

        emit OrderFilled(_orderId, msg.sender, order.quantity, totalCost);
    }

    /// @notice Seller cancels their own order
    function cancelOrder(uint256 _orderId) external whenNotPaused {
        Order storage order = orders[_orderId];
        require(order.seller == msg.sender, "OrderBook: not your order");
        require(order.active, "OrderBook: order not active");
        order.active = false;
        emit OrderCancelled(_orderId);
    }

    /// @notice Admin updates trading fee (max 3%)
    function setTradingFee(uint256 _basisPoints) external onlyRole(FEE_MANAGER_ROLE) {
        require(_basisPoints <= 300, "OrderBook: fee too high");
        tradingFeePercent = _basisPoints;
    }

    /// @notice Admin updates fee collector address
    function setFeeCollector(address _newCollector) external onlyRole(FEE_MANAGER_ROLE) {
        require(_newCollector != address(0), "OrderBook: zero address");
        feeCollector = _newCollector;
    }
}
