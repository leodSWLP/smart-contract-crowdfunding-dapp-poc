// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CrowdfundingCommon {

    enum RequestStatus { Processing, Rejected, Payout }

    // Custom errors
    error InsufficientContribution(uint256 minimumContribution);
    error FundingPeriodEnded();
    error FundingPeriodRefundIsNotAllowed();
    error FundingGoalReached();
    error FundingGoalNotReached();
    error InsufficientFunds(uint256 available, uint256 requested);
    error RequestNotProcessing(uint256 requestId);
    error NotContributor();
    error RequestVotingPeriodEnded();
    error RequestVotingPeriodNotEnded();
    error AlreadyVoted();
    error InvalidDuration(string durationType, uint min, uint max);
    error InvalidRange(string rangeType, uint min, uint max);
    error RefundPeriodNotEnded(uint refundingDeadline);
    error ContractAlreadyDestroyed();


    // Event signatures (for reference; emitted in the main contract)
    event ContributionReceived(address contributor, uint amount);
    event FundingRequestCreated(uint256 requestId, string purpose, uint transferAmount, address recipient);
    event VoteCast(uint256 requestId, address voter, bool voteFor);
    event FundingRequestUpdated(uint32 requestId, RequestStatus status);
    event PayoutCompleted(uint32 requestId, uint256 transferAmount, address recipient);
    event RefundTransferred(address recipient, uint256 amount);
    event SelfDestructed(address owner, uint256 remainingBalance);
}
