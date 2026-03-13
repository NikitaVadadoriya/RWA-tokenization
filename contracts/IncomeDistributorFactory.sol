// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IncomeDistributor.sol";

/// @title IncomeDistributorFactory — Deploy minimal proxy clones of IncomeDistributor per asset
/// @notice Deploy this ONCE alongside RWATokenFactory.
contract IncomeDistributorFactory is AccessControl {
    bytes32 public constant FACTORY_ADMIN_ROLE = keccak256("FACTORY_ADMIN_ROLE");

    address public immutable implementation;

    // assetId => distributor clone address
    mapping(string => address) public distributorForAsset;
    address[] public allDistributors;

    event DistributorCreated(
        string indexed assetId,
        address indexed distributorAddress,
        address tokenAddress
    );

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(FACTORY_ADMIN_ROLE, _admin);
        // Deploy the single implementation (only "expensive" deploy)
        implementation = address(
            new IncomeDistributor(address(1), "", _admin)
        );
    }

    /// @notice Admin creates a new IncomeDistributor for an asset — minimal proxy clone
    /// @param _tokenAddress Address of the RWAToken clone for this asset
    /// @param _assetId Unique asset identifier (must match RWAToken's assetId)
    /// @return clone Address of the newly created distributor contract
    function createDistributor(
        address _tokenAddress,
        string memory _assetId
    ) external onlyRole(FACTORY_ADMIN_ROLE) returns (address clone) {
        require(
            distributorForAsset[_assetId] == address(0),
            "DistributorFactory: distributor already exists"
        );

        clone = Clones.clone(implementation);
        // msg.sender (the Admin calling this factory) will become the DEFAULT_ADMIN, DISTRIBUTOR, and PAUSER of the cloned contract
        IncomeDistributor(payable(clone)).initialize(_tokenAddress, _assetId, msg.sender);

        distributorForAsset[_assetId] = clone;
        allDistributors.push(clone);

        emit DistributorCreated(_assetId, clone, _tokenAddress);
    }

    function getAllDistributors() external view returns (address[] memory) {
        return allDistributors;
    }
}
