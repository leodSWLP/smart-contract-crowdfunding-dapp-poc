# Crowdfunding POC Project

## Overview

A self-learning proof-of-concept (POC) for a decentralized crowdfunding platform on Ethereum. Features a React.js/TypeScript frontend and Solidity smart contract backend (`CrowdFundingFactory`, `Crowdfunding`). Users create campaigns, contribute ETH, vote on spending requests, and request refunds via a web interface.

## Purpose

To learn dApp development with React.js, TypeScript, Hardhat, Solidity, and web3.js for blockchain interaction.

## Components

- **Frontend**: React.js with TypeScript, using web3.js to interact with contracts via MetaMask.
- **Backend**:
  - `CrowdFundingFactory`: Deploys `Crowdfunding` contracts with custom settings.
  - `Crowdfunding`: Manages campaign funds, requests, voting, payouts, and refunds.

## Setup

1. **Requirements**: Node.js v22, Hardhat, MetaMask, TypeScript.
2. **Backend**:
   - Clone repo, run `npm install` in Hardhat project.
   - Compile/deploy contracts (`CrowdfundingCommon.sol`, `Crowdfunding.sol`, `CrowdFundingFactory.sol`) with `npx hardhat run scripts/deploy.ts --network sepolia`.
   - Save factory contract address for frontend.
3. **Frontend**:
   - In frontend dir, run `npm install`, then `npm run dev`.
   - Configure web3.js with factory address and ABI.
4. **Test**: Use MetaMask (Sepolia testnet) to create campaigns, contribute, vote, finalize, and refund via UI.

## TODO List

- [x] Build Crowdfunding and CrowdfundingFactory contract
- [x] Smart contract thorough testing
- [ ] React Home page interact with CrowdfundingFactory contract to list campaign and create campaign
- [ ] Click Campaign route to detail page interact with Crowdfunding contract, manage your own campaign or become contributor
- [ ] Setup docker-compose local for local testing
- [ ] Deploy CrowdfundingFactory to sepolia testnets
- [ ] Host front end CodeSandbox

## Notes

- POC for self-learning; not for production.
- Focuses on mastering dApp and contract interactions with web3.js.
