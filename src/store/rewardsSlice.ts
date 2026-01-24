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
  allowance?: string; // For allowance-based rewards
  decimals?: number;
  from?: string;
  to?: string;
  owner?: string; // For allowance: the owner (user)
  spender?: string; // For allowance: the spender (reward address)
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

// Reward owner addresses - can be multiple addresses that distribute rewards
export const REWARD_OWNER_ADDRESSES = [
  "P3ODBTMBYB6UAN3NTYPAKEQOOZJMMT3JHZRT5ONSBTFPQDJ36JUQZVDR2I", // prior payout
  "TWDHSG5BQHXGMDAQ4QJHUQ4TPBJ26ISJX62KNMH7KAEDRNPAYRKN6RAH34", // 25.12.10 reward payout
  "Q4TRDOYQ3R4PYVKHDPMAQE2KXANLH6UYIUSHQPXKVA66N6PPHYDPBHFKS4", // 25.12.17 reward payout
  "FP25VOGWN4PJ53WVXA5422VNENMBFA4P3ZMFNH2UB3KP762R2VKEY6FRXM", // 25.12.23 reward payout
  "XYFNNSZ3PMJGAGRZXCKJLBHS22S56JT67VKIQ4GXYHF2I2MZ6RTASHOGCU", // 25.12.30 reward payout
  "IZTYUP4MT75XCRFN7HFHOGXYATONKDZPXGJKTX3RQHEDDUPPUYKGQCHSTY", // 26.01.06 reward payout
  "PNTT6UNVTMUTCEBM7WXYIBBGPRF6RJAFKGZ7LXT2QEJNCPNS36LKITVCNE", // 26.01.13 reward payout
  "5LK57Y7MADRW2YTWHD5JPNWURKULXLRNZVWQBJPNIF4O4PYWMNWXAKEYEY" // 26.01.24 reward payout
];

// Helper to get a unique ID for a reward
const getRewardId = (reward: RewardTransfer): string => {
  // For allowance-based rewards, use owner-spender-amount combination
  if (reward.allowance && reward.owner && reward.spender) {
    return `${reward.owner}-${reward.spender}-${reward.allowance}`;
  }
  return reward.txId || reward.transactionId || reward.id || `${reward.timestamp}-${reward.amount}`;
};

// Fetch rewards for a user (using arc200/approvals API)
export const fetchRewards = createAsyncThunk<
  RewardTransfer[],
  { userAddress: string },
  { rejectValue: string; state: RootState }
>("rewards/fetchRewards", async ({ userAddress }, { rejectWithValue }) => {
  try {
    const contractId = 47138068; // WAD token contract ID

    // Fetch approvals from all reward owner addresses
    const allRewards: RewardTransfer[] = [];

    // Fetch from each reward owner address in parallel
    const fetchPromises = REWARD_OWNER_ADDRESSES.map(async (rewardOwnerAddress) => {
      try {
        const url = `https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/approvals?contractId=${contractId}&owner=${rewardOwnerAddress}&spender=${userAddress}`;

        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to fetch rewards from ${rewardOwnerAddress}:`, response.statusText);
          return [];
        }

        const data = await response.json();
        console.log(`Rewards API Response for ${rewardOwnerAddress}:`, data);

        // Parse approvals from response
        const approvals = data.approvals || [];

        if (approvals.length === 0) {
          return [];
        }

        // Create reward entries for this owner address
        const rewards: RewardTransfer[] = [];

        approvals.forEach((approval: any) => {
          const amount = BigInt(approval.amount || "0");
          if (amount > 0) {
            rewards.push({
              amount: approval.amount,
              value: approval.amount,
              allowance: approval.amount,
              owner: approval.owner || rewardOwnerAddress,
              spender: approval.spender || userAddress,
              decimals: 6, // WAD token has 6 decimals
              timestamp: approval.timestamp,
              txId: approval.transactionId,
              transactionId: approval.transactionId,
              roundTime: approval.round,
            });
          }
        });

        return rewards;
      } catch (error: any) {
        console.error(`Error fetching rewards from ${rewardOwnerAddress}:`, error);
        // Don't fail the entire operation if one address fails
        return [];
      }
    });

    // Wait for all fetches to complete
    const results = await Promise.all(fetchPromises);

    // Aggregate all rewards from all addresses
    results.forEach((rewards) => {
      allRewards.push(...rewards);
    });

    if (allRewards.length === 0) {
      return [];
    }

    // Calculate total amount for logging
    const totalAmount = allRewards.reduce((sum, reward) => {
      const amount = BigInt(reward.allowance || reward.amount || "0");
      return sum + amount;
    }, BigInt(0));

    console.log("Total allowance from all addresses:", totalAmount.toString());

    return allRewards;
  } catch (error: any) {
    console.error("Error fetching rewards from API:", error);
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

