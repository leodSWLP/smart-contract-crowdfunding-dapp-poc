import { ethers } from 'hardhat';
import { expect } from 'chai';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { Crowdfunding, Crowdfunding__factory } from '../typechain-types';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';

describe('Crowdfunding Contract', () => {
  let CrowdfundingContractFactory: Crowdfunding__factory;
  let crowdfunding: Crowdfunding;
  let owner: SignerWithAddress;
  let contributor1: SignerWithAddress;
  let contributor2: SignerWithAddress;
  let recipient: SignerWithAddress;
  const TITLE = 'Test Crowdfunding';
  const DESCRIPTION = 'A test crowdfunding campaign';
  const MIN_CONTRIBUTION = ethers.parseEther('1');
  const TARGET_FUNDING = ethers.parseEther('100');
  const FUNDING_MONTHS = 1;
  const TRANSFER_REQUEST_MONTHS = 3;
  const ONE_DAY = 24 * 60 * 60;
  let INITIAL_TIMESTAMP = Math.floor(Date.now() / 1000);

  beforeEach(async () => {
    [owner, contributor1, contributor2, recipient] = await ethers.getSigners();
    CrowdfundingContractFactory = await ethers.getContractFactory(
      'Crowdfunding',
    );
    INITIAL_TIMESTAMP += 10;
    await time.setNextBlockTimestamp(INITIAL_TIMESTAMP);
    crowdfunding = await CrowdfundingContractFactory.deploy(
      TITLE,
      DESCRIPTION,
      MIN_CONTRIBUTION,
      TARGET_FUNDING,
      FUNDING_MONTHS,
      TRANSFER_REQUEST_MONTHS,
      owner.address,
    );

    await crowdfunding.waitForDeployment();
  });

  describe('Deployment', () => {
    it('should set correct initial state', async () => {
      expect(await crowdfunding.title()).to.equal(TITLE);
      expect(await crowdfunding.description()).to.equal(DESCRIPTION);
      expect(await crowdfunding.minimumContribution()).to.equal(
        MIN_CONTRIBUTION,
      );
      expect(await crowdfunding.targetFunding()).to.equal(TARGET_FUNDING);
      expect(await crowdfunding.fundingDeadline()).to.equal(
        INITIAL_TIMESTAMP + FUNDING_MONTHS * 30 * ONE_DAY,
      );
      expect(await crowdfunding.transferRequestDeadline()).to.equal(
        INITIAL_TIMESTAMP +
          (FUNDING_MONTHS + TRANSFER_REQUEST_MONTHS) * 30 * ONE_DAY,
      );
      expect(await crowdfunding.refundingStart()).to.equal(
        INITIAL_TIMESTAMP +
          (FUNDING_MONTHS + TRANSFER_REQUEST_MONTHS) * 30 * ONE_DAY +
          45 * ONE_DAY,
      );
      expect(await crowdfunding.refundingDeadline()).to.equal(
        INITIAL_TIMESTAMP +
          (FUNDING_MONTHS + TRANSFER_REQUEST_MONTHS) * 30 * ONE_DAY +
          45 * ONE_DAY +
          365 * ONE_DAY,
      );
      expect(await crowdfunding.owner()).to.equal(owner.address);
      expect(await crowdfunding.isDestroy()).to.be.false;
    });

    it('should revert with invalid fundingMonths', async () => {
      await expect(
        CrowdfundingContractFactory.deploy(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          7,
          TRANSFER_REQUEST_MONTHS,
          owner.address,
        ),
      ).to.be.revertedWithCustomError(crowdfunding, 'InvalidRange');

      await expect(
        CrowdfundingContractFactory.deploy(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          0,
          TRANSFER_REQUEST_MONTHS,
          owner.address,
        ),
      ).to.be.revertedWithCustomError(crowdfunding, 'InvalidRange');
    });

    it('should revert with invalid transferRequestMonths', async () => {
      await expect(
        CrowdfundingContractFactory.deploy(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          2,
          owner.address,
        ),
      ).to.be.revertedWithCustomError(crowdfunding, 'InvalidRange');
      await expect(
        CrowdfundingContractFactory.deploy(
          TITLE,
          DESCRIPTION,
          MIN_CONTRIBUTION,
          TARGET_FUNDING,
          FUNDING_MONTHS,
          25,
          owner.address,
        ),
      ).to.be.revertedWithCustomError(crowdfunding, 'InvalidRange');
    });
  });

  describe('Contributions', () => {
    it('should accept valid contributions', async () => {
      const contribution = ethers.parseEther('2');
      await expect(
        crowdfunding.connect(contributor1).contribute({ value: contribution }),
      )
        .to.emit(crowdfunding, 'ContributionReceived')
        .withArgs(contributor1.address, contribution);
      expect(await crowdfunding.contributions(contributor1.address)).to.equal(
        contribution,
      );
      expect(await crowdfunding.totalContributions()).to.equal(contribution);
      expect(await crowdfunding.getBalance()).to.equal(contribution);
    });

    it('should revert if contribution is below minimum', async () => {
      await expect(
        crowdfunding
          .connect(contributor1)
          .contribute({ value: ethers.parseEther('0.5') }),
      ).to.revertedWithCustomError(crowdfunding, 'InsufficientContribution');
    });

    it('should revert if funding period is over', async () => {
      await time.increaseTo(INITIAL_TIMESTAMP + FUNDING_MONTHS * 31 * ONE_DAY);
      await expect(
        crowdfunding
          .connect(contributor1)
          .contribute({ value: ethers.parseEther('1') }),
      ).to.revertedWithCustomError(crowdfunding, 'FundingPeriodEnded');
    });
  });
});
