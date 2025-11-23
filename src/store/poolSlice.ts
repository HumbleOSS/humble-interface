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
  const InfoR = await new swap(poolId, algodClient, indexerClient).Info();
  if (InfoR.success) {
    return InfoR.returnValue;
  }
};

export const getPool = async (poolId: number) => {
  try {
    const poolTable = db.table("pools");
    const pool = await poolTable.get(poolId);
    if (pool) {
      return pool;
    }
    const poolFetchResponse = await fetchPool(poolId);
    if (poolFetchResponse) {
      const newPool = {
        poolId,
        round: 0,
        tokA: poolFetchResponse.tokA,
        tokB: poolFetchResponse.tokB,
      };
      await db.table("pools").put(newPool);
      return newPool;
    }
  } catch (error) {
    throw error;
  }
};

export const getPools = createAsyncThunk<
  Pool[],
  void,
  { rejectValue: string; state: RootState }
>("pools/getPools", async (_, { getState, rejectWithValue }) => {
  try {
    const poolsTable = db.table("pools");
    const pools = await poolsTable.toArray();
    const lastRound = pools.reduce((acc, val) => Math.max(acc, val.round), 0);
    //if (pools.length === 0) {
    const { data } = await axios.get(
      `https://humble-api.voi.nautilus.sh/pools`
    );
    console.log("data", data);
    // New API structure: poolId, tokA, tokB, lastRound, txid
    const appPools = data.pools.map((p: any) => ({
      poolId: Number(p.poolId),
      tokA: Number(p.tokA),
      tokB: Number(p.tokB),
      round: p.lastRound || 0,
      txId: p.txid || "",
    }));
    await db.table("pools").bulkPut(appPools);
    return appPools;
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
