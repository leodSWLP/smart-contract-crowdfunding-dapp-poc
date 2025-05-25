// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Crowdfunding.sol";

contract CrowdFundingFactory is Ownable {
    uint maxCrowdfundingCount;
    bool isPause;
    address[] public crowdfundingContracts;

    error FactoryContractIsPaused();
    error TooManyCrowdfundingContract(uint max);

    modifier isActive() {
        if (isPause) revert FactoryContractIsPaused();
        _;
    }

    event CrowdFundingCreated(
        address indexed crowdFundingAddress,
        string title,
        uint256 minimumContribution,
        uint256 targetFunding,
        uint8 fundingMonths,
        uint8 transferReqeustMonths,
        address indexed owner
    );

    constructor(uint256 _maxCrowdfundingCount) Ownable(msg.sender){
        maxCrowdfundingCount = _maxCrowdfundingCount;
    }

    function createCrowdFunding(
        string memory _title,
        string memory _description,
        uint256 _minimumContribution,
        uint256 _targetFunding,
        uint8 _fundingMonths,
        uint8 _transferRequestMonths
    ) public isActive returns (address) {
        if (crowdfundingContracts.length + 1 > maxCrowdfundingCount)  {
            revert TooManyCrowdfundingContract(maxCrowdfundingCount);
        }

        Crowdfunding newCrowdfunding = new Crowdfunding({
            _title: _title,
            _description: _description,
            _minimumContribution: _minimumContribution,
            _targetFunding: _targetFunding,
            fundingMonths: _fundingMonths,
            transferRequestMonths: _transferRequestMonths,
            owner: msg.sender
        });

        crowdfundingContracts.push(address(newCrowdfunding));
        emit CrowdFundingCreated(
            address(newCrowdfunding),
            _title,
            _minimumContribution,
            _targetFunding,
            _fundingMonths,
            _transferRequestMonths,
            msg.sender
        );
        return address(newCrowdfunding);
    }

    function getCrowdfundingContracts() external view returns (address[] memory) {
        return crowdfundingContracts;
    }

        function getCrowdFundingCount() external view returns (uint256) {
        return crowdfundingContracts.length;
    }
}