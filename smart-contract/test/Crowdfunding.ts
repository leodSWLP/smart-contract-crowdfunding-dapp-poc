import { ethers } from 'hardhat';
import { expect } from 'chai';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { Crowdfunding, Crowdfunding__factory } from '../typechain-types';
import { days } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration';
import { request } from 'http';

describe('Crowdfunding Contract', () => {
  let CrowdfundingContractFactory: Crowdfunding__factory;
  let crowdfunding: Crowdfunding;
  let owner: SignerWithAddress;
  let contributor1: SignerWithAddress;
  let contributor2: SignerWithAddress;
  let contributor3: SignerWithAddress;
  let recipient: SignerWithAddress;
  const TITLE = 'Test Crowdfunding';
  const DESCRIPTION = 'A test crowdfunding campaign';
  const MIN_CONTRIBUTION = ethers.parseEther('1');
  const TARGET_FUNDING = ethers.parseEther('100');
  const FUNDING_MONTHS = 1;
  const TRANSFER_REQUEST_MONTHS = 3;
  const ONE_DAY = 24 * 60 * 60;
  let deploymentTime;

  beforeEach(async () => {
    [owner, contributor1, contributor2, contributor3, recipient] =
      await ethers.getSigners();
    CrowdfundingContractFactory = await ethers.getContractFactory(
      'Crowdfunding',
    );
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

    const deployTx = crowdfunding.deploymentTransaction();
    const block = await ethers.provider.getBlock(deployTx?.blockNumber ?? 0);

    // const blockNumBefore = await ethers.provider.getBlockNumber();
    // const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    // const timestampBefore = blockBefore!.timestamp;
    // console.log('timestampBefore: ', timestampBefore);
    deploymentTime = block!.timestamp;
  });

  describe('Deployment', () => {
    beforeEach(async () => {
      [owner, contributor1, contributor2, contributor3, recipient] =
        await ethers.getSigners();
      CrowdfundingContractFactory = await ethers.getContractFactory(
        'Crowdfunding',
      );
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
    it('should set correct initial state', async () => {
      expect(await crowdfunding.title()).to.equal(TITLE);
      expect(await crowdfunding.description()).to.equal(DESCRIPTION);
      expect(await crowdfunding.minimumContribution()).to.equal(
        MIN_CONTRIBUTION,
      );
      expect(await crowdfunding.targetFunding()).to.equal(TARGET_FUNDING);
      expect(await crowdfunding.fundingDeadline()).to.approximately(
        deploymentTime + FUNDING_MONTHS * 30 * ONE_DAY,
        30,
      );
      expect(await crowdfunding.transferRequestDeadline()).to.approximately(
        deploymentTime +
          (FUNDING_MONTHS + TRANSFER_REQUEST_MONTHS) * 30 * ONE_DAY,
        30,
      );
      expect(await crowdfunding.refundingStart()).to.approximately(
        deploymentTime +
          (FUNDING_MONTHS + TRANSFER_REQUEST_MONTHS) * 30 * ONE_DAY +
          45 * ONE_DAY,
        30,
      );
      expect(await crowdfunding.refundingDeadline()).to.approximately(
        deploymentTime +
          (FUNDING_MONTHS + TRANSFER_REQUEST_MONTHS) * 30 * ONE_DAY +
          45 * ONE_DAY +
          365 * ONE_DAY,
        30,
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
      await time.increaseTo(deploymentTime + FUNDING_MONTHS * 31 * ONE_DAY);
      await expect(
        crowdfunding
          .connect(contributor1)
          .contribute({ value: ethers.parseEther('1') }),
      ).to.revertedWithCustomError(crowdfunding, 'FundingPeriodEnded');
    });
  });

  describe('Funding Requests', () => {
    describe('Sufficient funding', () => {
      beforeEach(async () => {
        await crowdfunding
          .connect(contributor1)
          .contribute({ value: ethers.parseEther('30') });
        await crowdfunding
          .connect(contributor2)
          .contribute({ value: ethers.parseEther('30') });
        await crowdfunding
          .connect(contributor3)
          .contribute({ value: ethers.parseEther('40') });

        await time.increaseTo(deploymentTime + 31 * ONE_DAY);
      });

      it('should create funding request by owner', async () => {
        const purpose = 'Test';
        const amount = ethers.parseEther('10');

        await expect(
          crowdfunding
            .connect(owner)
            .createFundingRequest(purpose, amount, recipient.address),
        )
          .to.be.emit(crowdfunding, 'FundingRequestCreated')
          .withArgs(0, purpose, amount, recipient.address);

        expect(await crowdfunding.getFundingRequestCount()).to.equal(1);
        const requests = await crowdfunding.listFundingRequest();
        expect(requests[0].purpose).to.be.equal(purpose);
        expect(requests[0].amount).to.be.equal(amount);
        expect(requests[0].recipient).to.be.equal(recipient.address);
        expect(requests[0].status).to.be.equal(0);
      });

      it('should revert if not owner', async () => {
        await expect(
          crowdfunding
            .connect(contributor1)
            .createFundingRequest(
              'Test',
              ethers.parseEther('10'),
              recipient.address,
            ),
        ).to.revertedWithCustomError(
          crowdfunding,
          'OwnableUnauthorizedAccount',
        );
      });

      it('should revert if outside transfer request period', async () => {
        await time.increaseTo(
          deploymentTime +
            (FUNDING_MONTHS + TRANSFER_REQUEST_MONTHS) * 30 * ONE_DAY +
            1,
        );
        await expect(
          crowdfunding
            .connect(owner)
            .createFundingRequest(
              'Test',
              ethers.parseEther('10'),
              recipient.address,
            ),
        ).to.revertedWithCustomError(crowdfunding, 'InvalidDuration');
      });

      it('should revert if amount exceeds balance', async () => {
        await expect(
          crowdfunding
            .connect(owner)
            .createFundingRequest(
              'Test',
              ethers.parseEther('101'),
              recipient.address,
            ),
        ).to.be.revertedWithCustomError(crowdfunding, 'InsufficientFunds');
      });
    });
    describe('Insufficient funding', () => {
      beforeEach(async () => {
        await crowdfunding
          .connect(contributor1)
          .contribute({ value: ethers.parseEther('30') });
        await crowdfunding
          .connect(contributor2)
          .contribute({ value: ethers.parseEther('30') });

        await time.increaseTo(deploymentTime + 31 * ONE_DAY);
      });

      it('should revert if funding goal not reached', async () => {
        await expect(
          crowdfunding
            .connect(owner)
            .createFundingRequest(
              'Test',
              ethers.parseEther('10'),
              recipient.address,
            ),
        ).to.be.revertedWithCustomError(crowdfunding, 'FundingGoalNotReached');
      });
    });
  });
});
