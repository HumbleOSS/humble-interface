import styled from "@emotion/styled";
import React, { useEffect, useMemo, useRef, useState } from "react";
import SwapIcon from "static/icon/icon-swap-stable-light.svg";
import ActiveSwapIcon from "static/icon/icon-swap-active-light.svg";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import { ButtonGroup, Stack, Button as MUIButton, Fade } from "@mui/material";
import { CONTRACT, abi, arc200 } from "ulujs";
import { NETWORK_TOKEN, TOKEN_VIA } from "../../constants/tokens";
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
import axios from "axios";
import ProgressBar from "../ProgressBar";
import BigNumber from "bignumber.js";
import GoToTop from "../GoToTop";

const formatter = new Intl.NumberFormat("en", { notation: "compact" });

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
        strokeLinecap="round"
        strokeLinejoin="round"
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
  const [filter, setFilter] = useState<string>("");
  const [filter2, setFilter2] = useState<string>("");

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

  /* Tokens */
  const tokens = useSelector((state: RootState) => state.tokens.tokens);
  useEffect(() => {
    dispatch(getTokens() as unknown as UnknownAction);
  }, [dispatch]);
  console.log({ tokens });

  /* Farms */
  const farms: FarmI[] = useSelector((state: RootState) => state.farms.farms);
  useEffect(() => {
    dispatch(getFarms() as unknown as UnknownAction);
  }, [dispatch]);

  const [tokens2, setTokens] = useState<any[]>();
  useEffect(() => {
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=all`
      )
      .then(({ data }) => {
        setTokens(data.tokens);
      });
  }, []);

  console.log({ tokens2 });

  const fetchFarms = () =>
    axios
      .get(`https://mainnet-idx.nautilus.sh/nft-indexer/v1/stake/pools`)
      .then(({ data }) => {
        setFarms(data.pools);
      });
  const [farms2, setFarms] = useState<any[]>([]);
  useEffect(() => {
    fetchFarms();
  }, []);
  console.log({ farms2 });

  const enrichedFarms = useMemo(() => {
    if (!tokens || !farms2) return [] as any[];
    return farms2
      .map((farm) => {
        const stakeToken = tokens.find(
          (token) => `${token.tokenId}` === `${farm.stakeTokenId}`
        );
        const rewardTokens = farm.rewardTokenIds
          .split(",")
          .map((rewardTokenId: string) => {
            return tokens.find((token) => `${token.tokenId}` === rewardTokenId);
          });
        const [rewardToken] = rewardTokens;
        const rewardTokenDecimals = rewardToken?.decimals || 0;
        const rewardAmounts = farm.rewardAmounts.split(",");
        const [rewardAmount] = rewardAmounts;
        const rewardAmountSU = new BigNumber(rewardAmount)
          .dividedBy(new BigNumber(10).pow(rewardTokenDecimals))
          .toNumber();
        const [rewardRemaining] = farm.rewardRemainings.split(",");
        const rewardRemainingSU = formatter.format(
          new BigNumber(rewardRemaining)
            .dividedBy(new BigNumber(10).pow(rewardTokenDecimals))
            .toNumber()
        );
        const stakeTokenDecimals = stakeToken?.decimals || 0;
        const stakeAmountSU = formatter.format(
          new BigNumber(farm.stakeAmount)
            .dividedBy(new BigNumber(10).pow(stakeTokenDecimals))
            .toNumber()
        );

        // calculate APR Rewards/TVL
        let apr = "-";
        if (farm.stakeAmount !== "0") {
          const duration = new BigNumber(farm.end).minus(
            new BigNumber(farm.start)
          );
          const tvl = new BigNumber(farm.stakeAmount);
          const rewards = new BigNumber(rewardRemaining);
          const aprBn = rewards.dividedBy(tvl).times(100);
          apr =
            tvl.gt(new BigNumber(0)) && aprBn.isFinite()
              ? aprBn.isGreaterThan(new BigNumber(1000))
                ? ">1000%"
                : `${aprBn.toFixed(2)}%`
              : "-";
        }
        return {
          ...farm,
          rewardTokenId: Number(rewardToken?.tokenId),
          stakeTokenId: Number(stakeToken?.tokenId),
          rewardAmountSU,
          rewardRemainingSU,
          stakeTokenSymbol: stakeToken?.symbol,
          stakeTokenDecimals,
          stakeAmountSU,
          rewardTokenSymbols: rewardTokens
            .map((rewardToken: any) => rewardToken?.symbol)
            .join(","),
          apr,
        };
      })
      .filter((farm) => farm.rewardAmountSU > 0);
  }, [tokens, farms2]);

  const createFarms = useMemo(() => {
    if (!activeAccount || !enrichedFarms) return [] as any[];
    return enrichedFarms.filter((el) => el.creator === activeAccount.address);
  }, [activeAccount, enrichedFarms]);
  console.log({ createFarms });

  const [positions, setPositions] = useState<any[]>([]);
  useEffect(() => {
    if (!activeAccount) return;
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/stake/accounts?accountId=${activeAccount.address}`
      )
      .then(({ data }) => {
        setPositions(data.accounts);
      });
  }, [activeAccount]);

  const enhancedPositions = useMemo(() => {
    if (!tokens || !positions) return [] as any[];
    return positions
      .map((position) => {
        const stakeToken = tokens.find(
          (token) => `${token.tokenId}` === `${position.stakeTokenId}`
        );
        const rewardTokens = position.rewardTokenIds
          .split(",")
          .map((rewardTokenId: string) => {
            return tokens.find((token) => `${token.tokenId}` === rewardTokenId);
          });
        const [rewardToken] = rewardTokens;
        const rewardTokenDecimals = rewardToken?.decimals || 0;
        const rewardAmounts = position.rewardAmounts.split(",");
        const [rewardAmount] = rewardAmounts;
        const rewardAmountBn = new BigNumber(rewardAmount).dividedBy(
          new BigNumber(10).pow(rewardTokenDecimals)
        );
        const rewardAmountSU = rewardAmountBn.toNumber();
        const [rewardRemaining] = position.rewardRemainings.split(",");
        const rewardRemainingBn = new BigNumber(rewardRemaining).dividedBy(
          new BigNumber(10).pow(rewardTokenDecimals)
        );
        const rewardRemainingSU = formatter.format(
          rewardRemainingBn.toNumber()
        );
        const stakeTokenDecimals = stakeToken?.decimals || 0;
        const stakeAmountBn = new BigNumber(position.allStakeAmount).dividedBy(
          new BigNumber(10).pow(stakeTokenDecimals)
        );
        const stakeAmountSU = formatter.format(stakeAmountBn.toNumber());
        // calculate APR Rewards/TVL
        let apr = "-";
        if (position.stakeAmount !== "0") {
          const duration = new BigNumber(position.end).minus(
            new BigNumber(position.start)
          );
          const tvl = stakeAmountBn;
          const rewards = rewardAmountBn;
          const aprBn = rewards
            .dividedBy(tvl)
            .dividedBy(duration)
            .times(60 * 60 * 24 * 365)
            .times(100);
          apr =
            tvl.gt(new BigNumber(0)) && aprBn.isFinite()
              ? aprBn.isGreaterThan(new BigNumber(1000))
                ? ">1000%"
                : `${aprBn.toFixed(2)}%`
              : "-";
        }
        return {
          ...position,
          rewardTokenId: Number(rewardToken?.tokenId),
          stakeTokenId: Number(stakeToken?.tokenId),
          rewardAmountSU,
          rewardRemaining,
          rewardRemainingSU,
          stakeTokenSymbol: stakeToken?.symbol,
          stakeTokenDecimals,
          stakeAmountSU,
          rewardTokenSymbols: rewardTokens
            .map((rewardToken: any) => rewardToken?.symbol)
            .join(","),
          apr,
        };
      })
      .filter((position) => position.userStakeAmount !== "0");
  }, [positions]);
  console.log({ enhancedPositions });

  const positionList = useMemo(() => {
    if (!pools || !tokens || !enhancedPositions) return [] as any[];
    const list: any[] = [...enhancedPositions] as any[];
    // end asc
    //list.sort((a, b) => a.end - b.end);
    // stakeAmount desc
    list.sort(
      (a, b) =>
        new BigNumber(b.userStakeAmount)
          .dividedBy(b.stakeTokenDecimals)
          .toNumber() -
        new BigNumber(a.userStakeAmount)
          .dividedBy(a.stakeTokenDecimals)
          .toNumber()
    );
    return list;
  }, [pools, tokens, enhancedPositions]);

  console.log({ positionList });

  const filteredPositions = useMemo(() => {
    if (!positionList) return [] as any[];
    if (filter2 === "") return positionList;
    return positionList.filter((el) => {
      return (
        String(el.stakeToken)
          .toUpperCase()
          .includes(String(filter2).toUpperCase()) ||
        String(el.rewardTokenIds)
          .toUpperCase()
          .includes(String(filter2).toUpperCase()) ||
        String(el.stakeTokenSymbol)
          .toUpperCase()
          .includes(String(filter2).toUpperCase()) ||
        String(el.rewardTokenSymbols)
          .toUpperCase()
          .includes(String(filter2).toUpperCase()) ||
        false
      );
    });
  }, [positionList, filter2]);
  console.log({ filteredPositions });

  const [positionStakeAmount, setPositionStakeAmount] = useState<number>(0);
  useEffect(() => {
    if (!activeAccount || !tokens2) return;
    let stakedAmount = 0;
    for (const position of filteredPositions) {
      const { stakeTokenId, userStakeAmount } = position;
      const stakeToken = tokens2.find(
        (token) => `${token.contractId}` === `${stakeTokenId}`
      );
      const stakeTokenDecimals = stakeToken?.decimals || 0;
      const stakeAmountBn = new BigNumber(userStakeAmount).dividedBy(
        new BigNumber(10).pow(stakeTokenDecimals)
      );
      const stakeTokenPrice = new BigNumber(stakeToken?.price || "0");
      stakedAmount += stakeAmountBn.multipliedBy(stakeTokenPrice).toNumber();
    }
    setPositionStakeAmount(stakedAmount);
  }, [activeAccount, tokens2, filteredPositions]);

  const [positionRewardAmount, setPositionRewardAmount] = useState<number>(0);
  useEffect(() => {
    if (!activeAccount || !tokens2) return;
    let rewardAmount = 0;
    for (const position of filteredPositions) {
      const {
        rewardTokenId,
        rewardRemaining,
        userStakeAmount,
        allStakeAmount,
      } = position;
      console.log({ rewardRemaining, rewardTokenId });
      const rewardToken = tokens2.find(
        (token) => `${token.contractId}` === `${rewardTokenId}`
      );
      console.log({ rewardToken });
      const rewardTokenDecimals = rewardToken?.decimals || 0;
      const rewardAmountBn = new BigNumber(rewardRemaining || "0").dividedBy(
        new BigNumber(10).pow(rewardTokenDecimals)
      );
      const rewardTokenPrice = new BigNumber(rewardToken?.price || "0");
      const userStakeAmountBn = new BigNumber(userStakeAmount);
      const allStakeAmountBn = new BigNumber(allStakeAmount);
      const stakePercent = userStakeAmountBn.dividedBy(allStakeAmountBn);
      rewardAmount += rewardAmountBn
        .multipliedBy(rewardTokenPrice)
        .multipliedBy(stakePercent)
        .toNumber();
    }
    setPositionRewardAmount(rewardAmount);
  }, [activeAccount, tokens2, filteredPositions]);
  console.log({ positionRewardAmount });

  const farmList = useMemo(() => {
    if (/*!farms || */ !pools || !tokens || !enrichedFarms) return [] as any[];
    //const farmList: FarmI[] = [...farms];
    const farmList: any[] = [...enrichedFarms];
    farmList.sort((a, b) => b.poolId - a.poolId);
    return farmList;
  }, [pools, tokens, enrichedFarms]);

  const filteredFarms = useMemo(() => {
    if (!farmList) return [] as any[];
    if (filter === "") return farmList;
    return farmList.filter((farm) => {
      return (
        String(farm.stakeToken)
          .toUpperCase()
          .includes(String(filter).toUpperCase()) ||
        String(farm.rewardTokenIds)
          .toUpperCase()
          .includes(String(filter).toUpperCase()) ||
        String(farm.stakeTokenSymbol)
          .toUpperCase()
          .includes(String(filter).toUpperCase()) ||
        String(farm.rewardTokenSymbols)
          .toUpperCase()
          .includes(String(filter).toUpperCase()) ||
        false
      );
    });
  }, [farmList, filter]);

  const pageSize = 25;
  const [page, setPage] = useState<number>(1);
  const [page2, setPage2] = useState<number>(1);
  const [showing, setShowing] = useState<number>(pageSize);

  const isLoading = !pools || !tokens; /*|| !farms*/ //|| !stake;

  // loading indicator

  const message = useMemo(() => {
    if (!tokens || tokens.length === 0) return "Loading tokens...";
    if (!pools || pools.length === 0) return "Loading pools...";
    return "Loading farms...";
  }, [tokens, pools, farms]);

  const progress = useMemo(() => {
    let progress = 0;
    if (!!tokens && tokens.length > 0) progress += 25;
    if (!!pools && pools.length > 0) progress += 25;
    if (!!farms && farms.length > 0) progress += 50;
    return progress;
  }, [tokens, pools, farms]);

  const isActive = useMemo(() => {
    return progress < 100;
  }, [progress]);

  const handleScroll = () => {
    const element = document.getElementById("popular-farms-root");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // active tab

  useEffect(() => {
    setActive(1);
  }, [activeAccount]);

  const [active, setActive] = useState<number>(1);
  console.log({ active });

  return !isLoading ? (
    <>
      <div>
        {activeAccount && filteredPositions.length > 0 ? (
          <ButtonGroup sx={{ mb: 5 }} fullWidth>
            {/*createFarms.length > 0 ? (
              <MUIButton
                variant={active === 3 ? "contained" : "text"}
                style={{
                  color: "#fff",
                  borderRadius: "24px",
                  backgroundColor:
                    active === 3
                      ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
                      : undefined,
                }}
                onClick={() => setActive(3)}
              >
                My Farms
              </MUIButton>
              ) : null*/}
            {filteredPositions.length > 0 ? (
              <MUIButton
                variant={active === 2 ? "contained" : "text"}
                style={{
                  color:
                    active === 2 ? "#fff" : isDarkTheme ? "#fff" : "#2958ff",
                  borderRadius: "24px",
                  backgroundColor:
                    active === 2
                      ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
                      : undefined,
                }}
                onClick={() => setActive(2)}
              >
                Farm Liquidity
              </MUIButton>
            ) : null}
            <MUIButton
              variant={active === 1 ? "contained" : "text"}
              style={{
                color: active === 1 ? "#fff" : isDarkTheme ? "#fff" : "#2958ff",
                borderRadius: "24px",
                backgroundColor:
                  active === 1
                    ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
                    : undefined,
              }}
              onClick={() => setActive(1)}
            >
              Popular Farms
            </MUIButton>
          </ButtonGroup>
        ) : null}
        <PoolRoot className={isDarkTheme ? "dark" : "light"}>
          {activeAccount && active === 3 ? (
            <FarmList
              label={"My Farms"}
              showCreateFarmButton={false}
              showing={Number.MAX_SAFE_INTEGER}
              farms={createFarms}
              onFilter={() => {}}
            />
          ) : null}
          {activeAccount && active === 2 ? (
            <FarmLiquidity
              value={positionStakeAmount}
              value2={positionRewardAmount}
              positions={filteredPositions}
              onFilter={setFilter2}
            />
          ) : null}
          {active === 1 ? (
            <>
              <FarmList
                showing={page * pageSize}
                farms={filteredFarms}
                onFilter={setFilter}
              />
              {page * pageSize < filteredFarms.length ? (
                <ViewMoreButton
                  onClick={() => {
                    setPage(page + 1);
                  }}
                >
                  <ButtonLabelContainer>
                    <DropdownIcon />
                    <ButtonLabel>View More</ButtonLabel>
                  </ButtonLabelContainer>
                </ViewMoreButton>
              ) : null}
              {page > 1 ? (
                <GoToTop
                  onClick={() => {
                    fetchFarms().then(() => {
                      handleScroll();
                      setPage(1);
                    });
                  }}
                />
              ) : null}
            </>
          ) : null}
          <ProgressBar
            message={message}
            isActive={isActive}
            totalSteps={100}
            currentStep={progress}
          />
        </PoolRoot>
      </div>
    </>
  ) : null;
};

export default Farm;
