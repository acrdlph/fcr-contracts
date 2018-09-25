import lkTestHelpers from 'lk-test-helpers'
const fs = require('fs');
const { expectRevert, expectEvent } = lkTestHelpers(web3)
const BigNumber = require('bignumber.js');
const moment = require('moment')

const FutarchyOracleFactoryMock = artifacts.require('FutarchyOracleFactoryMock.sol')
const ScalarPriceOracleFactoryMock = artifacts.require('ScalarPriceOracleFactoryMock.sol')
const Registry = artifacts.require('Registry.sol')
const FutarchyChallengeFactory = artifacts.require('FutarchyChallengeFactory.sol')
const Parameterizer = artifacts.require('Parameterizer.sol')
const Token = artifacts.require('EIP20.sol')

const config = JSON.parse(fs.readFileSync('./conf/config.json'));
const params = config.paramDefaults;

let PARAMETERIZER, TOKEN, FUTARCHY_CHALLENGE_FACTORY // async "const's"
const NAME = 'Futarchy Curated Registry'
const STAKE_AMOUNT = params.minDeposit * 10 ** 18
const mockAddresses = [
  '0x4e0100882b427b3be1191c5a7c7e79171b8a24dd',
  '0x6512df5964f1578a8164ce93a3238f2b11485d1c',
  '0x687355ca7a320e5420a3db5ae59ef662e4146786'
]
const zeroAddr = '0x0'

contract('Registry', (accounts) => {
  let registry, listingHash
  before(async () => {
    let listingHash = web3.fromAscii('domain.com')
    let token = await Token.new(1000 * 10**18, "FCR Token", 18, 'CT')
    TOKEN = token

    PARAMETERIZER = await Parameterizer.new()
    let parameters = [params.minDeposit * 10 **18, params.pMinDeposit * 10 **18, params.applyStageLength, params.pApplyStageLength, params.commitStageLength, params.pCommitStageLength, params.revealStageLength, params.pRevealStageLength, params.dispensationPct, params.pDispensationPct, params.voteQuorum, params.pVoteQuorum]
    await PARAMETERIZER.init(token.address, mockAddresses[0], parameters)

    let futarchyOracleMock = await FutarchyOracleFactoryMock.new()
    let scalarPriceOracleFactoryMock = await ScalarPriceOracleFactoryMock.new()
    FUTARCHY_CHALLENGE_FACTORY = await FutarchyChallengeFactory.new(
      mockAddresses[0],
      params.pMinDeposit * 10 ** 18,
      60 * 60 * 24,
      60 * 60 * 24 * 7,
      futarchyOracleMock.address,
      scalarPriceOracleFactoryMock.address,
      mockAddresses[1],
      mockAddresses[2]
    )
  })

  describe('when initialized with valid parameters', ()=> {
    before(async () => {
      registry = await initializeRegistry()
    })

    it('sets the correct token address', async () => {
      expect(await registry.token()).to.equal(TOKEN.address)
    })

    it('sets the correct parameterizer address', async () => {
      expect(await registry.parameterizer()).to.equal(PARAMETERIZER.address)
    })

    it('sets the correct challengeFactory address', async () => {
      expect(await registry.challengeFactory()).to.equal(FUTARCHY_CHALLENGE_FACTORY.address)
    })

    it('sets the correct name', async () => {
      expect(await registry.name()).to.equal(NAME)
    })

    it('sets the correct INITIAL_CHALLENGE_NONCE', async () => {
      expect((await registry.challengeNonce()).toNumber()).to.equal((await registry.INITIAL_CHALLENGE_NONCE()).toNumber())
    })
  })

  describe('when initialized with invalid parameters', () => {
    it('reverts with a 0x address for token', async () => {
      await expectRevert(initializeRegistry({token: zeroAddr}))
    })

    it('reverts with a 0 for token', async () => {
      await expectRevert(initializeRegistry({token: 0}))
    })

    it('reverts with a 0x address for parameterizer', async () => {
      await expectRevert(initializeRegistry({parameterizer: zeroAddr}))
    })

    it('reverts with a 0 for parameterizer', async () => {
      await expectRevert(initializeRegistry({token: 0}))
    })
  })

  describe('apply()', () => {

    before(async () => {
      listingHash = web3.fromAscii('domain.com')
    })

    describe('when called with invalid parameters', () => {
      beforeEach(async () => {
        registry = await initializeRegistry()
      })

      it('reverts when called with duplicate listing hash', async () => {
        await TOKEN.approve(registry.address, 10 * 10 ** 18)
        await registry.apply(listingHash, 10 * 10 ** 18, '')
        await expectRevert(registry.apply(listingHash, 10 * 10 ** 18, ''))
      })

      it('reverts if called with an amount less than the minimum deposit', async () => {
        await TOKEN.approve(registry.address, 9 * 10 ** 18)
        await expectRevert(registry.apply(listingHash, 9 * 10 ** 18, ''))
      })
    })

    describe('when called with valid parameters', () => {
      describe('when storing the new listing', () => {
        let listingData, applicationPeriod

        before(async () => {
          registry = await initializeRegistry()
          applicationPeriod = (await PARAMETERIZER.get('applyStageLen')).toNumber()
          await TOKEN.approve(registry.address, STAKE_AMOUNT, {from: accounts[0]})
          await registry.apply(listingHash, STAKE_AMOUNT, '', {from: accounts[0]})
          listingData = await registry.listings(listingHash)
        })

        it('assigns the correct applicationExpiry', async () => {
          expect(listingData[0].toNumber()).to.equal(moment().unix() + applicationPeriod)
        })

        it('assigns the correct whitelisted attr', async () => {
          expect(listingData[1]).to.equal(false)
        })

        it('assigns the correct owner', async () => {
          expect(listingData[2]).to.equal(accounts[0])
        })

        it('assigns the correct unstakedDeposit', async () => {
          expect(listingData[3].toNumber()).to.equal(10 * 10 ** 18)
        })

        it('assings challengeID to 0', async () => {
          expect(listingData[4].toNumber()).to.equal(0)
        })
      })

      it('transfers token amount from sender to registry contract', async () => {
        registry = await initializeRegistry();

        const previousApplicantBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        const previousRegistryBalance = (await TOKEN.balanceOf(registry.address)).toNumber()

        await TOKEN.approve(registry.address, STAKE_AMOUNT, {from: accounts[0]})
        await registry.apply(listingHash, STAKE_AMOUNT, '')

        const currentApplicantBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        const currentRegistryBalance = (await TOKEN.balanceOf(registry.address)).toNumber()

        expect(currentApplicantBalance).to.equal(previousApplicantBalance - STAKE_AMOUNT)
        expect(currentRegistryBalance).to.equal(previousRegistryBalance + STAKE_AMOUNT)
      })

      it('emits an _Application event', async () => {
        registry = await initializeRegistry();
        await TOKEN.approve(registry.address, STAKE_AMOUNT, {from: accounts[0]})
        await expectEvent('_Application', registry.apply(listingHash, STAKE_AMOUNT, ''))
      })
    })
  })

  describe('deposit()', () => {

    before(async () => {
      listingHash = web3.fromAscii('domain.com')
    })

    describe('when called with invalid parameters', () => {
      it('reverts if listing owner is not the sender address', async () => {
        registry = await initializeRegistry()
        await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
        TOKEN.approve(registry.address, STAKE_AMOUNT)
        await expectRevert(registry.deposit(listingHash, STAKE_AMOUNT, {from: accounts[1]}))
      })
    })

    describe('when called with valid parameters', async () => {
      let previousUnstakedDepositAmount, previousApplicantBalance, previousRegistryBalance, depositAmount

      before(async () => {
        registry = await initializeRegistry()
        await applyListing(listingHash, accounts[0], TOKEN, STAKE_AMOUNT)
        TOKEN.approve(registry.address, STAKE_AMOUNT)
        previousUnstakedDepositAmount = (await registry.listings(listingHash))[3].toNumber()
        previousApplicantBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        previousRegistryBalance = (await TOKEN.balanceOf(registry.address)).toNumber()
        depositAmount = 5 * 10 ** 18
        await registry.deposit(listingHash, depositAmount)
      })

      it('updates listing.unstakedDeposit to the correct amount', async () => {
        const newUnstakedDepositAmount = (await registry.listings(listingHash))[3].toNumber()
        expect(newUnstakedDepositAmount).to.equal(previousUnstakedDepositAmount + depositAmount)
      })

      it('transfers the correct token amount from the sender to the registry contract', async () => {
        const currentApplicantBalance = (await TOKEN.balanceOf(accounts[0])).toNumber()
        const currentRegistryBalance = (await TOKEN.balanceOf(registry.address)).toNumber()

        expect(currentApplicantBalance).to.equal(previousApplicantBalance - depositAmount)
        expect(currentRegistryBalance).to.equal(previousRegistryBalance + depositAmount)
      })

      it('emits a _Deposit event', async () => {
        await TOKEN.approve(registry.address, depositAmount)
        expectEvent('_Deposit', registry.deposit(listingHash, depositAmount))
      })
    })
  })

  describe('withdraw()', () => {
    describe('when called with invalid parameters', () => {
      it('reverts if called by address other than listing owner')
      it('reverts if withdraw amount is larger than listing.unstakedDeposit')
      it('reverts if withdrawing to an amount lower than the minimum deposit')
    })
    describe('when called with valid parameters', () => {
      it('updates listing.unstakedDeposit to the correct amount')
      it('transfers withdrawn tokens back to the listing owner')
      it('emits _Withdraw event')
    })
  })

  describe('exit()', () => {
    describe('when called with invalid parameters', () => {
      it('reverts if called by address other than listing owner')
      it('reverts if listing is now yet whitelisted')
      it('reverts if listing is currently being challenged')
    })
    describe('when called with valid parameters', () => {
      it('deletes the listingHash from the registry')
      it('tranfers unstaked tokens back to listing owner')
      it('emits _ListingRemoved event')
    })
  })

  describe('createChallenge()', () => {
    describe('when deployed with invalid parameters', () => {
      it('reverts if listing does not exist')
      it('reverts if listing is locked in a challenge')
    })
    describe('when deployed with valid parameters', () => {
      describe('when unstakedDeposit is less than minDeposit', () => {
        it('automatically removes listing')
        it('emits a _TouchAndRemoved event')
        it('transfers remaining unstakedDeposit back to listing.owner')
        it('returns 0')
      })
      describe('when listing is qualified to be challenged', () => {
        it('returns the correct challenge nonce')
        it('updates the listing challengeID')
        it('assigns the correct challengeAddress')
        it('assigns the correct challenger')
        it('assigns the correct challenge deposit')
        it('assigns the correct listingHash to the challenge mapping')
        it('emits a _Challenge event')
      })
    })
  })

  async function initializeRegistry(customParams = {}) {
    const {
      token                    = TOKEN.address,
      parameterizer            = PARAMETERIZER.address,
      futarchyChallengeFactory = FUTARCHY_CHALLENGE_FACTORY.address,
      name                     = NAME,
    } = customParams

    let registry = await Registry.new()
    await registry.init(
      token, parameterizer, futarchyChallengeFactory, name
    )
    return registry
  }

  async function applyListing(listingHash, account, token, stakeAmount) {
    await token.approve(registry.address, stakeAmount, {from: account})
    await registry.apply(listingHash, stakeAmount, '')
  }
})
