# Crowdfunding POC Frontend

## Overview

A React.js/TypeScript frontend for a crowdfunding POC, enabling interaction with `CrowdFundingFactory` and `Crowdfunding` contracts using web3.js. Built for self-learning dApp UI development.

## Purpose

To practice building a TypeScript-based React UI with web3.js for Ethereum contract interaction.

## Features

- Create campaigns via factory (set title, description, min contribution, target, periods).
- Contribute ETH to campaigns (min contribution required).
- Vote on spending requests (30-day period, one vote per request).
- Finalize approved requests (>50% votes) or request refunds.
- View campaigns and details.
- Connects to Sepolia testnet via MetaMask.

## Setup

1. **Requirements**: Node.js v22, MetaMask.
2. **Install**: In frontend dir, run `npm install`.
3. **Configure**: Add `CrowdFundingFactory` address and ABI to config (e.g., `src/config.ts`).
4. **Run**: Start with `npm run dev`.
5. **Test**: Use MetaMask to create campaigns, contribute, vote, finalize, and refund.

## Notes

- POC for learning; assumes deployed contracts.
- Uses TypeScript for type safety, web3.js for blockchain interaction.
