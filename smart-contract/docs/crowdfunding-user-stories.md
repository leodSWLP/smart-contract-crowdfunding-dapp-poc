# User Story: Crowdfunding Smart Contract

## As a Manager (Owner)

- **I want to** deploy a crowdfunding smart contract with a title, description, minimum contribution, target funding amount, funding period (1-6 months), and transfer request period (3-24 months)  
  **so that** I can collect funds from contributors within a defined timeframe and propose spending requests.
- **I want to** create funding requests with a purpose, amount, and recipient after the funding deadline but before the transfer request deadline  
  **so that** I can propose how to use the collected funds if the target funding is met.
- **I want to** finalize funding requests after their 30-day voting period, transferring funds for requests approved by more than 50% of votes  
  **so that** I can execute approved expenditures.
- **I want to** destroy the contract after the refunding period ends (365 days after refunding start) and transfer any remaining balance to myself  
  **so that** I can close the contract and reclaim unspent funds.
- **I want to** ensure only I can create funding requests, finalize them, and destroy the contract  
  **so that** the contract maintains secure and controlled governance.

## As a Contributor

- **I want to** deposit at least the minimum contribution amount in ETH before the funding deadline  
  **so that** I can support the project and gain voting rights.
- **I want to** vote for or against funding requests during their 30-day voting period, with only one vote per request  
  **so that** I can influence how the collected funds are spent.
- **I want to** request a refund if the target funding is not met after the funding deadline  
  **so that** I can reclaim my entire contribution.
- **I want to** request a proportional refund of the remaining balance between 45 days after the transfer request deadline and 365 days later  
  **so that** I can reclaim my share of unspent funds.
- **I want to** be assured that my funds are protected by reentrancy guards and only used for approved purposes  
  **so that** I can trust the crowdfunding process.

## Acceptance Criteria

- The contract rejects deposits below the minimum contribution or after the funding deadline (1-6 months from deployment).
- Funding requests can only be created by the manager after the funding deadline and before the transfer request deadline (3-24 months from funding deadline), if the target funding is met.
- Contributors with non-zero contributions can vote once per funding request within its 30-day voting period.
- Funding requests are approved if more than 50% of votes are in favor and finalized by the manager after the voting period, transferring the requested amount.
- Refunds are available if the target funding is not met (full contribution) or for remaining balance (proportional share) within the refunding period (from 45 days after transfer request deadline to 365 days later).
- Only the manager can destroy the contract after the refunding period, transferring any remaining balance to themselves.
- The contract uses OpenZeppelin’s `ReentrancyGuard` and `Ownable` for security and access control.
