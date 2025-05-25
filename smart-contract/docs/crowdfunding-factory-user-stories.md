# User Story: CrowdFundingFactory Smart Contract

## As a Platform Owner

- **I want to** deploy a factory contract with a maximum limit on the number of crowdfunding contracts  
  **so that** I can control the number of campaigns created on my platform.
- **I want to** pause the factory contract  
  **so that** I can temporarily halt the creation of new crowdfunding contracts for maintenance or other reasons.
- **I want to** unpause the factory contract  
  **so that** users can resume creating crowdfunding contracts.
- **I want to** view the list of all deployed crowdfunding contracts  
  **so that** I can monitor and manage the campaigns on my platform.

## As a User

- **I want to** deploy my own crowdfunding contract through the factory, specifying title, description, minimum contribution, target funding, funding period (1-6 months), and transfer request period (3-24 months)  
  **so that** I can create and manage my own crowdfunding campaign.
- **I want to** be prevented from creating a crowdfunding contract if the factory is paused or the maximum contract limit is reached  
  **so that** I understand the platform’s operational constraints.
- **I want to** view the list of all deployed crowdfunding contracts  
  **so that** I can explore other campaigns on the platform.

## Acceptance Criteria

- The factory contract is deployed with a specified maximum number of crowdfunding contracts.
- Only the platform owner can pause and unpause the factory contract.
- Users can create a crowdfunding contract with the required parameters (title, description, minimum contribution, target funding, funding months, transfer request months) when the factory is not paused and the maximum contract limit is not reached.
- The factory rejects crowdfunding contract creation if paused or if the maximum contract limit is exceeded.
- The factory emits a `CrowdFundingCreated` event with details (address, title, minimum contribution, target funding, funding months, transfer request months, owner) upon successful contract creation.
- Any user can retrieve the list of deployed crowdfunding contract addresses and the total count of contracts.
- The factory integrates with the `Crowdfunding` contract, ensuring each deployed contract is owned by the user who created it.
