import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const ONE_GWEI: bigint = 1_000_000_000n;

const CrowdfundingModule = buildModule('CrowdfundingModule', (m) => {
  const title = m.getParameter('title');
  const description = m.getParameter('description');
  const minimumContribution = m.getParameter('minimumContribution', ONE_GWEI);
  const targetFunding = m.getParameter('targetFunding');
  const fundingMonths = m.getParameter('fundingMonths');
  const transferRequestMonths = m.getParameter('transferRequestMonths');
  const owner = m.getParameter('owner');

  const crowdfunding = m.contract('Crowdfunding', [
    title,
    description,
    minimumContribution,
    targetFunding,
    fundingMonths,
    transferRequestMonths,
    owner,
  ]);

  return { crowdfunding };
});

export default CrowdfundingModule;
