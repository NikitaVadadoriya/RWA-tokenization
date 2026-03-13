// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./RWAToken.sol";

/// @title RWATokenFactory — Deploy minimal proxy clones of RWAToken per asset
/// @notice Deploy this ONCE. Call createToken() for every new asset — no new bytecode, cheap gas.
contract RWATokenFactory is AccessControl {
    bytes32 public constant FACTORY_ADMIN_ROLE = keccak256("FACTORY_ADMIN_ROLE");

    // The single RWAToken implementation that all clones delegate to
    address public immutable implementation;

    // assetId => token clone address
    mapping(string => address) public tokenForAsset;
    // all deployed tokens
    address[] public allTokens;

    event TokenCreated(
        string indexed assetId,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 totalSupply
    );

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(FACTORY_ADMIN_ROLE, _admin);
        // Deploy the implementation contract (this is the only "expensive" deploy)
        implementation = address(new RWAToken("", "", "", 0, _admin));
    }

    /// @notice Admin creates a new ERC-20 token for an asset — uses minimal proxy (ERC-1167)
    /// @param _name Token name (e.g. "Downtown Tower Token")
    /// @param _symbol Token symbol (e.g. "DTT")
    /// @param _assetId Unique asset identifier (MongoDB _id)
    /// @param _totalSupply Total number of tokens (without decimals)
    /// @return clone Address of the newly created token contract
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _assetId,
        uint256 _totalSupply
    ) external onlyRole(FACTORY_ADMIN_ROLE) returns (address clone) {
        require(tokenForAsset[_assetId] == address(0), "Factory: asset already tokenized");

        // Deploy a minimal proxy pointing to `implementation` — costs ~50k gas vs ~1.5M for full deploy
        clone = Clones.clone(implementation);

        // Initialize the clone (acts like a constructor). Admin is the caller.
        RWAToken(clone).initialize(_name, _symbol, _assetId, _totalSupply, msg.sender);

        tokenForAsset[_assetId] = clone;
        allTokens.push(clone);

        emit TokenCreated(_assetId, clone, _name, _symbol, _totalSupply);
    }

    /// @notice Get all deployed token addresses
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    /// @notice Total assets tokenized
    function totalAssets() external view returns (uint256) {
        return allTokens.length;
    }
}
