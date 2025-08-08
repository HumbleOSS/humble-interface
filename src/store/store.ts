import { configureStore } from "@reduxjs/toolkit";
import themeReducer, { ThemeState } from "./themeSlice";
import tokenReducer, { TokensState } from "./tokenSlice";
import collectionReducer, { CollectionsState } from "./collectionSlice";
import saleReducer, { SalesState } from "./saleSlice";
import dexReducer, { DexState } from "./dexSlice";
import poolReducer, { PoolState } from "./poolSlice";
import poolBalsReducer, { PoolBalsState } from "./poolBalsSlice";
import farmReducer, { FarmState } from "./farmSlice";
import stakeReducer, { StakeState } from "./stakeSlice";
import volumeReducer, { VolumeState } from "./volumeSlice";

const store = configureStore({
  reducer: {
    theme: themeReducer,
    pools: poolReducer,
    poolBals: poolBalsReducer,
    farms: farmReducer,
    stake: stakeReducer,
    tokens: tokenReducer,
    volumes: volumeReducer,
    //
    collections: collectionReducer,
    sales: saleReducer,
    dex: dexReducer,
  },
});

export type RootState = {
  theme: ThemeState;
  pools: PoolState;
  poolBals: PoolBalsState;
  farms: FarmState;
  stake: StakeState;
  tokens: TokensState;
  volumes: VolumeState;
  //
  collections: CollectionsState;
  sales: SalesState;
  dex: DexState;
};

export type AppDispatch = typeof store.dispatch;

export default store;
