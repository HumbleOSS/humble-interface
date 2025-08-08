/* Token */

export interface TokenI {
  owner: string;
  approved: string;
  contractId: number;
  tokenId: number;
  metadataURI: string;
}

export interface CollectionTokenI extends TokenI {
  metadata: string;
}

export interface NFTIndexerToken extends CollectionTokenI {
  ["mint-round"]: number;
}

export interface NFTIndexerTokenResponse {
  currentRound: number;
  tokens: NFTIndexerToken[];
  ["next-token"]: string;
}

export interface Properties {
  [key: string]: string;
}

export interface NFTMetadata {
  description: string;
  image: string;
  image_integrity: string;
  image_mimetype: string;
  name: string;
  properties: Properties;
  royalties: string;
}

export interface Token extends TokenI {
  pk: string;
  metadata: NFTMetadata;
  royalties: any;
}

export interface ARC200TokenI {
  tokenId: number;
  contractId?: number;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: BigInt | string;
  mintRound?: number;
  price?: number;
  change_24?: {
    latest_price?: number;
  };
  ticker?: TickerI;
}

export interface ARC200LPTokenI extends ARC200TokenI {}

/* Ticker */

export interface TickerI {
  ticker_id: string;
  base_currency: string;
  base_currency_id: string;
  target_currency: string;
  target_currency_id: string;
  pool_id: string;
  last_price: string;
  base_volume: string;
  target_volume: string;
  liquidity_in_usd: string;
  update_datetime: string;
  high: string;
  low: string;
}

export interface TickerResponse {
  tickers: TickerI[];
}

/* Collection */

export interface CollectionI {
  contractId: number;
  totalSupply: number;
  isBlacklisted: number;
  mintRound: number;
}

export interface NFTIndexerCollectionI extends CollectionI {
  firstToken: CollectionTokenI | null;
}

export interface NFTIndexerCollectionResponse {
  collections: NFTIndexerCollectionI[];
  ["next-token"]: string;
}

/* Listing */

export interface ListingI {
  transactionId: string;
  mpContractId: number;
  mpListingId: number;
  tokenId: number;
  seller: string;
  price: number;
  normalPrice?: number;
  currency: number;
  createRound: number;
  createTimestamp: number;
  endTimestamp: number | null;
  royalty: number | null;
  collectionId: number;
}

export interface ListedToken extends Token {
  listing: ListingI;
}

/* Sale */

export interface SaleI {
  transactionId: string;
  mpContractId: number;
  mpListingId: number;
  tokenId: number;
  seller: string;
  buyer: string;
  currency: number;
  price: number;
  round: number;
  timestamp: number;
  collectionId: number;
}

export interface NFTIndexerSaleI extends SaleI {
  listing: ListingI;
}

export interface NFTIndexerSaleResponse {
  ["current-round"]: number;
  sales: NFTIndexerSaleI[];
  ["next-token"]: string;
}

export interface Sale extends SaleI {
  pk: string;
  token: Token;
  collection: CollectionI;
}

/* Ranking */

export interface RankingI {
  collectionId: number;
  image: string;
  floorPrice: number;
  volume: number;
  name: string;
  score: string;
  rank: number;
  scoreUnit: string;
  owners: number;
  items: number;
  sales: number;
}

/* Pool */

export interface PoolI {
  txId: string;
  round?: number;
  ts?: number;
  poolId: number;
  tokA: number;
  tokB: number;
}

/* Position */

export interface PositionI extends PoolI {
  balance: BigInt;
}

export interface IndexerPoolI {
  contractId: number;
  poolBalA: string;
  poolBalB: string;
  poolId: string;
  providerId: string;
  symbolA: string;
  symbolB: string;
  tokAId: string;
  tokBId: string;
  tvl: number;
  tvlA: string;
  tvlB: string;
  volA: string;
  volB: string;
  apr: string;
  supply: string;
  value: number;
  formattedValue: string;
  vol: number; // derived
}

/* Farm */

export interface FarmI {
  txId: string;
  round: number;
  ts: number;
  poolId: number;
  who: string;
  stakeToken: number;
  rewardsToken: number[];
  rewards: string[];
  start: number;
  end: number;
}

/* Stake */

export interface StakeI {
  txId: string;
  round: number;
  ts: number;
  poolId: number;
  who: string;
  stakeAmount: string;
  staked: string;
  totalStaked: string;
}

/* Indexer Types */

export interface BalanceI {
  accountId: string;
  balance: string;
  contractId: number;
}
