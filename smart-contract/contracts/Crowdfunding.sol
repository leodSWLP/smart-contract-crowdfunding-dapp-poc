// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './ICrowdfunding.sol';

contract Crowdfunding is ICrowdfunding, ReentrancyGuard, Ownable {
    string public title;
    string public description;
    uint256 public minimumContribution;
    uint256 public targetFunding;
    uint256 public totalContributions;
    uint32 public fundingDeadline;
    uint32 public transferRequestDeadline;
    uint32 public refundingStart;
    uint32 public refundingDeadline;

    mapping(address => uint256) public contributions;
    mapping(uint256 => mapping(address => bool)) public requestsVotingHistory;
    bool public isDestroy;

    struct FundingRequest {
        string purpose;
        uint256 amount;
        address payable recipient;
        uint256 approveVote;
        uint256 totalVote;
        uint32 deadline;
        ICrowdfunding.RequestStatus status;
    }

    FundingRequest[] public fundingRequests;

    modifier isActive() {
        if (isDestroy) revert ICrowdfunding.ContractAlreadyDestroyed();
        _;
    }

    modifier onlyContributor() {
        if (contributions[msg.sender] == 0)
            revert ICrowdfunding.NotContributor();
        _;
    }

    constructor(
        string memory _title,
        string memory _description,
        uint256 _minimumContribution,
        uint256 _targetFunding,
        uint8 fundingMonths,
        uint8 transferRequestMonths,
        address owner
    ) Ownable(owner) {
        if (fundingMonths < 1 || fundingMonths > 6) {
            revert ICrowdfunding.InvalidRange('fundingMonths', 1, 6);
        }
        if (transferRequestMonths < 3 || transferRequestMonths > 24) {
            revert ICrowdfunding.InvalidRange('transferRequestMonths', 3, 24);
        }
        title = _title;
        description = _description;
        minimumContribution = _minimumContribution;
        targetFunding = _targetFunding;
        fundingDeadline = uint32(block.timestamp + (fundingMonths * 30 days)); // approximately
        transferRequestDeadline = uint32(
            fundingDeadline + (transferRequestMonths * 30 days)
        ); // approximately
        refundingStart = transferRequestDeadline + 45 days; // 30 days for fundingRequest voting period create in the last day, 15 days buffer for claiming the fund
        refundingDeadline = refundingStart + 365 days;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function contribute() public payable isActive {
        if (block.timestamp > fundingDeadline) {
            revert ICrowdfunding.FundingPeriodEnded();
        }
        if (msg.value < minimumContribution) {
            revert ICrowdfunding.InsufficientContribution(minimumContribution);
        }

        contributions[msg.sender] += msg.value;
        totalContributions += msg.value;

        emit ICrowdfunding.ContributionReceived(msg.sender, msg.value);
    }

    function createFundingRequest(
        string memory _purpose,
        uint256 _amount,
        address payable _recipient
    ) public onlyOwner isActive {
        if (
            block.timestamp < fundingDeadline ||
            block.timestamp > transferRequestDeadline
        ) {
            revert ICrowdfunding.InvalidDuration(
                'createFundingRequest',
                fundingDeadline,
                transferRequestDeadline
            );
        }
        if (totalContributions < targetFunding) {
            revert ICrowdfunding.FundingGoalNotReached();
        }
        uint256 balance = getBalance();
        if (_amount > balance) {
            revert ICrowdfunding.InsufficientFunds(balance, _amount);
        }
        FundingRequest storage newRequest = fundingRequests.push();
        newRequest.purpose = _purpose;
        newRequest.amount = _amount;
        newRequest.recipient = _recipient;
        newRequest.status = ICrowdfunding.RequestStatus.Processing;
        newRequest.deadline = uint32(block.timestamp + 30 days); // approximately

        emit ICrowdfunding.FundingRequestCreated(
            fundingRequests.length - 1,
            _purpose,
            _amount,
            _recipient
        );
    }

    function voteForRequest(
        uint256 _requestId,
        bool _voteFor
    ) public onlyContributor isActive {
        FundingRequest storage request = fundingRequests[_requestId];
        if (block.timestamp > request.deadline) {
            revert ICrowdfunding.RequestVotingPeriodEnded();
        }
        if (requestsVotingHistory[_requestId][msg.sender]) {
            revert ICrowdfunding.AlreadyVoted();
        }

        requestsVotingHistory[_requestId][msg.sender] = true;
        request.totalVote += 1;
        if (_voteFor) {
            request.approveVote += 1;
        }

        emit ICrowdfunding.VoteCast(_requestId, msg.sender, _voteFor);
    }

    function finalizeRequest(
        uint32 _requestId
    ) public onlyOwner nonReentrant isActive {
        FundingRequest storage request = fundingRequests[_requestId];
        if (request.status != ICrowdfunding.RequestStatus.Processing) {
            revert ICrowdfunding.RequestNotProcessing(_requestId);
        }
        if (block.timestamp < request.deadline) {
            revert ICrowdfunding.RequestVotingPeriodNotEnded();
        }

        bool isApproved = request.totalVote != 0 &&
            ((request.approveVote * 100) / request.totalVote > 50);

        if (isApproved) {
            payoutRequest(_requestId, request);
        } else {
            rejectRequest(_requestId, request);
        }
    }

    function listFundingRequest()
        external
        view
        returns (FundingRequest[] memory)
    {
        return fundingRequests;
    }

    function getFundingRequestCount() external view returns (uint) {
        return fundingRequests.length;
    }

    function refundIfTargetNotMet()
        external
        isActive
        onlyContributor
        nonReentrant
    {
        if (block.timestamp < fundingDeadline) {
            revert ICrowdfunding.FundingPeriodRefundIsNotAllowed();
        }
        if (
            block.timestamp > fundingDeadline &&
            totalContributions >= targetFunding
        ) {
            revert ICrowdfunding.FundingGoalReached();
        }
        uint256 refundAmount = contributions[msg.sender];

        contributions[msg.sender] = 0;
        payable(msg.sender).transfer(refundAmount);
        emit ICrowdfunding.RefundTransferred(msg.sender, refundAmount);
    }

    function refundRemainingBalance()
        external
        isActive
        onlyContributor
        nonReentrant
    {
        if (
            block.timestamp < refundingStart ||
            block.timestamp >= refundingDeadline
        ) {
            revert ICrowdfunding.InvalidDuration(
                'refund',
                refundingStart,
                refundingDeadline
            );
        }
        uint256 remainingBalance = getBalance();

        uint256 refundAmount = (remainingBalance * contributions[msg.sender]) /
            totalContributions;

        contributions[msg.sender] = 0;
        payable(msg.sender).transfer(refundAmount);
        emit ICrowdfunding.RefundTransferred(msg.sender, refundAmount);
    }

    function destroyContract() public onlyOwner {
        if (block.timestamp <= refundingDeadline) {
            revert ICrowdfunding.RefundPeriodNotEnded(refundingDeadline);
        }
        uint256 remainingBalance = address(this).balance;
        emit ICrowdfunding.SelfDestructed(owner(), remainingBalance);
        isDestroy = true;
        payable(owner()).transfer(remainingBalance);
    }

    function payoutRequest(
        uint32 _requestId,
        FundingRequest storage request
    ) internal {
        uint256 balance = getBalance();
        if (balance < request.amount) {
            revert ICrowdfunding.InsufficientFunds(balance, request.amount);
        }
        request.status = ICrowdfunding.RequestStatus.Payout;
        request.recipient.transfer(request.amount);

        emit ICrowdfunding.FundingRequestUpdated(_requestId, request.status);
        emit ICrowdfunding.PayoutCompleted(
            _requestId,
            request.amount,
            request.recipient
        );
    }

    function rejectRequest(
        uint32 _requestId,
        FundingRequest storage request
    ) internal {
        request.status = ICrowdfunding.RequestStatus.Rejected;
        emit ICrowdfunding.FundingRequestUpdated(_requestId, request.status);
    }
}
