// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RWAToken
 * @dev ERC-20 Security Token for Real World Asset tokenization
 * Features: KYC whitelist, purchase with ETH, transfer restrictions, income distribution
 * 
 * Flow:
 *   1. Admin deploys contract with name, symbol, totalSupply, tokenPriceWei
 *   2. All tokens are held BY THE CONTRACT (not the owner)
 *   3. KYC-verified investors call buyTokens() sending ETH → receive tokens
 *   4. ETH collected in contract → owner can withdrawFunds()
 *   5. Owner can also mint() additional tokens if needed
 */
contract RWAToken {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public owner;

    // Price per 1 whole token (in wei). E.g., 0.001 ETH = 1000000000000000 wei
    uint256 public tokenPriceWei;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public kycApproved;

    bool public tradingEnabled = false;
    bool public transferRestricted = true;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event KYCStatusUpdated(address indexed account, bool status);
    event TradingStatusChanged(bool enabled);
    event Mint(address indexed to, uint256 amount);
    event TokensPurchased(address indexed buyer, uint256 tokenAmount, uint256 ethPaid);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event TokenPriceUpdated(uint256 oldPrice, uint256 newPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "RWAToken: caller is not the owner");
        _;
    }

    modifier kycRequired(address account) {
        require(kycApproved[account], "RWAToken: KYC verification required");
        _;
    }

    /**
     * @param _name Token name (e.g., "Marina Bay Tower Token")
     * @param _symbol Token symbol (e.g., "MBT")
     * @param _totalSupply Total number of WHOLE tokens (will be multiplied by 10^18)
     * @param _tokenPriceWei Price of 1 whole token in wei (e.g., 1000000000000000 = 0.001 ETH)
     */
    constructor(string memory _name, string memory _symbol, uint256 _totalSupply, uint256 _tokenPriceWei) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        tokenPriceWei = _tokenPriceWei;
        totalSupply = _totalSupply * 10**decimals;

        // *** KEY CHANGE: Tokens go to CONTRACT, not owner ***
        // Investors buy tokens from the contract's pool
        balanceOf[address(this)] = totalSupply;
        kycApproved[msg.sender] = true;
        emit Transfer(address(0), address(this), totalSupply);
    }

    // ===================== PURCHASE FLOW =====================

    /**
     * @dev Investor buys tokens by sending ETH. Tokens transfer from contract → investor.
     * @param quantity Number of WHOLE tokens to buy (will be converted to 18 decimals)
     */
    function buyTokens(uint256 quantity) external payable kycRequired(msg.sender) {
        uint256 tokenAmount = quantity * 10**decimals;
        uint256 requiredEth = quantity * tokenPriceWei;

        require(msg.value >= requiredEth, "RWAToken: insufficient ETH sent");
        require(balanceOf[address(this)] >= tokenAmount, "RWAToken: not enough tokens available");

        // Transfer tokens from contract pool → investor
        balanceOf[address(this)] -= tokenAmount;
        balanceOf[msg.sender] += tokenAmount;
        emit Transfer(address(this), msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, quantity, msg.value);

        // Refund excess ETH if any
        if (msg.value > requiredEth) {
            payable(msg.sender).transfer(msg.value - requiredEth);
        }
    }

    /**
     * @dev Returns how many whole tokens are still available for purchase from the contract
     */
    function availableTokens() external view returns (uint256) {
        return balanceOf[address(this)] / 10**decimals;
    }

    /**
     * @dev Owner withdraws collected ETH to their wallet
     */
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "RWAToken: no funds to withdraw");
        payable(owner).transfer(balance);
        emit FundsWithdrawn(owner, balance);
    }

    /**
     * @dev Owner updates token price
     */
    function setTokenPrice(uint256 _newPriceWei) external onlyOwner {
        emit TokenPriceUpdated(tokenPriceWei, _newPriceWei);
        tokenPriceWei = _newPriceWei;
    }

    // ===================== KYC MANAGEMENT =====================

    function setKYCStatus(address account, bool status) external onlyOwner {
        kycApproved[account] = status;
        emit KYCStatusUpdated(account, status);
    }

    function batchSetKYCStatus(address[] calldata accounts, bool status) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            kycApproved[accounts[i]] = status;
            emit KYCStatusUpdated(accounts[i], status);
        }
    }

    // ===================== TRADING CONTROLS =====================

    function setTradingEnabled(bool _enabled) external onlyOwner {
        tradingEnabled = _enabled;
        emit TradingStatusChanged(_enabled);
    }

    function setTransferRestricted(bool _restricted) external onlyOwner {
        transferRestricted = _restricted;
    }

    // ===================== ADMIN MINT (for additional supply) =====================

    function mint(address to, uint256 amount) external onlyOwner kycRequired(to) {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    // ===================== ERC-20 STANDARD =====================

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "RWAToken: insufficient balance");
        if (transferRestricted) {
            require(kycApproved[msg.sender], "RWAToken: sender not KYC approved");
            require(kycApproved[to], "RWAToken: recipient not KYC approved");
        }
        if (msg.sender != owner) {
            require(tradingEnabled, "RWAToken: trading not yet enabled");
        }

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "RWAToken: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "RWAToken: allowance exceeded");
        if (transferRestricted) {
            require(kycApproved[from], "RWAToken: sender not KYC approved");
            require(kycApproved[to], "RWAToken: recipient not KYC approved");
        }
        if (from != owner) {
            require(tradingEnabled, "RWAToken: trading not yet enabled");
        }

        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
