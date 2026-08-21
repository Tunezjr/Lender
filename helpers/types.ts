import BigNumber from "bignumber.js";

export interface SymbolMap<T> {
  [symbol: string]: T;
}

export type eNetwork = eEthereumNetwork;

export enum eEthereumNetwork {
  coverage = "coverage",
  hardhat = "hardhat",
  localhost = "localhost",
  goerli = "goerli",
  rinkeby = "rinkeby",
  sepolia = "sepolia",
  main = "main",
  /** Monad mainnet — fully EVM compatible */
  monad = "monad",
}

export enum BendPools {
  proto = "proto",
}

export enum eContractid {
  MintableERC20 = "MintableERC20",
  MintableERC721 = "MintableERC721",
  LendPoolAddressesProvider = "LendPoolAddressesProvider",
  LendPoolAddressesProviderRegistry = "LendPoolAddressesProviderRegistry",
  LendPoolParametersProvider = "LendPoolParametersProvider",
  LendPoolConfigurator = "LendPoolConfigurator",
  ValidationLogic = "ValidationLogic",
  ReserveLogic = "ReserveLogic",
  NftLogic = "NftLogic",
  GenericLogic = "GenericLogic",
  SupplyLogic = "SupplyLogic",
  BorrowLogic = "BorrowLogic",
  LiquidateLogic = "LiquidateLogic",
  ConfiguratorLogic = "ConfiguratorLogic",
  LendPool = "LendPool",
  LendPoolLoan = "LendPoolLoan",
  ReserveOracle = "ReserveOracle",
  ReserveOracleImpl = "ReserveOracleImpl",
  NFTOracle = "NFTOracle",
  NFTOracleImpl = "NFTOracleImpl",
  TokenOracle = "TokenOracle",
  TokenOracleImpl = "TokenOracleImpl",
  Proxy = "Proxy",
  MockChainlinkOracle = "MockChainlinkOracle",
  MockNFTOracle = "MockNFTOracle",
  MockReserveOracle = "MockReserveOracle",
  ChainlinkAggregatorHelper = "ChainlinkAggregatorHelper",
  ChainlinkAggregatorHelperImpl = "ChainlinkAggregatorHelperImpl",
  InterestRate = "InterestRate",
  BendUpgradeableProxy = "BendUpgradeableProxy",
  BendProxyAdminTest = "BendProxyAdminTest",
  BendProxyAdminPool = "BendProxyAdminPool",
  BendProxyAdminFund = "BendProxyAdminFund",
  BendProxyAdminWTL = "BendProxyAdminWTL",
  BendV2ProxyAdmin = "BendV2ProxyAdmin",
  WalletBalanceProvider = "WalletBalanceProvider",
  BToken = "BToken",
  DebtToken = "DebtToken",
  BNFT = "BNFT",
  MockBNFT = "MockBNFT",
  BendProtocolDataProvider = "BendProtocolDataProvider",
  IERC20Detailed = "IERC20Detailed",
  IERC721Detailed = "IERC721Detailed",
  FeeProvider = "FeeProvider",
  WETHGateway = "WETHGateway",
  WETHGatewayImpl = "WETHGatewayImpl",
  WETH = "WETH",
  WETHMocked = "WETHMocked",
  WPUNKSGateway = "WPUNKSGateway",
  WPUNKS = "WPUNKS",
  WPUNKSMocked = "WPUNKSMocked",
  SelfdestructTransferMock = "SelfdestructTransferMock",
  LendPoolImpl = "LendPoolImpl",
  LendPoolConfiguratorImpl = "LendPoolConfiguratorImpl",
  LendPoolLoanImpl = "LendPoolLoanImpl",
  BNFTRegistry = "BNFTRegistry",
  BNFTRegistryImpl = "BNFTRegistryImpl",
  CryptoPunksMarket = "CryptoPunksMarket",
  WrappedPunk = "WrappedPunk",
  PunkGateway = "PunkGateway",
  PunkGatewayImpl = "PunkGatewayImpl",
  MockIncentivesController = "MockIncentivesController",
  UIPoolDataProvider = "UIPoolDataProvider",
  BendCollector = "BendCollector",
  BendCollectorImpl = "BendCollectorImpl",
  TimelockControllerFast = "TimelockControllerFast",
  TimelockControllerSlow = "TimelockControllerSlow",
  MockLoanRepaidInterceptor = "MockLoanRepaidInterceptor",
  KodaGateway = "KodaGateway",
  KodaGatewayImpl = "KodaGatewayImpl",
  UniswapV3DebtSwapAdapter = "UniswapV3DebtSwapAdapter",
  UniswapV3DebtSwapAdapterImpl = "UniswapV3DebtSwapAdapterImpl",
  WstETHPriceAggregator = "WstETHPriceAggregator",
}

export enum ProtocolLoanState {
  None,
  Created,
  Active,
  Auction,
  Repaid,
  Defaulted,
}

export enum ProtocolErrors {
  CALLER_NOT_POOL_ADMIN = "100",
  CALLER_NOT_ADDRESS_PROVIDER = "101",
  INVALID_FROM_BALANCE_AFTER_TRANSFER = "102",
  INVALID_TO_BALANCE_AFTER_TRANSFER = "103",
  CALLER_NOT_ONBEHALFOF_OR_IN_WHITELIST = "104",
  CALLER_NOT_RISK_ADMIN = "105",
  CALLER_NOT_RISK_OR_POOL_ADMIN = "106",
  MATH_MULTIPLICATION_OVERFLOW = "200",
  MATH_ADDITION_OVERFLOW = "201",
  MATH_DIVISION_BY_ZERO = "202",
  VL_INVALID_AMOUNT = "301",
  VL_NO_ACTIVE_RESERVE = "302",
  VL_RESERVE_FROZEN = "303",
  VL_NOT_ENOUGH_AVAILABLE_USER_BALANCE = "304",
  VL_BORROWING_NOT_ENABLED = "305",
  VL_COLLATERAL_BALANCE_IS_0 = "306",
  VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD = "307",
  VL_COLLATERAL_CANNOT_COVER_NEW_BORROW = "308",
  VL_NO_DEBT_OF_SELECTED_TYPE = "309",
  VL_NO_ACTIVE_NFT = "310",
  VL_NFT_FROZEN = "311",
  VL_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER = "312",
  VL_INVALID_HEALTH_FACTOR = "313",
  VL_INVALID_ONBEHALFOF_ADDRESS = "314",
  VL_INVALID_TARGET_ADDRESS = "315",
  VL_INVALID_RESERVE_ADDRESS = "316",
  VL_SPECIFIED_LOAN_NOT_BORROWED_BY_USER = "317",
  VL_SPECIFIED_RESERVE_NOT_BORROWED_BY_USER = "318",
  VL_PRICE_STALE = "320",
  LP_CALLER_NOT_LEND_POOL_CONFIGURATOR = "400",
  LP_IS_PAUSED = "401",
  LP_NO_MORE_RESERVES_ALLOWED = "402",
  LP_NOT_CONTRACT = "403",
  LP_BORROW_NOT_EXCEED_LIQUIDATION_THRESHOLD = "404",
  LP_BORROW_IS_EXCEED_LIQUIDATION_PRICE = "405",
  LP_NO_MORE_NFTS_ALLOWED = "406",
  LP_INVALIED_USER_NFT_AMOUNT = "407",
  LP_INCONSISTENT_PARAMS = "408",
  LP_NFT_IS_NOT_USED_AS_COLLATERAL = "409",
  LP_CALLER_MUST_BE_AN_BTOKEN = "410",
  LP_INVALIED_NFT_AMOUNT = "411",
  LP_NFT_HAS_USED_AS_COLLATERAL = "412",
  LP_DELEGATE_CALL_FAILED = "413",
  LP_AMOUNT_LESS_THAN_EXTRA_DEBT = "414",
  LP_AMOUNT_LESS_THAN_REDEEM_THRESHOLD = "415",
  LP_AMOUNT_GREATER_THAN_MAX_REPAY = "416",
  LP_NFT_TOKEN_ID_EXCEED_MAX_LIMIT = "417",
  LP_NFT_SUPPLY_NUM_EXCEED_MAX_LIMIT = "418",
  LP_CALLER_NOT_VALID_INTERCEPTOR = "419",
  LP_CALLER_NOT_VALID_LOCKER = "420",
  LPL_INVALID_LOAN_STATE = "480",
  LPL_INVALID_LOAN_AMOUNT = "481",
  LPL_INVALID_TAKEN_AMOUNT = "482",
  LPL_AMOUNT_OVERFLOW = "483",
  LPL_BID_PRICE_LESS_THAN_LIQUIDATION_PRICE = "484",
  LPL_BID_PRICE_LESS_THAN_HIGHEST_PRICE = "485",
  LPL_BID_REDEEM_DURATION_HAS_END = "486",
  LPL_BID_USER_NOT_SAME = "487",
  LPL_BID_REPAY_AMOUNT_NOT_ENOUGH = "488",
  LPL_BID_AUCTION_DURATION_HAS_END = "489",
  LPL_BID_AUCTION_DURATION_NOT_END = "490",
  LPL_BID_PRICE_LESS_THAN_BORROW = "491",
  LPL_INVALID_BIDDER_ADDRESS = "492",
  LPL_AMOUNT_LESS_THAN_BID_FINE = "493",
  LPL_BID_INVALID_BID_FINE = "494",
  CT_CALLER_MUST_BE_LEND_POOL = "500",
  CT_INVALID_MINT_AMOUNT = "501",
  CT_INVALID_BURN_AMOUNT = "502",
  CT_BORROW_ALLOWANCE_NOT_ENOUGH = "503",
  RL_RESERVE_ALREADY_INITIALIZED = "601",
  RL_LIQUIDITY_INDEX_OVERFLOW = "602",
  RL_VARIABLE_BORROW_INDEX_OVERFLOW = "603",
  RL_LIQUIDITY_RATE_OVERFLOW = "604",
  RL_VARIABLE_BORROW_RATE_OVERFLOW = "605",
  LPC_RESERVE_LIQUIDITY_NOT_0 = "700",
  LPC_INVALID_CONFIGURATION = "701",
  LPC_CALLER_NOT_EMERGENCY_ADMIN = "702",
  LPC_INVALIED_BNFT_ADDRESS = "703",
  LPC_INVALIED_LOAN_ADDRESS = "704",
  LPC_NFT_LIQUIDITY_NOT_0 = "705",
  RC_INVALID_LTV = "730",
  RC_INVALID_LIQ_THRESHOLD = "731",
  RC_INVALID_LIQ_BONUS = "732",
  RC_INVALID_DECIMALS = "733",
  RC_INVALID_RESERVE_FACTOR = "734",
  RC_INVALID_REDEEM_DURATION = "735",
  RC_INVALID_AUCTION_DURATION = "736",
  RC_INVALID_REDEEM_FINE = "737",
  LPAPR_PROVIDER_NOT_REGISTERED = "760",
  LPAPR_INVALID_ADDRESSES_PROVIDER_ID = "761",
  INVALID_OWNER_REVERT_MSG = "Ownable: caller is not the owner",
  TRANSFER_AMOUNT_EXCEEDS_BALANCE = "ERC20: transfer amount exceeds balance",
  SAFEERC20_LOWLEVEL_CALL = "SafeERC20: low-level call failed",
}

export type tEthereumAddress = string;
export type tStringTokenBigUnits = string;
export type tBigNumberTokenBigUnits = BigNumber;
export type tStringTokenSmallUnits = string;
export type tBigNumberTokenSmallUnits = BigNumber;

export interface iAssetCommon<T> {
  [key: string]: T;
}
export interface iAssetBase<T> {
  WETH: T;
  DAI: T;
  USDC: T;
  USDT: T;
}

export type iAssetsWithoutETH<T> = Omit<iAssetBase<T>, "ETH">;
export type iAssetsWithoutUSD<T> = Omit<iAssetBase<T>, "USD">;
export type iBendPoolAssets<T> = Pick<iAssetsWithoutUSD<T>, "WETH" | "DAI" | "USDC" | "USDT">;
export type iMultiPoolsAssets<T> = iAssetCommon<T> | iBendPoolAssets<T>;
export type iBendPoolTokens<T> = Omit<iBendPoolAssets<T>, "ETH">;
export type iAssetAggregatorBase<T> = iAssetsWithoutETH<T>;

export enum TokenContractId {
  WETH = "WETH",
  DAI = "DAI",
  USDC = "USDC",
  USDT = "USDT",
}

export interface iNftCommon<T> {
  [key: string]: T;
}
export interface iNftBase<T> {
  WPUNKS: T;
  BAYC: T;
  DOODLE: T;
  SDOODLE: T;
  MAYC: T;
  CLONEX: T;
  AZUKI: T;
  WKODA: T;
}

export type iMultiPoolsNfts<T> = iNftCommon<T> | iBendPoolNfts<T>;
export type iBendPoolNfts<T> = iNftBase<T>;
export type iNftAggregatorBase<T> = iNftBase<T>;

export enum NftContractId {
  WPUNKS = "WPUNKS",
  BAYC = "BAYC",
  DOODLE = "DOODLE",
  SDOODLE = "SDOODLE",
  MAYC = "MAYC",
  CLONEX = "CLONEX",
  AZUKI = "AZUKI",
  WKODA = "WKODA",
}

export interface IReserveParams extends IReserveBorrowParams, IReserveCollateralParams {
  bTokenImpl: eContractid;
  reserveFactor: string;
  strategy: IInterestRateStrategyParams;
}

export interface INftParams extends INftAuctionParams, INftCollateralParams {
  bNftImpl: eContractid;
  maxSupply: string;
  maxTokenId: string;
}

export interface IInterestRateStrategyParams {
  name: string;
  optimalUtilizationRate: string;
  baseVariableBorrowRate: string;
  variableRateSlope1: string;
  variableRateSlope2: string;
}

export interface IReserveBorrowParams {
  borrowingEnabled: boolean;
  reserveDecimals: string;
}

export interface IReserveCollateralParams {
  baseLTVAsCollateral: string;
  liquidationThreshold: string;
  liquidationBonus: string;
}

export interface INftCollateralParams {
  baseLTVAsCollateral: string;
  liquidationThreshold: string;
  liquidationBonus: string;
}

export interface INftAuctionParams {
  redeemDuration: string;
  auctionDuration: string;
  redeemFine: string;
  redeemThreshold: string;
  minBidFine: string;
}

export type iParamsPerNetwork<T> = iEthereumParamsPerNetwork<T>;

export interface iParamsPerNetworkAll<T> extends iEthereumParamsPerNetwork<T> {}

export interface iEthereumParamsPerNetwork<T> {
  [eEthereumNetwork.coverage]: T;
  [eEthereumNetwork.hardhat]: T;
  [eEthereumNetwork.localhost]: T;
  [eEthereumNetwork.goerli]: T;
  [eEthereumNetwork.rinkeby]: T;
  [eEthereumNetwork.sepolia]: T;
  [eEthereumNetwork.main]: T;
  [eEthereumNetwork.monad]: T;
}

export interface iParamsPerPool<T> {
  [BendPools.proto]: T;
}

export interface iBasicDistributionParams {
  receivers: string[];
  percentages: string[];
}

export interface ObjectString {
  [key: string]: string;
}

export interface IProtocolGlobalConfig {
  MockUsdPrice: string;
  UsdAddress: tEthereumAddress;
  NilAddress: tEthereumAddress;
  OneAddress: tEthereumAddress;
}

export interface IMocksConfig {
  BNftNamePrefix: string;
  BNftSymbolPrefix: string;
  AllAssetsInitialPrices: iAssetBase<string>;
  AllNftsInitialPrices: iNftBase<string>;
}

export interface ICommonConfiguration {
  MarketId: string;
  BTokenNamePrefix: string;
  BTokenSymbolPrefix: string;
  DebtTokenNamePrefix: string;
  DebtTokenSymbolPrefix: string;
  ProviderId: number;
  ProtocolGlobalParams: IProtocolGlobalConfig;
  Mocks: IMocksConfig;
  ProxyAdminPool: iParamsPerNetwork<tEthereumAddress | undefined>;
  ProxyAdminFund: iParamsPerNetwork<tEthereumAddress | undefined>;
  ProxyAdminWTL: iParamsPerNetwork<tEthereumAddress | undefined>;
  BNFTRegistry: iParamsPerNetwork<tEthereumAddress | undefined>;
  ProviderRegistry: iParamsPerNetwork<tEthereumAddress | undefined>;
  ProviderRegistryOwner: iParamsPerNetwork<tEthereumAddress | undefined>;
  ReserveOracle: iParamsPerNetwork<tEthereumAddress | undefined>;
  NFTOracle: iParamsPerNetwork<tEthereumAddress | undefined>;
  PoolAdmin: iParamsPerNetwork<tEthereumAddress | undefined>;
  PoolAdminIndex: number;
  EmergencyAdmin: iParamsPerNetwork<tEthereumAddress | undefined>;
  EmergencyAdminIndex: number;
  ReserveAggregators: iParamsPerNetwork<ITokenAddress>;
  ReserveAssets: iParamsPerNetwork<SymbolMap<tEthereumAddress>>;
  ReservesConfig: iMultiPoolsAssets<IReserveParams>;
  NftsAssets: iParamsPerNetwork<SymbolMap<tEthereumAddress>>;
  NftsConfig: iMultiPoolsNfts<INftParams>;
  WrappedNativeToken: iParamsPerNetwork<tEthereumAddress>;
  CryptoPunksMarket: iParamsPerNetwork<tEthereumAddress>;
  WrappedPunkToken: iParamsPerNetwork<tEthereumAddress>;
  ReserveFactorCollectorAddress: iParamsPerNetwork<tEthereumAddress>;
  IncentivesController: iParamsPerNetwork<tEthereumAddress>;
  DebtTokenImplementation?: iParamsPerNetwork<tEthereumAddress>;
  OracleQuoteCurrency: string;
  OracleQuoteUnit: string;
}

export interface IBendConfiguration extends ICommonConfiguration {
  ReservesConfig: iBendPoolAssets<IReserveParams>;
  NftsConfig: iBendPoolNfts<INftParams>;
}

export interface ITokenAddress {
  [token: string]: tEthereumAddress;
}

export type PoolConfiguration = ICommonConfiguration | IBendConfiguration;
