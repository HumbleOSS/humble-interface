// reducers.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import db from "../db";
import { RootState } from "./store";
import { ARC200TokenI, TickerI } from "../types";
import { arc200 } from "ulujs";
import { getAlgorandClients } from "../wallets";
import axios from "axios";
import { prepareString } from "../utils/string";
import { NETWORK_TOKEN } from "../constants/tokens";

export interface TokensState {
  tokens: ARC200TokenI[];
  tickers: TickerI[];
  status: "idle" | "loading" | "succeeded" | "failed";
  tickerStatus: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  tickerError: string | null;
  lastRefresh: number | null;
  lastTickerRefresh: number | null;
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
    //const tokenTable = db.table("tokens");
    //const storedTokens = await tokenTable.toArray();
    //const mintMintRound =
    //  storedTokens.length === 0 ? 0 : storedTokens.slice(-1)[0].mintRound;
    const { data } = await axios.get(
      `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=all`
    );

    const appTokens = data.tokens.map((t: any) => ({
      ...t,
      name: t.name,
      symbol: t.symbol,
      decimals: t.decimals,
      tokenId: t.contractId,
      totalSupply: t.totalSupply,
      mintRound: t.mintRound,
    }));

    const filteredTokens: ARC200TokenI[] = appTokens.filter(
      (t: any) => !["ARC200LT", "LPT", "TEST"].includes(t.symbol)
    );

    // Ensure VOI (network token, tokenId: 0) is present in the list
    const hasVoi = filteredTokens.some((t) => t.tokenId === 0);
    if (!hasVoi) {
      filteredTokens.unshift({ ...NETWORK_TOKEN.VOI });
    }

    //db.table("tokens").bulkPut(filteredTokens);
    //const tokens = await tokenTable.toArray();
    return filteredTokens;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

export const getTickers = createAsyncThunk<
  TickerI[],
  void,
  { rejectValue: string; state: RootState }
>("tokens/getTickers", async (_, { getState, rejectWithValue }) => {
  try {
    const { data } = await axios.get(
      "https://api.humble.sh/integrations/coingecko/tickers"
    );
    return data;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

export const getTokensWithTickers = createAsyncThunk<
  { tokens: ARC200TokenI[]; tickers: TickerI[] },
  void,
  { rejectValue: string; state: RootState }
>("tokens/getTokensWithTickers", async (_, { getState, rejectWithValue, dispatch }) => {
  try {
    // Fetch both tokens and tickers in parallel
    const [tokensResult, tickersResult] = await Promise.allSettled([
      dispatch(getTokens()).unwrap(),
      dispatch(getTickers()).unwrap()
    ]);

    const tokens = tokensResult.status === 'fulfilled' ? tokensResult.value : [];
    const tickers = tickersResult.status === 'fulfilled' ? tickersResult.value : [];

    // Match tickers to tokens
    const tokensWithTickers = tokens.map(token => {
      const tokenIdStr = token.tokenId.toString();
      
      // For VOI (tokenId: 0), aggregate liquidity from all trading pairs
      if (token.tokenId === 0) {
        const voiTickers = tickers.filter(t => 
          t.target_currency_id === "0" || t.base_currency_id === "0"
        );
        
        if (voiTickers.length > 0) {
          // Sum up liquidity from all VOI pairs
          const totalLiquidity = voiTickers.reduce((sum, ticker) => {
            const liquidity = parseFloat(ticker.liquidity_in_usd || "0");
            return sum + (isNaN(liquidity) ? 0 : liquidity);
          }, 0);
          
          // Use the first ticker as base and update liquidity
          const aggregatedTicker = {
            ...voiTickers[0],
            liquidity_in_usd: totalLiquidity.toString()
          };
          
          return {
            ...token,
            ticker: aggregatedTicker
          };
        }
      }
      
      // For other tokens, use original logic
      const ticker = tickers.find(t => 
        t.base_currency_id === tokenIdStr ||
        t.target_currency_id === tokenIdStr
      );
      
      return {
        ...token,
        ticker
      };
    });

    return { tokens: tokensWithTickers, tickers };
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const initialState: TokensState = {
  tokens: [],
  tickers: [],
  status: "idle",
  tickerStatus: "idle",
  error: null,
  tickerError: null,
  lastRefresh: null,
  lastTickerRefresh: null,
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
    setLastRefresh(state, action) {
      state.lastRefresh = action.payload;
    },
    setLastTickerRefresh(state, action) {
      state.lastTickerRefresh = action.payload;
    },
    updateTokenTicker(state, action) {
      const { tokenId, ticker } = action.payload;
      const tokenToUpdate = state.tokens.find(
        (token) => token.tokenId === tokenId
      );
      if (tokenToUpdate) {
        tokenToUpdate.ticker = ticker;
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
        state.lastRefresh = Date.now();
      })
      .addCase(getTokens.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(getTickers.pending, (state) => {
        state.tickerStatus = "loading";
      })
      .addCase(getTickers.fulfilled, (state, action) => {
        state.tickerStatus = "succeeded";
        state.tickers = action.payload;
        state.lastTickerRefresh = Date.now();
      })
      .addCase(getTickers.rejected, (state, action) => {
        state.tickerStatus = "failed";
        state.tickerError = action.payload as string;
      })
      .addCase(getTokensWithTickers.pending, (state) => {
        state.status = "loading";
        state.tickerStatus = "loading";
      })
      .addCase(getTokensWithTickers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.tickerStatus = "succeeded";
        state.tokens = action.payload.tokens;
        state.tickers = action.payload.tickers;
        state.lastRefresh = Date.now();
        state.lastTickerRefresh = Date.now();
      })
      .addCase(getTokensWithTickers.rejected, (state, action) => {
        state.status = "failed";
        state.tickerStatus = "failed";
        state.error = action.payload as string;
        state.tickerError = action.payload as string;
      });
  },
});

export const { updateToken, setLastRefresh, setLastTickerRefresh, updateTokenTicker } = tokenSlice.actions;

// Selectors
export const selectTokens = (state: RootState) => state.tokens.tokens;
export const selectTokensStatus = (state: RootState) => state.tokens.status;
export const selectTickers = (state: RootState) => state.tokens.tickers;
export const selectTickersStatus = (state: RootState) => state.tokens.tickerStatus;
export const selectTickersError = (state: RootState) => state.tokens.tickerError;
export const selectLastRefresh = (state: RootState) => state.tokens.lastRefresh;
export const selectLastTickerRefresh = (state: RootState) => state.tokens.lastTickerRefresh;
export const selectTimeSinceLastRefresh = (state: RootState) => {
  const lastRefresh = state.tokens.lastRefresh;
  return lastRefresh ? Date.now() - lastRefresh : null;
};
export const selectTimeSinceLastTickerRefresh = (state: RootState) => {
  const lastTickerRefresh = state.tokens.lastTickerRefresh;
  return lastTickerRefresh ? Date.now() - lastTickerRefresh : null;
};

// Get ticker for a specific token by tokenId
export const selectTokenTicker = (tokenId: number) => (state: RootState) => {
  const token = state.tokens.tokens.find(t => t.tokenId === tokenId);
  return token?.ticker;
};

// Get all tokens with their ticker information
export const selectTokensWithTickers = (state: RootState) => {
  return state.tokens.tokens.filter(token => token.ticker);
};

// Get ticker by ticker_id
export const selectTickerById = (tickerId: string) => (state: RootState) => {
  return state.tokens.tickers.find(ticker => ticker.ticker_id === tickerId);
};

// Get tickers for a specific base currency
export const selectTickersByBaseCurrency = (baseCurrency: string) => (state: RootState) => {
  return state.tokens.tickers.filter(ticker => ticker.base_currency === baseCurrency);
};

// Get tickers for a specific target currency (e.g., VOI)
export const selectTickersByTargetCurrency = (targetCurrency: string) => (state: RootState) => {
  return state.tokens.tickers.filter(ticker => ticker.target_currency === targetCurrency);
};

export default tokenSlice.reducer;
