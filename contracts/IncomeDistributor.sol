// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRWA {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title IncomeDistributor
 * @dev Distributes income (ETH/MATIC) proportionally to all RWA token holders
 * Used for rental yields, bond coupons, project revenue, etc.
 */
contract IncomeDistributor {
    address public owner;
    address public tokenContract;

    struct Distribution {
        uint256 totalAmount;
        uint256 timestamp;
        uint256 totalSupplyAtTime;
        string description;
    }

    Distribution[] public distributions;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event IncomeDeposited(uint256 indexed distributionId, uint256 amount, string description);
    event IncomeClaimed(uint256 indexed distributionId, address indexed investor, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "IncomeDistributor: not owner");
        _;
    }

    constructor(address _tokenContract) {
        owner = msg.sender;
        tokenContract = _tokenContract;
    }

    function depositIncome(string calldata description) external payable onlyOwner {
        require(msg.value > 0, "IncomeDistributor: zero amount");

        uint256 distId = distributions.length;
        distributions.push(Distribution({
            totalAmount: msg.value,
            timestamp: block.timestamp,
            totalSupplyAtTime: IRWA(tokenContract).totalSupply(),
            description: description
        }));

        emit IncomeDeposited(distId, msg.value, description);
    }

    function claimIncome(uint256 distributionId) external {
        require(distributionId < distributions.length, "IncomeDistributor: invalid ID");
        require(!claimed[distributionId][msg.sender], "IncomeDistributor: already claimed");

        Distribution memory dist = distributions[distributionId];
        uint256 holderBalance = IRWA(tokenContract).balanceOf(msg.sender);
        require(holderBalance > 0, "IncomeDistributor: no tokens held");

        uint256 share = (dist.totalAmount * holderBalance) / dist.totalSupplyAtTime;
        require(share > 0, "IncomeDistributor: zero share");

        claimed[distributionId][msg.sender] = true;

        (bool sent, ) = payable(msg.sender).call{value: share}("");
        require(sent, "IncomeDistributor: transfer failed");

        emit IncomeClaimed(distributionId, msg.sender, share);
    }

    function getDistributionCount() external view returns (uint256) {
        return distributions.length;
    }

    function getClaimableAmount(uint256 distributionId, address investor) external view returns (uint256) {
        if (distributionId >= distributions.length) return 0;
        if (claimed[distributionId][investor]) return 0;

        Distribution memory dist = distributions[distributionId];
        uint256 holderBalance = IRWA(tokenContract).balanceOf(investor);
        if (holderBalance == 0) return 0;

        return (dist.totalAmount * holderBalance) / dist.totalSupplyAtTime;
    }
}
