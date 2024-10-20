// reducers.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import db from "../db";
import { RootState } from "./store";
import { ARC200TokenI } from "../types";
import { arc200 } from "ulujs";
import { getAlgorandClients } from "../wallets";
import axios from "axios";
import { prepareString } from "../utils/string";

export interface TokensState {
  tokens: ARC200TokenI[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

export const fetchToken = async (tokenId: number) => {
  const { algodClient, indexerClient } = getAlgorandClients();
  const makeCi = (ctcInfo: number) =>
    new arc200(ctcInfo, algodClient, indexerClient, {
      acc: {
        addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
        sk: new Uint8Array(0),
      },
      formatBytes: true,
    });
  const ci = makeCi(Number(tokenId));
  const arc200_nameR = await ci.arc200_name();
  const arc200_symbolR = await ci.arc200_symbol();
  const arc200_decimalsR = await ci.arc200_decimals();
  const arc200_totalSupplyR = await ci.arc200_totalSupply();
  if (
    arc200_nameR.success &&
    arc200_symbolR.success &&
    arc200_decimalsR.success &&
    arc200_totalSupplyR.success
  ) {
    const token = {
      tokenId,
      name: arc200_nameR.returnValue,
      symbol: arc200_symbolR.returnValue,
      decimals: Number(arc200_decimalsR.returnValue),
      totalSupply: arc200_totalSupplyR.returnValue,
    };
    return token;
  }
};

export const getToken = async (tokenId: number) => {
  // const { algodClient, indexerClient } = getAlgorandClients();
  // const makeCi = (ctcInfo: number) =>
  //   new arc200(ctcInfo, algodClient, indexerClient, {
  //     acc: {
  //       addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
  //       sk: new Uint8Array(0),
  //     },
  //     formatBytes: true,
  //   });
  try {
    const tokenTable = db.table("tokens");
    const token = await tokenTable.get({ tokenId });
    if (!token) {
      const newToken = await fetchToken(tokenId);
      if (newToken) {
        db.table("tokens").put(newToken);
        return newToken;
      }
    }
    return token;
  } catch (error: any) {
    return error.message;
  }
};

export const getTokens = createAsyncThunk<
  ARC200TokenI[],
  void,
  { rejectValue: string; state: RootState }
>("tokens/getTokens", async (_, { getState, rejectWithValue }) => {
  try {
    const tokenTable = db.table("tokens");
    const storedTokens = await tokenTable.toArray();
    const mintMintRound =
      storedTokens.length === 0 ? 0 : storedTokens.slice(-1)[0].mintRound;
    const { data } = await axios.get(
      `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens`,
      {
        params: {
          ["mint-min-round"]: mintMintRound,
        },
      }
    );
    const appTokens = data.tokens.map((t: any) => ({
      name: t.name,
      symbol: t.symbol,
      decimals: t.decimals,
      tokenId: t.contractId,
      totalSupply: t.totalSupply,
      mintRound: t.mintRound,
    }));
    const filteredTokens = appTokens.filter(
      (t: any) => !["ARC200LT", "LPT"].includes(t.symbol)
    );
    db.table("tokens").bulkPut(filteredTokens);
    const tokens = await tokenTable.toArray();
    return [
      ...tokens.filter((t: any) => {
        return ![24590664].includes(t.tokenId);
      }),
    ];
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const initialState: TokensState = {
  tokens: [],
  status: "idle",
  error: null,
};

const tokenSlice = createSlice({
  name: "tokens",
  initialState,
  reducers: {
    updateToken(state, action) {
      const { tokenId, newData } = action.payload;
      const tokenToUpdate = state.tokens.find(
        (token) => token.tokenId === tokenId
      );
      if (tokenToUpdate) {
        Object.assign(tokenToUpdate, newData);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getTokens.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getTokens.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.tokens = [...action.payload];
      })
      .addCase(getTokens.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { updateToken } = tokenSlice.actions;
export default tokenSlice.reducer;
