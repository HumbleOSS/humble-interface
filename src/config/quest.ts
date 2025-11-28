import axios from "axios";

export const QUEST_API = import.meta.env.VITE_HUMBLE_QUEST_API || "https://humble-quest.nautilus.sh";

export enum QUEST_ACTION {
  CONNECT_WALLET = "connect_wallet",
  SWAP_TOKEN = "hmbl_pool_swap",
  SWAP_TOKEN_DAILY = "hmbl_pool_swap_daily",
  ADD_LIQUIDITY = "hmbl_pool_add",
  CREATE_TOKEN = "hmbl_token_create",
  CREATE_LIQUIDITY_POOL = "hmbl_pool_create",
  STAKE_TOKEN = "hmbl_farm_stake",
  CLAIM_REWARD = "hmbl_farm_claim",
  CREATE_FARM = "hmbl_farm_create",
}

export const getActions = (address: string) => {
  return axios.get(`${QUEST_API}/quest`, {
    params: {
      key: address,
    },
  });
};

export const submitAction = (action: string, address: string, params = {}) => {
  return axios.post(
    `${QUEST_API}/quest`,
    {
      action,
      data: {
        wallets: [
          {
            address,
          },
        ],
        ...params,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
