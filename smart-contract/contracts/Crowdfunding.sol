// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrowdfundingCommon.sol";

contract Crowdfunding is ReentrancyGuard, Ownable {
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
        CrowdfundingCommon.RequestStatus status;
    }

    FundingRequest[] public fundingRequests;

    modifier isActive() {
        if (isDestroy) revert CrowdfundingCommon.ContractAlreadyDestroyed();
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
            revert CrowdfundingCommon.InvalidRange("fundingMonths", 1, 6);
        }
        if (transferRequestMonths < 3 || transferRequestMonths > 24) {
            revert CrowdfundingCommon.InvalidRange(
                "transferRequestMonths",
                3,
                24
            );
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
            revert CrowdfundingCommon.FundingPeriodEnded();
        }
        if (msg.value < minimumContribution) {
            revert CrowdfundingCommon.InsufficientContribution(
                minimumContribution
            );
        }

        contributions[msg.sender] += msg.value;
        totalContributions += msg.value;

        emit CrowdfundingCommon.ContributionReceived(msg.sender, msg.value);
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
            revert CrowdfundingCommon.InvalidDuration(
                "createFundingRequest",
                fundingDeadline,
                transferRequestDeadline
            );
        }
        if (totalContributions < targetFunding) {
            revert CrowdfundingCommon.FundingGoalNotReached();
        }
        uint256 balance = getBalance();
        if (_amount > balance) {
            revert CrowdfundingCommon.InsufficientFunds(balance, _amount);
        }
        FundingRequest storage newRequest = fundingRequests.push();
        newRequest.purpose = _purpose;
        newRequest.amount = _amount;
        newRequest.recipient = _recipient;
        newRequest.status = CrowdfundingCommon.RequestStatus.Processing;
        newRequest.deadline = uint32(block.timestamp + 30 days); // approximately

        emit CrowdfundingCommon.FundingRequestCreated(
            fundingRequests.length - 1,
            _purpose,
            _amount,
            _recipient
        );
    }

    function voteForRequest(uint256 _requestId, bool _voteFor) public isActive {
        if (contributions[msg.sender] == 0) {
            revert CrowdfundingCommon.NotContributor();
        }
        FundingRequest storage request = fundingRequests[_requestId];
        if (block.timestamp > request.deadline) {
            revert CrowdfundingCommon.RequestVotingPeriodEnded();
        }
        if (request.status != CrowdfundingCommon.RequestStatus.Processing) {
            revert CrowdfundingCommon.RequestNotProcessing(_requestId);
        }
        if (requestsVotingHistory[_requestId][msg.sender]) {
            revert CrowdfundingCommon.AlreadyVoted();
        }

        requestsVotingHistory[_requestId][msg.sender] = true;
        request.totalVote += 1;
        if (_voteFor) {
            request.approveVote += 1;
        }

        emit CrowdfundingCommon.VoteCast(_requestId, msg.sender, _voteFor);
    }

    function finalizeRequest(uint32 _requestId)
        public
        onlyOwner
        nonReentrant
        isActive
    {
        FundingRequest storage request = fundingRequests[_requestId];
        if (request.status != CrowdfundingCommon.RequestStatus.Processing) {
            revert CrowdfundingCommon.RequestNotProcessing(_requestId);
        }
        if (block.timestamp < request.deadline) {
            revert CrowdfundingCommon.RequestVotingPeriodNotEnded();
        }
        uint256 approvalPercentage = (request.approveVote * 100) /
            request.totalVote;

        bool isApproved = request.totalVote > 0 && approvalPercentage > 50;

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

    function getFundingRequestCount()
        external
        view
        returns (uint)
    {
        return fundingRequests.length;
    }

    function refundIfTargetNotMet() external isActive nonReentrant {
        if (contributions[msg.sender] == 0) {
            revert CrowdfundingCommon.NotContributor();
        }
        if (
            block.timestamp > fundingDeadline &&
            totalContributions > targetFunding
        ) {
            revert CrowdfundingCommon.FundingGoalReached();
        }
        uint256 refundAmount = contributions[msg.sender];

        contributions[msg.sender] = 0;
        payable(msg.sender).transfer(refundAmount);
        emit CrowdfundingCommon.RefundTransferred(msg.sender, refundAmount);
    }

    function refundRemainingBalance() external isActive nonReentrant {
        if (contributions[msg.sender] == 0) {
            revert CrowdfundingCommon.NotContributor();
        }

        if (
            block.timestamp < refundingStart ||
            block.timestamp >= refundingDeadline
        ) {
            revert CrowdfundingCommon.InvalidDuration(
                "refund",
                refundingStart,
                refundingDeadline
            );
        }
        uint256 remainingBalance = getBalance();

        uint256 refundAmount = (remainingBalance * contributions[msg.sender]) /
            totalContributions;

        contributions[msg.sender] = 0;
        payable(msg.sender).transfer(refundAmount);
        emit CrowdfundingCommon.RefundTransferred(msg.sender, refundAmount);
    }

    function destroyContract() public onlyOwner {
        if (block.timestamp <= refundingDeadline) {
            revert CrowdfundingCommon.RefundPeriodNotEnded(refundingDeadline);
        }
        uint256 remainingBalance = address(this).balance;
        emit CrowdfundingCommon.SelfDestructed(owner(), remainingBalance);
        isDestroy = true;
        payable(owner()).transfer(remainingBalance);
    }

    function payoutRequest(uint32 _requestId, FundingRequest storage request)
        internal
    {
        uint256 balance = getBalance();
        if (balance < request.amount) {
            revert CrowdfundingCommon.InsufficientFunds(
                balance,
                request.amount
            );
        }
        request.status = CrowdfundingCommon.RequestStatus.Payout;
        request.recipient.transfer(request.amount);

        emit CrowdfundingCommon.FundingRequestUpdated(
            _requestId,
            request.status
        );
        emit CrowdfundingCommon.PayoutCompleted(
            _requestId,
            request.amount,
            request.recipient
        );
    }

    function rejectRequest(uint32 _requestId, FundingRequest storage request)
        internal
    {
        request.status = CrowdfundingCommon.RequestStatus.Rejected;
        emit CrowdfundingCommon.FundingRequestUpdated(
            _requestId,
            request.status
        );
    }
}
