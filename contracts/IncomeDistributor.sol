// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/// @title IncomeDistributor — Proportionally distributes ETH income to all token holders
/// @notice Supports both direct deployment and ERC-1167 Minimal Proxy Clones.
contract IncomeDistributor is AccessControl, Pausable, Initializable {
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public rwaToken;
    string public assetId;

    event IncomeDeposited(uint256 amount, uint256 timestamp);
    event IncomeDistributed(address indexed investor, uint256 amount);
    event DistributionCompleted(uint256 totalDistributed, uint256 recipientCount);

    // ─── Constructor (for direct deployment) ────────────────────────────────
    constructor(address _rwaToken, string memory _assetId, address _admin) {
        if (_rwaToken != address(1)) { // address(1) = placeholder for Factory impl deploy
            rwaToken = IERC20(_rwaToken);
            assetId = _assetId;
        }
    }

    // ─── Clone Initializer ───────────────────────────────────────────────────
    /// @notice Called by IncomeDistributorFactory right after cloning
    function initialize(
        address _rwaToken,
        string memory _assetId,
        address _admin
    ) external initializer {
        rwaToken = IERC20(_rwaToken);
        assetId = _assetId;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(DISTRIBUTOR_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    // ─── Emergency Stop ──────────────────────────────────────────────────────
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ─── Income Deposit ──────────────────────────────────────────────────────
    /// @notice Admin deposits ETH income into the distributor (e.g. rental income)
    receive() external payable {
        emit IncomeDeposited(msg.value, block.timestamp);
    }

    // ─── Distribution ────────────────────────────────────────────────────────
    /// @notice Distribute ALL pending ETH proportionally to a batch of investors
    /// @param investors Addresses of token holders to distribute to
    function distribute(address[] calldata investors) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused {
        uint256 totalSupply = rwaToken.totalSupply();
        require(totalSupply > 0, "IncomeDistributor: no tokens in circulation");

        uint256 totalBalance = address(this).balance;
        require(totalBalance > 0, "IncomeDistributor: no income to distribute");

        uint256 distributed = 0;
        uint256 recipientCount = 0;

        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 holdings = rwaToken.balanceOf(investor);
            if (holdings == 0) continue;

            uint256 share = (totalBalance * holdings) / totalSupply;
            if (share == 0) continue;

            distributed += share;
            recipientCount++;

            (bool success, ) = payable(investor).call{value: share}("");
            require(success, "IncomeDistributor: transfer to investor failed");
            emit IncomeDistributed(investor, share);
        }

        emit DistributionCompleted(distributed, recipientCount);
    }

    /// @notice View pending ETH balance waiting to be distributed
    function pendingIncome() external view returns (uint256) {
        return address(this).balance;
    }
}
