# Crowdfunding POC Smart Contracts

## Overview

Solidity backend for a crowdfunding POC, with `CrowdFundingFactory` (deploys campaigns) and `Crowdfunding` (manages funds, requests, voting, refunds). Built with Hardhat for self-learning.

## Purpose

To learn Solidity development, focusing on factory patterns and crowdfunding logic.

## Features

- **CrowdFundingFactory**:
  - Users deploy `Crowdfunding` contracts (title, description, min contribution, target, 1-6 month funding, 3-24 month requests).
  - Owner sets max contract limit, can pause/unpause creation.
  - Lists deployed contracts.
- **Crowdfunding**:
  - Contributors send ≥ min ETH during funding period.
  - Managers create requests post-funding if target met.
  - Contributors vote (30 days, >50% approval).
  - Managers finalize approved requests or reject others.
  - Refunds: full if target unmet; proportional for unspent funds (45 days post-requests to 365 days).
  - Managers destroy contract post-refunding.

## Setup

1. **Requirements**: Node.js v22, Hardhat.
2. **Dependencies**: OpenZeppelin (`Ownable`, `ReentrancyGuard`), `CrowdfundingCommon.sol`.
3. **Install**: Run `npm install` in Hardhat project.
4. **Deploy**: Compile and deploy with `npx hardhat run scripts/deploy.ts --network sepolia`.
5. **Test**: Use Hardhat tasks or MetaMask to test factory and crowdfunding functions.

## Notes

- POC for learning; unaudited, not for production.
- Uses Hardhat for compilation, deployment, and testing.
