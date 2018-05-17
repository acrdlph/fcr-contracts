pragma solidity ^0.4.8;
import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/FutarchyOracleFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Oracles/CentralizedOracleFactory.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/MarketMakers/LMSRMarketMaker.sol';
import '@gnosis.pm/gnosis-core-contracts/contracts/Tokens/Token.sol';
import "zeppelin/math/SafeMath.sol";
import "./ChallengeInterface.sol";

contract  FutarchyChallenge is ChallengeInterface {

  // ============
  // STATE:
  // ============
  // GLOBAL VARIABLES
  address public challenger;     // the address of the challenger
  address public listingOwner;   // the address of the listingOwner
  bool public isStarted;         // true if challenger has executed start()
  uint public stakeAmount;       // number of tokens to stake for either party during challenge
  uint public tradingPeriod;     // duration for open trading on scalar prediction markets

  FutarchyOracle public futarchyOracle;                      // Futarchy Oracle to resolve challenge
  FutarchyOracleFactory public futarchyOracleFactory;        // Factory to create FutarchyOracle
  CentralizedOracleFactory public centralizedOracleFactory;  // Oracle to resolve scalar prediction markets
  LMSRMarketMaker public lmsrMarketMaker;                    // MarketMaker for scalar prediction markets
  Token public token;                                        // Address of the TCR's intrinsic ERC20 token
  uint public winningMarketIndex;                            // Index of scalar prediction market with greatest average price for long token


  // ------------
  // CONSTRUCTOR:
  // ------------
  /// @dev Contructor                   Sets up majority of the FutarchyChallenge global state variables
  /// @param _tokenAddr                 Address of the TCR's intrinsic ERC20 token
  /// @param _challenger                Address of the challenger
  /// @param _listingOwner              Address of the listing owner
  /// @param _stakeAmount               Number of tokens to stake for either party during challenge
  /// @param _tradingPeriod              Duration for open trading on scalar prediction markets
  /// @param _futarchyOracleFactory     Factory to create futarchyOracle
  /// @param _centralizedOracleFactory  Factory to create centralizedOracle for scalar prediction markets
  /// @param _lmsrMarketMaker           LMSR Market Maker for scalar prediction markets
  function FutarchyChallenge(
    address _tokenAddr,
    address _challenger,
    address _listingOwner,
    uint _stakeAmount,
    uint _tradingPeriod,
    FutarchyOracleFactory _futarchyOracleFactory,
    CentralizedOracleFactory _centralizedOracleFactory,
    LMSRMarketMaker _lmsrMarketMaker
  ) public {
    challenger = _challenger;
    listingOwner = _listingOwner;

    token = Token(_tokenAddr);
    stakeAmount = _stakeAmount;
    tradingPeriod = _tradingPeriod;
    futarchyOracleFactory = _futarchyOracleFactory;
    centralizedOracleFactory = _centralizedOracleFactory;
    lmsrMarketMaker = _lmsrMarketMaker;
  }


  // ------------
  // Challenge Interface:
  // ------------
  /// @dev start          Creates and funds FutarchyOracle. Futarchy Oracle will spin up
  ///                     corresponding prediction markets which will open for trade within
  ///                     60 seconds of this function invocation
  /// @param _lowerBound  Lower bound prediction for future token price given a Challenge outcome
  /// @param _upperBound  Upper bound prediction for future token price given Challenge outcome
  function start(int _lowerBound, int _upperBound) public {
    CentralizedOracle _centralizedOracle = centralizedOracleFactory.createCentralizedOracle('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
    uint _startDate = now + 60;

    futarchyOracle = futarchyOracleFactory.createFutarchyOracle(
      token,
      _centralizedOracle,
      2,
      _lowerBound,
      _upperBound,
      lmsrMarketMaker,
      0,
      tradingPeriod,
      _startDate
    );

    require(token.transferFrom(msg.sender, this, stakeAmount));
    require(token.approve(futarchyOracle, stakeAmount));
    futarchyOracle.fund(stakeAmount);
    isStarted = true;
  }

  /// @dev ended  returns whether Challenge has ended
  function ended() public view returns (bool) {
    return futarchyOracle.isOutcomeSet();
  }

  /// @dev passed  returns whether Challenge has passed
  function passed() public view returns (bool) {
    require(ended());

    // marketIndex 1 == deniedScalar
    // if proposal is denied, the challenge has passed.
    return futarchyOracle.getOutcome() == 1;
  }

  /// @dev TODO: This is currently hardcoded and TBD
  function tokenLockAmount() public view returns (uint) {
    return 1;
  }
}
