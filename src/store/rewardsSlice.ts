import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

export interface RewardTransfer {
  txId?: string;
  transactionId?: string;
  id?: string;
  timestamp?: number;
  time?: number;
  roundTime?: number;
  amount?: string;
  value?: string;
  decimals?: number;
  from?: string;
  to?: string;
}

export interface RewardsState {
  rewards: RewardTransfer[];
  seenRewardIds: Record<string, string[]>; // Track which rewards have been seen per address
  currentAddress: string | null; // Track which address we're currently viewing
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  lastFetchTime: number | null;
  newRewards: RewardTransfer[]; // New rewards that haven't been seen yet
}

// Helper to get a unique ID for a reward
const getRewardId = (reward: RewardTransfer): string => {
  return reward.txId || reward.transactionId || reward.id || `${reward.timestamp}-${reward.amount}`;
};

// Fetch rewards for a user
export const fetchRewards = createAsyncThunk<
  RewardTransfer[],
  { userAddress: string },
  { rejectValue: string; state: RootState }
>("rewards/fetchRewards", async ({ userAddress }, { rejectWithValue }) => {
  try {
    const rewardSenderAddress = "TGO5SCT6HFGKGC5J2QFDHSOYLMY6CL4323HOLRTUZGY55XKYAWSVYZTGEI";
    const contractId = "47138068";
    // The sender is the reward address, the receiver is the user's address
    const url = `https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/transfers?contractId=${contractId}&from=${rewardSenderAddress}&to=${userAddress}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch rewards data");
    }
    
    const data = await response.json();
    // Handle different response formats
    const transfers: RewardTransfer[] = Array.isArray(data)
      ? data
      : data.transfers || data.data || [];
    
    return transfers;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to fetch rewards");
  }
});

const initialState: RewardsState = {
  rewards: [],
  seenRewardIds: {},
  currentAddress: null,
  status: "idle",
  error: null,
  lastFetchTime: null,
  newRewards: [],
};

const rewardsSlice = createSlice({
  name: "rewards",
  initialState,
  reducers: {
    markRewardsAsSeen: (state, action: PayloadAction<{ address: string; rewardIds: string[] }>) => {
      const { address, rewardIds } = action.payload;
      // Initialize seenRewardIds for this address if it doesn't exist
      if (!state.seenRewardIds[address]) {
        state.seenRewardIds[address] = [];
      }
      // Add new IDs to seen list for this address (avoid duplicates)
      rewardIds.forEach((id) => {
        if (!state.seenRewardIds[address].includes(id)) {
          state.seenRewardIds[address].push(id);
        }
      });
      // Remove seen rewards from newRewards
      state.newRewards = state.newRewards.filter(
        (reward) => !rewardIds.includes(getRewardId(reward))
      );
    },
    clearNewRewards: (state) => {
      state.newRewards = [];
    },
    addToSeenRewards: (state, action: PayloadAction<{ address: string; rewardId: string }>) => {
      const { address, rewardId } = action.payload;
      if (!state.seenRewardIds[address]) {
        state.seenRewardIds[address] = [];
      }
      if (!state.seenRewardIds[address].includes(rewardId)) {
        state.seenRewardIds[address].push(rewardId);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRewards.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchRewards.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastFetchTime = Date.now();
        
        // Get the address from the action meta (we need to pass it through)
        // For now, we'll use the currentAddress or extract from the first reward
        const address = state.currentAddress || action.meta.arg.userAddress;
        state.currentAddress = address;
        
        // Initialize seenRewardIds for this address if it doesn't exist
        if (!state.seenRewardIds[address]) {
          state.seenRewardIds[address] = [];
        }
        
        const seenIdsSet = new Set(state.seenRewardIds[address]);
        const newRewards: RewardTransfer[] = [];
        const allRewards: RewardTransfer[] = [];
        
        // Check for new rewards
        action.payload.forEach((reward) => {
          const rewardId = getRewardId(reward);
          allRewards.push(reward);
          
          if (!seenIdsSet.has(rewardId)) {
            newRewards.push(reward);
          }
        });
        
        state.rewards = allRewards;
        state.newRewards = newRewards;
      })
      .addCase(fetchRewards.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to fetch rewards";
      });
  },
});

export const { markRewardsAsSeen, clearNewRewards, addToSeenRewards } = rewardsSlice.actions;

// Selectors
export const selectRewards = (state: RootState) => state.rewards.rewards;
export const selectNewRewards = (state: RootState) => state.rewards.newRewards;
export const selectSeenRewardIds = (state: RootState, address?: string) => {
  const addr = address || state.rewards.currentAddress;
  if (!addr || !state.rewards.seenRewardIds[addr]) {
    return new Set<string>();
  }
  return new Set(state.rewards.seenRewardIds[addr]);
};
export const selectRewardsStatus = (state: RootState) => state.rewards.status;
export const selectHasNewRewards = (state: RootState) => state.rewards.newRewards.length > 0;
export const selectCurrentAddress = (state: RootState) => state.rewards.currentAddress;

export default rewardsSlice.reducer;

