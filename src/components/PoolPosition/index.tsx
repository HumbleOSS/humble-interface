import styled from "@emotion/styled";
import React, { FC, useEffect } from "react";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import { BalanceI, PoolI, PositionI } from "../../types";
import PoolCard from "../PoolCard";
import { useWallet } from "@txnlab/use-wallet-react";
import { Stack } from "@mui/material";
import axios from "axios";
import BigNumber from "bignumber.js";
import Search from "../Search";

const formatter = new Intl.NumberFormat("en", { notation: "compact" });

const YourLiquidityRoot = styled.div`
  width: 100%;
  display: flex;
  padding: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
`;

const HeadingRow = styled.div`
  display: flex;
  width: 100%;
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

const MessageText = styled.div<{ isDarkTheme: boolean }>`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%;
  color: ${(props) =>
    props.isDarkTheme
      ? "var(--Color-Neutral-Element-Secondary, #a5a5c0)"
      : "var(--Color-Neutral-Element-Secondary, #56566e)"};
`;

interface PoolPositionProps {
  positions: PositionI[];
  value: number;
  showing: number;
  tokens: any[];
  onFilter: (value: string) => void;
}

const PoolPosition: FC<PoolPositionProps> = ({
  positions,
  showing,
  tokens,
  onFilter,
  value,
}) => {
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return (
    <YourLiquidityRoot>
      <HeadingRow style={{ paddingBottom: "12px" }}>
        <Search onChange={onFilter} />
      </HeadingRow>
      <Body>
        {positions.length > 0 ? (
          <Stack
            spacing={1}
            sx={{
              width: "100%",
            }}
          >
            {positions.slice(0, showing).map((position: any) => (
              <PoolCard
                key={`position-${position.contractId}`}
                tokens={tokens || []}
                pool={position}
                balance={new BigNumber(position.balance.toString())
                  .div(new BigNumber(10).pow(6))
                  .toFixed(6)}
              />
            ))}
          </Stack>
        ) : (
          <MessageText isDarkTheme={isDarkTheme}>
            No liquidity pools found
          </MessageText>
        )}
      </Body>
    </YourLiquidityRoot>
  );
};

export default PoolPosition;
