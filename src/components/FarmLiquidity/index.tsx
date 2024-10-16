import styled from "@emotion/styled";
import React, { FC, useEffect, useMemo, useState } from "react";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import { FarmI, PoolI, PositionI, StakeI } from "../../types";
import { arc200 } from "ulujs";
import { getAlgorandClients } from "../../wallets";
import { useNavigate } from "react-router-dom";
import { Fade, Stack, Tooltip } from "@mui/material";
import FarmCard from "../FarmCard";
import moment from "moment";
import Search from "../Search";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";

const formatter = new Intl.NumberFormat("en", { notation: "compact" });

const Columns = styled.div`
  display: flex;
  padding: 1px 0px;
  justify-content: center;
  align-items: baseline;
  gap: 10px;
  align-self: stretch;
`;

const Heading = styled.div`
  display: flex;
  padding: var(--Spacing-600, 12px) var(--Spacing-700, 16px);
  align-items: flex-start;
  align-self: stretch;
  border-radius: var(--Radius-500, 12px);
`;

const Column = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 16px;
`;

const ColumnPair = styled(Column)`
  width: 234px;
`;

const ColumnTVL = styled(Column)`
  width: 97px;
`;

const ColumnVolume = styled(Column)`
  width: 98px;
`;

const ColumnAPR = styled(Column)``;

const ColumnLabel = styled.div`
  color: var(--Color-Brand-Element-Primary, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 15.6px */
`;

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

const ArrowRightIcon = () => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M30 16L2 16"
        stroke="#141010"
        stroke-width="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 28L30 16L18 4"
        stroke="#141010"
        stroke-width="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const InfoCircleIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M7.99992 14.6673C11.6666 14.6673 14.6666 11.6673 14.6666 8.00065C14.6666 4.33398 11.6666 1.33398 7.99992 1.33398C4.33325 1.33398 1.33325 4.33398 1.33325 8.00065C1.33325 11.6673 4.33325 14.6673 7.99992 14.6673Z"
        stroke="white"
        stroke-width="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8V11.3333"
        stroke="white"
        stroke-width="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.99634 5.33398H8.00233"
        stroke="white"
        stroke-width="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const PoolIcon = () => {
  return (
    <svg
      width="23"
      height="24"
      viewBox="0 0 23 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.3231 15.6665C14.3231 19.3865 11.3122 22.3974 7.59224 22.3974C3.87224 22.3974 0.861328 19.3865 0.861328 15.6665C0.861328 11.9465 3.87224 8.93555 7.59224 8.93555C7.76679 8.93555 7.93042 8.94648 8.11588 8.95739C11.4213 9.2083 14.0613 11.8483 14.3122 15.1537C14.3122 15.3174 14.3231 15.4811 14.3231 15.6665Z"
        stroke="white"
        stroke-width="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.5778 8.40081C21.5778 12.1208 18.5669 15.1318 14.8469 15.1318H14.3123C14.0614 11.8263 11.4214 9.18626 8.11597 8.93535V8.40081C8.11597 4.68081 11.1269 1.66992 14.8469 1.66992C18.5669 1.66992 21.5778 4.68081 21.5778 8.40081Z"
        fill="white"
        stroke-width="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface FarmLiquidityProps {
  positions: any[];
  value: number;
  value2: number;
  onFilter: (input: string) => void;
}

const FarmLiquidity: FC<FarmLiquidityProps> = ({
  positions: farms,
  onFilter,
  value,
  value2,
}) => {
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const timestamp = useMemo(() => moment().unix(), []);
  return (
    <YourLiquidityRoot className={isDarkTheme ? "dark" : "light"}>
      <HeadingRow className="heading-row">
        <SectionTitle>Farm Liquidity</SectionTitle>
        {farms.length > 0 ? (
          <Fade in={!!value} timeout={3000}>
            <SectionTitle
              style={{
                display: "flex",
                fontWeight: 200,
                fontSize: "16px",
                alignItems: "center",
              }}
            >
              <Tooltip title="Your total stake in farms">
                <Stack spacing={0.5} direction="row" alignItems="center">
                  <span>{formatter.format(value)} VOI</span>
                  <InfoCircleIcon />
                </Stack>
              </Tooltip>
              <ArrowRightAltIcon />
              <Tooltip title="The total rewards remaining in farm positions">
                <Stack spacing={0.5} direction="row" alignItems="center">
                  <span>{formatter.format(value2)} VOI</span>
                  <InfoCircleIcon />
                </Stack>
              </Tooltip>
            </SectionTitle>
          </Fade>
        ) : null}
      </HeadingRow>
      <HeadingRow className="heading-row2" style={{ paddingBottom: "32px" }}>
        <Search onChange={onFilter} />
      </HeadingRow>
      <Columns>
        <Heading>
          <ColumnPair>
            <ColumnLabel>&nbsp;</ColumnLabel>
          </ColumnPair>
          <ColumnTVL>
            <ColumnLabel>Rewards</ColumnLabel>
            <InfoCircleIcon />
          </ColumnTVL>
          <ColumnVolume>
            <ColumnLabel>APR</ColumnLabel>
            <InfoCircleIcon />
          </ColumnVolume>
          <ColumnAPR>
            <ColumnLabel>TVL</ColumnLabel>
            <InfoCircleIcon />
          </ColumnAPR>
        </Heading>
      </Columns>
      <Body>
        {farms.length > 0 ? (
          <Stack spacing={2} sx={{ width: "100%" }}>
            {farms.map((position) => (
              <FarmCard
                key={position.poolId}
                farm={farms.find((farm) => farm.poolId === position.poolId)}
                round={0}
                timestamp={timestamp}
              />
            ))}
          </Stack>
        ) : (
          <MessageText className="message-text">No farms found</MessageText>
        )}
      </Body>
    </YourLiquidityRoot>
  );
};

export default FarmLiquidity;
