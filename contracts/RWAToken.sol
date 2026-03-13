// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/// @title RWAToken — ERC-20 token representing fractional ownership of a real-world asset
/// @notice Designed to be used as a Minimal Proxy Clone (ERC-1167).
///         Use initialize() instead of constructor when deployed via RWATokenFactory.
contract RWAToken is ERC20, AccessControl, Pausable, Initializable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    string public assetId;

    // KYC whitelist — only verified investors can hold tokens
    mapping(address => bool) public kycWhitelist;

    // ─── Events ───────────────────────────────────────────────────────────────
    event WhitelistUpdated(address indexed investor, bool status);
    event TokensMinted(address indexed to, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────
    /// @dev Used when deployed as an impl contract by the Factory.
    ///      Pass empty strings / zero values — Factory immediately calls initialize().
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _assetId,
        uint256 _totalSupply,
        address _admin
    ) ERC20(_name, _symbol) {
        if (_totalSupply > 0) {
            assetId = _assetId;
            _mint(_admin, _totalSupply * (10 ** decimals()));
        }
    }

    // ─── Clone Initializer ───────────────────────────────────────────────────
    /// @notice Called by the Factory right after cloning the implementation.
    ///         Works like a constructor for the proxy clone.
    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _assetId,
        uint256 _totalSupply,
        address _admin
    ) external initializer {
        assetId = _assetId;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(COMPLIANCE_ROLE, _admin);
        _mint(_admin, _totalSupply * (10 ** decimals()));
    }

    // ─── Emergency Stop ──────────────────────────────────────────────────────
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ─── Compliance Functions ────────────────────────────────────────────────
    /// @notice Admin sets KYC whitelist for an investor's wallet
    function setWhitelist(address investor, bool status) external onlyRole(COMPLIANCE_ROLE) {
        kycWhitelist[investor] = status;
        emit WhitelistUpdated(investor, status);
    }

    /// @notice Batch whitelist — saves gas when onboarding multiple investors
    function setWhitelistBatch(address[] calldata investors, bool status) external onlyRole(COMPLIANCE_ROLE) {
        for (uint256 i = 0; i < investors.length; i++) {
            kycWhitelist[investors[i]] = status;
            emit WhitelistUpdated(investors[i], status);
        }
    }

    /// @notice Mint additional tokens to a KYC-verified investor
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(kycWhitelist[to], "RWAToken: investor not KYC verified");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // ─── Compliance Hook ─────────────────────────────────────────────────────
    /// @notice Override ERC-20 _update — enforces KYC on secondary transfers only
    /// @dev Mint (from==0): KYC enforced in mint() function — skip here to allow initialize()
    ///      Transfer (from!=0, to!=0): both wallets must be KYC verified
    ///      Burn (to==0): always allowed
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        bool isMint = (from == address(0));
        bool isBurn = (to == address(0));

        if (!isMint && !isBurn) {
            // Secondary market transfer — enforce KYC on both sides
            require(kycWhitelist[from], "RWAToken: sender not KYC verified");
            require(kycWhitelist[to], "RWAToken: recipient not KYC verified");
        }
        // Minting: KYC already checked in mint(). Initial supply mint in initialize() is admin→admin.
        // Burning: always allowed (admin can burn if needed).

        super._update(from, to, value);
    }
}
