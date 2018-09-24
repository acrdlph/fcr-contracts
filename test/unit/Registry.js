import lkTestHelpers from 'lk-test-helpers'
const fs = require('fs');
const { expectRevert } = lkTestHelpers(web3)
const BigNumber = require('bignumber.js');

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
const mockAddresses = [
  '0x4e0100882b427b3be1191c5a7c7e79171b8a24dd',
  '0x6512df5964f1578a8164ce93a3238f2b11485d1c',
  '0x687355ca7a320e5420a3db5ae59ef662e4146786'
]

contract.only('Registry', (accounts) => {
  let registry
  before(async () => {
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
      registry = await Registry.new()
      await registry.init(
        TOKEN.address, PARAMETERIZER.address, FUTARCHY_CHALLENGE_FACTORY.address, NAME
      )
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
    it('reverts with a 0 address for token')
    it('reverts with a 0 address for parameterizer')
  })

  describe('apply()', () => {
    describe('when called with invalid parameters', () => {
      it('reverts when called with duplicated listing hash')
      it('reverts when called with a whitelisted listing hash')
      it('reverts if called with an amount less than the minimum deposit')
    })
    describe('when called with valid parameters', () => {
      describe('when storing the new listing', () => {
        it('assigns the correct applicationExpiry')
        it('assigns the correct unstakedDeposit')
        it('assigns the correct owner')
        it('assigns the correct whitelisted attr')
        it('assings challengeID to 0')
      })
      it('transfers token amount from sender to registry contract')
      it('emits an _Application event')
    })
  })

  describe('deposit()', () => {
    describe('when called with invalid parameters', () => {
      it('reverts if listing owner is not the sender address')
    })
    describe('when called with valid parameters', async () => {
      it('updates listing.unstakedDeposit to the correct amount')
      it('transfers the correct token amount from the sender to the registry contract')
      it('emits a _Deposit event')
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
})
