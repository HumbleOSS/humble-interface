// reducers.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import db from "../db";
import { RootState } from "./store";
import { CONTRACT, abi, arc200, swap } from "ulujs";
import { getAlgorandClients } from "../wallets";
import { PoolI } from "../types";
import { BAD_POOLS, CTCINFO_TRI } from "../constants/dex";
import axios from "axios";

interface Pool {
  txId: string;
  poolId: number;
  tokA: number;
  tokB: number;
  round: number;
  ts: number;
}

export interface PoolState {
  pools: Pool[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

export const fetchPool = async (poolId: number) => {
  const { algodClient, indexerClient } = getAlgorandClients();
  const InfoR = await new swap(poolId, algodClient, indexerClient)
    .Info()
  if(InfoR.success) {
    return InfoR.returnValue;
  }
}

export const getPool = async (poolId: number) => {
  try {
    const poolTable = db.table("pools");
    const pool = await poolTable.get(poolId);
    if (pool) {
      return pool;
    }
    const poolFetchResponse = await fetchPool(poolId);
    if(poolFetchResponse) {
      const newPool = {
        poolId,
        round: 0,
        tokA: poolFetchResponse.tokA,
        tokB: poolFetchResponse.tokB,
      }
      await db.table("pools").put(newPool);
      return newPool;
    }
  } catch (error) {
    throw error;
  }
}

export const getPools = createAsyncThunk<
  Pool[],
  void,
  { rejectValue: string; state: RootState }
>("pools/getPools", async (_, { getState, rejectWithValue }) => {
  try {
    const poolsTable = db.table("pools");
    const pools = await poolsTable.toArray();
    const lastRound = pools.reduce((acc, val) => Math.max(acc, val.round), 0);
    if (pools.length === 0) {
      const { data } = await axios.get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools`,
        {
          params: {
            ["mint-min-round"]: lastRound,
          },
        }
      );
      const appPools = data.pools
        .filter((p: any) => {
          return p.providerId === "01";
        })
        .map((p: any) => ({
          poolId: p.contractId,
          tokA: Number(p.tokAId),
          tokB: Number(p.tokBId),
          round: p.mintRound,
        }));
      await db.table("pools").bulkPut(appPools);
      return appPools;
    }
    const minRound = 0;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new CONTRACT(
      CTCINFO_TRI,
      algodClient,
      indexerClient,
      {
        name: "",
        desc: "",
        methods: [],
        events: [
          { name: "Register", args: [{ type: "(uint64,uint64,uint64)" }] },
        ],
      },
      {
        addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
        sk: new Uint8Array(0),
      }
    );
    const makeCi = (ctcInfo: number) =>
      new arc200(ctcInfo, algodClient, indexerClient, {
        acc: {
          addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
          sk: new Uint8Array(0),
        },
        formatBytes: true,
      });

    const events = await ci.Register({
      minRound: lastRound,
    });
    const newPools = events
      .filter((event: any) => event[1] > lastRound)
      .map((event: any) => {
        return {
          //txId: event[0],
          round: event[1],
          //ts: event[2],
          poolId: Number(event[3][0]),
          tokA: Number(event[3][1]),
          tokB: Number(event[3][2]),
        };
      });
    if (pools.length > 0) {
      newPools.push(...pools);
    }
    for (const pool of newPools.filter(
      (pool: PoolI) => pool?.round || 0 >= minRound
    )) {
      await db.table("pools").bulkPut(
        newPools.map((pool: Pool) => {
          return {
            //txId: pool.txId,
            round: pool.round,
            //ts: pool.ts,
            poolId: pool.poolId,
            tokA: pool.tokA,
            tokB: pool.tokB,
          };
        })
      );
    }
    const wl: number[] = [];
    const combinedPools = [...pools, ...newPools].filter(
      (pool) =>
        pool.round >= minRound &&
        (wl.length > 0 || !wl.includes(pool.poolId)) &&
        !BAD_POOLS.includes(pool.poolId)
    );
    return combinedPools;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const initialState: PoolState = {
  pools: [],
  status: "idle",
  error: null,
};

const poolSlice = createSlice({
  name: "pools",
  initialState,
  reducers: {
    updatePool(state, action) {
      const { poolId, newData } = action.payload;
      const poolToUpdate = state.pools.find((pool) => pool.poolId === poolId);
      if (poolToUpdate) {
        Object.assign(poolToUpdate, newData);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPools.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getPools.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.pools = [...action.payload];
      })
      .addCase(getPools.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { updatePool } = poolSlice.actions;
export default poolSlice.reducer;
