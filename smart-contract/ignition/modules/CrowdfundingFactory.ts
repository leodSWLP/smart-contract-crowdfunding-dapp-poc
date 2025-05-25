import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const MAX_CROWDFUNDING_COUNT = 100;

const CrowdfundingFactoryModule = buildModule(
  'CrowdfundingFactoryModule',
  (m) => {
    const maxCrowdfundingCount = m.getParameter(
      'maxCrowdfundingCount',
      MAX_CROWDFUNDING_COUNT,
    );

    const crowdfundingFactory = m.contract('CrowdfundingFactory', [
      maxCrowdfundingCount,
    ]);

    return {
      crowdfundingFactory,
    };
  },
);

export default CrowdfundingFactoryModule;
