// db.ts
import Dexie from "dexie";

const dexDb = new Dexie("dexDatabase");

// Define the initial schema
dexDb.version(1).stores({
  tokens: "tokenId, name, symbol, decimals, totalSupply",
  pools: "txId, round, ts, poolId, tokA, tokB",
  farms:
    "txId, round, ts, poolId, who, stakeToken, rewardsToken, rewards, start, end",
  stake: "txId, round, ts, poolId, who, amount, staked, totalStaked",
});

// Define the updated schema
dexDb.version(2).stores({
  poolBals: "pk, round, ts, poolId, balA, balB, rate",
  volumes: "pk, round, ts, poolId, inA, inB",
});

// Define the new version with poolId as the primary key in pools table
dexDb
  .version(3)
  .stores({
    tokens: "tokenId, name, symbol, decimals, totalSupply, mintRound",
    pools: "poolId, tokA, tokB", // poolId as primary key
    farms:
      "txId, round, ts, poolId, who, stakeToken, rewardsToken, rewards, start, end",
    stake: "txId, round, ts, poolId, who, amount, staked, totalStaked",
    poolBals: "pk, round, ts, poolId, balA, balB, rate",
    volumes: "pk, round, ts, poolId, inA, inB",
  })
  .upgrade((tx) => {
    // Upgrade logic for pools table: remove txId
    tx.table("pools")
      .toCollection()
      .modify((pool) => {
        delete pool.txId;
        delete pool.round;
        delete pool.ts;
      });
    // Upgrade logic for tokens table: add mintRound with default value
    tx.table("tokens")
      .toCollection()
      .modify((token) => {
        token.mintRound = 0; // default value for mintRound
      });
  });

// Define version 4 with contractId as primary key in tokens table
dexDb
  .version(4)
  .stores({
    tokens: "contractId, tokenId, name, symbol, decimals, totalSupply, mintRound, assetType",
    pools: "poolId, tokA, tokB",
    farms:
      "txId, round, ts, poolId, who, stakeToken, rewardsToken, rewards, start, end",
    stake: "txId, round, ts, poolId, who, amount, staked, totalStaked",
    poolBals: "pk, round, ts, poolId, balA, balB, rate",
    volumes: "pk, round, ts, poolId, inA, inB",
  })
  .upgrade((tx) => {
    // Upgrade logic: migrate tokens to use contractId as primary key
    // For tokens without contractId, use tokenId as contractId
    return tx.table("tokens")
      .toCollection()
      .modify((token) => {
        if (!token.contractId) {
          token.contractId = token.tokenId;
        }
      });
  });

export default dexDb;
