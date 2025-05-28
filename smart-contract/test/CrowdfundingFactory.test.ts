import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import {
  CrowdFundingFactory,
  CrowdFundingFactory__factory,
  Crowdfunding,
  Crowdfunding__factory,
} from '../typechain-types';

describe('CrowdFundingFactory Contract', () => {
  let CrowdFundingFactoryFactory: CrowdFundingFactory__factory;
  let crowdFundingFactory: CrowdFundingFactory;
  let crowdfundingContractFactory: Crowdfunding__factory;

  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  const MAX_CROWDFUNDING_COUNT = 5;
  const TITLE = 'Test Crowdfunding';
  const DESCRIPTION = 'A test crowdfunding campaign';
  const MIN_CONTRIBUTION = ethers.parseEther('1');
  const TARGET_FUNDING = ethers.parseEther('100');
  const FUNDING_MONTHS = 1;
  const TRANSFER_REQUEST_MONTHS = 3;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    CrowdFundingFactoryFactory = await ethers.getContractFactory(
      'CrowdFundingFactory',
    );
    crowdFundingFactory = await CrowdFundingFactoryFactory.deploy(
      MAX_CROWDFUNDING_COUNT,
    );
    await crowdFundingFactory.waitForDeployment();
    crowdfundingContractFactory = await ethers.getContractFactory(
      'Crowdfunding',
    );
  });

  describe('Deployment', () => {
    it('should set correct initial state', async () => {
      expect(await crowdFundingFactory.owner()).to.equal(owner.address);
      expect(await crowdFundingFactory.maxCrowdfundingCount()).to.equal(
        MAX_CROWDFUNDING_COUNT,
      );
      expect(await crowdFundingFactory.isPause()).to.be.false;
      expect(await crowdFundingFactory.getCrowdFundingCount()).to.equal(0);
      expect(
        await crowdFundingFactory.getCrowdfundingContracts(),
      ).to.deep.equal([]);
    });
  });

  describe('createCrowdFunding', () => {
    it('should create a crowdfunding contract with valid parameters', async () => {
      const tx = await crowdFundingFactory
        .connect(user1)
        .createCrowdFunding(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          TRANSFER_REQUEST_MONTHS,
        );
      const receipt = await tx.wait();
      const crowdFundingAddress = (
        await crowdFundingFactory.getCrowdfundingContracts()
      )[0];

      // Verify event emission
      await expect(tx)
        .to.emit(crowdFundingFactory, 'CrowdFundingCreated')
        .withArgs(
          crowdFundingAddress,
          TITLE,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          TRANSFER_REQUEST_MONTHS,
          user1.address,
        );

      // Verify contract storage
      expect(await crowdFundingFactory.getCrowdFundingCount()).to.equal(1);
      expect(
        await crowdFundingFactory.getCrowdfundingContracts(),
      ).to.deep.equal([crowdFundingAddress]);

      // Verify deployed Crowdfunding contract state
      const crowdfundingContract = (await ethers.getContractAt(
        'Crowdfunding',
        crowdFundingAddress,
      )) as Crowdfunding;
      expect(await crowdfundingContract.title()).to.equal(TITLE);
      expect(await crowdfundingContract.description()).to.equal(DESCRIPTION);
      expect(await crowdfundingContract.minimumContribution()).to.equal(
        MIN_CONTRIBUTION,
      );
      expect(await crowdfundingContract.targetFunding()).to.equal(
        TARGET_FUNDING,
      );
      expect(await crowdfundingContract.owner()).to.equal(user1.address);
    });

    it('should allow owner to create a crowdfunding contract', async () => {
      await crowdFundingFactory
        .connect(owner)
        .createCrowdFunding(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          TRANSFER_REQUEST_MONTHS,
        );
      expect(await crowdFundingFactory.getCrowdFundingCount()).to.equal(1);
      const crowdFundingAddress = (
        await crowdFundingFactory.getCrowdfundingContracts()
      )[0];
      const crowdfundingContract = (await ethers.getContractAt(
        'Crowdfunding',
        crowdFundingAddress,
      )) as Crowdfunding;
      expect(await crowdfundingContract.owner()).to.equal(owner.address);
    });

    it('should revert if factory is paused', async () => {
      // Assuming pause functionality exists via Ownable or custom implementation
      // If no pause function exists, we need to add it or skip this test
      await crowdFundingFactory.connect(owner).pause(true); // Hypothetical pause function
      await expect(
        crowdFundingFactory
          .connect(user1)
          .createCrowdFunding(
            TITLE,
            DESCRIPTION,
            MIN_CONTRIBUTION,
            TARGET_FUNDING,
            FUNDING_MONTHS,
            TRANSFER_REQUEST_MONTHS,
          ),
      ).to.be.revertedWithCustomError(
        crowdFundingFactory,
        'FactoryContractIsPaused',
      );
    });

    it('should revert if maxCrowdfundingCount is reached', async () => {
      // Create MAX_CROWDFUNDING_COUNT contracts
      for (let i = 0; i < MAX_CROWDFUNDING_COUNT; i++) {
        await crowdFundingFactory
          .connect(user1)
          .createCrowdFunding(
            TITLE,
            DESCRIPTION,
            MIN_CONTRIBUTION,
            TARGET_FUNDING,
            FUNDING_MONTHS,
            TRANSFER_REQUEST_MONTHS,
          );
      }
      // Attempt to create one more
      await expect(
        crowdFundingFactory
          .connect(user1)
          .createCrowdFunding(
            TITLE,
            DESCRIPTION,
            MIN_CONTRIBUTION,
            TARGET_FUNDING,
            FUNDING_MONTHS,
            TRANSFER_REQUEST_MONTHS,
          ),
      )
        .to.be.revertedWithCustomError(
          crowdFundingFactory,
          'TooManyCrowdfundingContract',
        )
        .withArgs(MAX_CROWDFUNDING_COUNT);
    });

    it('should revert if Crowdfunding constructor parameters are invalid', async () => {
      await expect(
        crowdFundingFactory.connect(user1).createCrowdFunding(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          7, // Invalid must be 1–6 per Crowdfunding contract
          TRANSFER_REQUEST_MONTHS,
        ),
      ).to.be.revertedWithCustomError(
        crowdfundingContractFactory,
        'InvalidRange',
      );

      await expect(
        crowdFundingFactory.connect(user1).createCrowdFunding(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          2, // Invalid must be 3–24 per Crowdfunding contract
        ),
      ).to.be.revertedWithCustomError(
        crowdfundingContractFactory,
        'InvalidRange',
      );
    });
  });

  describe('getCrowdfundingContracts', () => {
    it('should return empty array when no contracts exist', async () => {
      expect(
        await crowdFundingFactory.getCrowdfundingContracts(),
      ).to.deep.equal([]);
    });

    it('should return correct list of crowdfunding contracts', async () => {
      const tx1 = await crowdFundingFactory
        .connect(user1)
        .createCrowdFunding(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          TRANSFER_REQUEST_MONTHS,
        );
      const tx2 = await crowdFundingFactory
        .connect(user2)
        .createCrowdFunding(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          TRANSFER_REQUEST_MONTHS,
        );
      const receipt1 = await tx1.wait();
      const receipt2 = await tx2.wait();
      const address1 = (
        await crowdFundingFactory.getCrowdfundingContracts()
      )[0];
      const address2 = (
        await crowdFundingFactory.getCrowdfundingContracts()
      )[1];
      expect(
        await crowdFundingFactory.getCrowdfundingContracts(),
      ).to.deep.equal([address1, address2]);
    });
  });

  describe('getCrowdFundingCount', () => {
    it('should return 0 when no contracts exist', async () => {
      expect(await crowdFundingFactory.getCrowdFundingCount()).to.equal(0);
    });

    it('should return correct count after creating contracts', async () => {
      await crowdFundingFactory
        .connect(user1)
        .createCrowdFunding(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          TRANSFER_REQUEST_MONTHS,
        );
      expect(await crowdFundingFactory.getCrowdFundingCount()).to.equal(1);

      await crowdFundingFactory
        .connect(user2)
        .createCrowdFunding(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          TRANSFER_REQUEST_MONTHS,
        );
      expect(await crowdFundingFactory.getCrowdFundingCount()).to.equal(2);
    });
  });

  describe('Pause Functionality', () => {
    it('should allow owner to pause and unpause', async () => {
      await crowdFundingFactory.connect(owner).pause(true);
      expect(await crowdFundingFactory.isPause()).to.be.true;

      await crowdFundingFactory.connect(owner).pause(false);
      expect(await crowdFundingFactory.isPause()).to.be.false;
    });

    it('should revert if non-owner tries to pause', async () => {
      await expect(
        crowdFundingFactory.connect(user1).pause(true),
      ).to.be.revertedWithCustomError(
        crowdFundingFactory,
        'OwnableUnauthorizedAccount',
      );
    });

    it('should revert if create crowd funding when pause', async () => {
      await crowdFundingFactory.connect(owner).pause(true);
      expect(await crowdFundingFactory.isPause()).to.be.true;

      await expect(
        crowdFundingFactory
          .connect(user1)
          .createCrowdFunding(
            TITLE,
            DESCRIPTION,
            MIN_CONTRIBUTION,
            TARGET_FUNDING,
            FUNDING_MONTHS,
            TRANSFER_REQUEST_MONTHS,
          ),
      ).to.revertedWithCustomError(
        crowdFundingFactory,
        'FactoryContractIsPaused',
      );
    });
  });
});
