import styled from "@emotion/styled";
import React, { useEffect, useMemo, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet";
import { Stack } from "@mui/material";
import { CONTRACT, abi, arc200 } from "ulujs";
import { TOKEN_VIA } from "../../constants/tokens";
import { getAlgorandClients } from "../../wallets";
import TokenInput from "../TokenInput";
import PoolPosition from "../PoolPosition";
import FarmList from "../FarmList";
import { getPools } from "../../store/poolSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { FarmI, PoolI, StakeI } from "../../types";
import { getTokens } from "../../store/tokenSlice";
import FarmLiquidity from "../FarmLiquidity";
import { getFarms } from "../../store/farmSlice";
import { getStake } from "../../store/stakeSlice";
import { CTCINFO_STAKR_200 } from "../../constants/dex";

const spec = {
  name: "",
  desc: "",
  methods: [],
  events: [
    // poolId, who, stakeToken, rewardsToken, rewards, start, end
    {
      name: "Pool",
      args: [
        {
          type: "uint64",
          name: "poolId",
        },
        {
          type: "address",
          name: "who",
        },
        {
          type: "uint64",
          name: "stakeToken",
        },
        {
          type: "(uint64)",
          name: "rewardsToken",
        },
        {
          type: "(uint256)",
          name: "rewards",
        },
        {
          type: "uint64",
          name: "start",
        },
        {
          type: "uint64",
          name: "end",
        },
      ],
    },
    {
      name: "Stake",
      args: [
        {
          type: "uint64",
        },
        {
          type: "address",
        },
        {
          type: "uint256",
        },
        {
          type: "(uint256,uint256)",
        },
      ],
    },
  ],
};

const PoolRoot = styled.div`
  display: flex;
  padding: var(--Spacing-1000, 40px);
  flex-direction: column;
  align-items: center;
  gap: var(--Spacing-800, 24px);
  border-radius: var(--Radius-800, 24px);
  &.light {
    border: 1px solid
      var(--Color-Neutral-Stroke-Primary-Static-Contrast, #7e7e9a);
    background: var(
      --Color-Canvas-Transparent-white-950,
      rgba(255, 255, 255, 0.95)
    );
  }
  &.dark {
    border: 1px solid var(--Color-Brand-Primary, #41137e);
    background: var(--Color-Canvas-Transparent-white-950, #070709);
    box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  }
  width: 100%;
  @media screen and (min-width: 600px) {
    width: 630px;
  }
`;

const ViewMoreButton = styled.div`
  display: flex;
  padding: var(--Spacing-700, 16px) var(--Spacing-800, 24px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  border-radius: var(--Radius-750, 20px);
  background: var(--Color-Accent-CTA-Background-Default, #2958ff);
`;

const ButtonLabelContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
`;

const DropdownIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
    >
      <path
        d="M16.5 10L12.5 14L8.5 10"
        stroke="white"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

const Button = styled.div`
  cursor: pointer;
`;

const ButtonLabel = styled(Button)`
  color: var(--Color-Brand-White, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 22px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 26.4px */
`;

const Farm = () => {
  const { activeAccount } = useWallet();
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const dispatch = useDispatch();

  /* Pools */
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);
  useEffect(() => {
    dispatch(getPools() as unknown as UnknownAction);
  }, [dispatch]);

  /* Farms */
  const farms: FarmI[] = useSelector((state: RootState) => state.farms.farms);
  useEffect(() => {
    dispatch(getFarms() as unknown as UnknownAction);
  }, [dispatch]);

  /* Tokens */
  const tokens = useSelector((state: RootState) => state.tokens.tokens);
  useEffect(() => {
    dispatch(getTokens() as unknown as UnknownAction);
  }, [dispatch]);

  /* Stake */
  const stake = useSelector((state: RootState) => state.stake.stake);
  useEffect(() => {
    dispatch(getStake() as unknown as UnknownAction);
  }, [dispatch]);

  const userStake = useMemo(() => {
    if (!activeAccount || !stake) return [] as StakeI[];
    const filteredStake = stake.filter(
      (stake) => stake.who === activeAccount?.address || ""
    );
    const stakeMap = new Map<number, StakeI>();
    for (const stake of filteredStake) {
      if (stakeMap.has(stake.poolId)) {
        const prevStake = stakeMap.get(stake.poolId);
        if (prevStake?.round || 0 < stake.round) {
          stakeMap.set(stake.poolId, stake);
        }
      } else {
        stakeMap.set(stake.poolId, stake);
      }
    }
    return Array.from(stakeMap.values());
  }, [activeAccount, stake]);

  const isLoading = !pools || !tokens || !farms || !stake;

  return !isLoading ? (
    <PoolRoot className={isDarkTheme ? "dark" : "light"}>
      {activeAccount && userStake && userStake.length > 0 ? (
        <FarmLiquidity farms={farms} pools={pools} stake={userStake} />
      ) : null}

      <FarmList farms={farms} />
      <ViewMoreButton>
        <ButtonLabelContainer>
          <DropdownIcon />
          <ButtonLabel>View More</ButtonLabel>
        </ButtonLabelContainer>
      </ViewMoreButton>
    </PoolRoot>
  ) : null;
};

export default Farm;
