import styled from "@emotion/styled";
import React, { useEffect } from "react";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import { BalanceI, PoolI, PositionI } from "../../types";
import PoolCard from "../PoolCard";
import { useWallet } from "@txnlab/use-wallet";
import { Stack } from "@mui/material";
import axios from "axios";

const YourLiquidityRoot = styled.div`
  width: 90%;
  display: flex;
  padding: var(--Spacing-800, 24px) var(--Spacing-900, 32px);
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Spacing-800, 24px);
  border-radius: var(--Radius-800, 24px);
  &.dark {
    background: var(--Color-Brand-Background-Primary-30, #291c47);
    & h2 {
      color: var(--Color-Neutral-Element-Primary, #fff);
    }
    & .heading-row {
      border-bottom: 1px solid
        var(--Color-Neutral-Stroke-Primary, rgba(255, 255, 255, 0.2));
    }
    & .message-text {
      color: var(--Color-Neutral-Element-Secondary, #f6f6f8);
    }
  }
  &.light {
    background: var(--Color-Brand-Background-Primary-30, #f1eafc);
    & h2 {
      color: var(--Color-Neutral-Element-Primary, #0c0c10);
    }
    & .heading-row {
      border-bottom: 1px solid var(--Color-Neutral-Stroke-Primary, #d8d8e1);
    }
    & .message-text {
      color: var(--Color-Neutral-Element-Secondary, #56566e);
    }
  }
`;

const HeadingRow = styled.div`
  display: flex;
  width: 100%;
  padding-bottom: var(--Spacing-700, 16px);
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h2`
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  /* Heading/Display 2 */
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 21.6px */
`;

const Body = styled.div`
  display: flex;
  padding: 1px 0px;
  justify-content: center;
  align-items: baseline;
  gap: 10px;
  align-self: stretch;
`;

const MessageText = styled.div`
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 15px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 18px */
`;

const PoolPosition = () => {
  const { activeAccount } = useWallet();
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const pools: PoolI[] = useSelector((state: RootState) => state.pools.pools);
  const [balances, setBalances] = React.useState<BalanceI[]>();
  useEffect(() => {
    if (!activeAccount) return;
    axios
      .get(
        `https://arc72-idx.nautilus.sh/nft-indexer/v1/arc200/balances?accountId=${activeAccount.address}`
      )
      .then((res) => {
        setBalances(res.data.balances);
      });
  }, [activeAccount]);
  console.log({
    balances,
  });
  const [positions, setPositions] = React.useState<PositionI[]>([]);
  React.useEffect(() => {
    if (!activeAccount || !balances) return;
    (async () => {
      const positions = [];
      for (const bal of balances) {
        const pool = pools.find((p) => p.poolId === bal.contractId);
        if (!pool) continue;
        positions.push({
          ...pool,
          balance: BigInt(bal.balance),
        });
      }
      setPositions(positions);
    })();
  }, [activeAccount, pools, balances]);
  return (
    <YourLiquidityRoot className={isDarkTheme ? "dark" : "light"}>
      <HeadingRow className="heading-row">
        <SectionTitle>Your Liquidity</SectionTitle>
      </HeadingRow>
      <Body>
        {positions.length > 0 ? (
          <Stack
            spacing={2}
            sx={{
              width: "100%",
            }}
          >
            {positions.map((position) => (
              <PoolCard
                pool={position}
                balance={(Number(position.balance) / 10 ** 6).toFixed(6)}
              />
            ))}
          </Stack>
        ) : (
          <MessageText className="message-text">
            No liquidity pools found
          </MessageText>
        )}
      </Body>
    </YourLiquidityRoot>
  );
};

export default PoolPosition;
