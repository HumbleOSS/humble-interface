import styled from "@emotion/styled";
import React, { FC, useEffect, useMemo, useRef } from "react";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import PoolCard from "../PoolCard";
import { IndexerPoolI, PoolI } from "../../types";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { Box, Fade, Grid, Stack } from "@mui/material";
import Search from "../Search";

const PopularPoolsRoot = styled.div`
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
    & .heading-row2 {
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
    & .heading-row2 {
      border-bottom: 1px solid var(--Color-Neutral-Stroke-Primary, #d8d8e1);
    }
    & .message-text {
      color: var(--Color-Neutral-Element-Secondary, #56566e);
    }
  }
`;

const HeadingRow = styled(Box)`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h2`
  font-feature-settings: "clig" off, "liga" off;
  /* Heading/Display 2 */
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 21.6px */
`;

const Columns =  styled(Box)<{ smHidden?: boolean }>`
  display: flex;
  padding: 1px 0px;
  justify-content: center;
  align-items: baseline;
  gap: 10px;
  @media screen and (max-width: 600px) {
    ${(props) => props.smHidden && "display:none;"}
  }
`;

const Heading = styled(Box)`
  display: flex;
  padding: var(--Spacing-600, 12px) var(--Spacing-700, 16px);
  align-items: flex-start;
  align-self: stretch;
  border-radius: var(--Radius-500, 12px);

`;
const Heading2 = styled(Heading)`
@media screen and (min-width: 600px) {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
  min-width: 560px;
}

`

const Column = styled.div`
  display: flex;
  /* align-items: flex-end; */
  gap: 4px;
  height: 16px;
  justify-content: start;
  align-items: start;
`;

const ColumnPair = styled(Column)`
  /* width: 234px; */
  grid-column: span 3;
`;

const ColumnTVL = styled(Column)`
  /* width: 97px; */
`;

const ColumnVolume = styled(Column)`
  /* width: 98px; */
`;

const ColumnAPR = styled(Column)``;

 const ColumnLabel = styled.div`
  /* color: var(--Color-Brand-Element-Primary, #fff); */
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 15.6px */
`;

const Button = styled.div`
  cursor: pointer;
`;

const BaseButton = styled(Button)`
  display: flex;
  padding: var(--Spacing-400, 8px) var(--Spacing-600, 12px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  border-radius: var(--Radius-600, 13px);
`;

const CreateTokenButton = styled(BaseButton)`
  background: var(--Color-Accent-CTA-Background-Default, #2958ff);
  :hover{
    background: var(--Color-Accent-CTA-Background-Default, hsl(226.37681159420288, 93.66515837104073%, 50%));
  }
`;

const CreateButtonInner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: var(--Color-Neutral-Element-Primary, #fff);
`;

const CreateButtonLabel = styled.div`
  /* color: var(--Color-Neutral-Element-Primary, #fff); */
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 16.8px */
`;

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
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8V11.3333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.99634 5.33398H8.00233"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const PoolIcon = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.29028 16.8359H11.6129" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.58187 13.1621H9.32128C11.1587 13.1621 11.6129 13.6163 11.6129 15.4331V19.6757C11.6129 21.4924 11.1587 21.9466 9.32128 21.9466H3.58187C1.74445 21.9466 1.29028 21.4924 1.29028 19.6757V15.4331C1.29028 13.6163 1.74445 13.1621 3.58187 13.1621Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21.9355 14.7109C21.9355 18.7058 18.7046 21.9367 14.7097 21.9367L15.7936 20.1303" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1.29028 8.51682C1.29028 4.52198 4.52125 1.29102 8.51609 1.29102L7.43223 3.09747" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.3227 10.5813C20.8881 10.5813 22.9678 8.50163 22.9678 5.93618C22.9678 3.37072 20.8881 1.29102 18.3227 1.29102C15.7572 1.29102 13.6775 3.37072 13.6775 5.93618C13.6775 8.50163 15.7572 10.5813 18.3227 10.5813Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    
  );
};

interface PoolListProps {
  showing: number;
  pools: IndexerPoolI[];
  tokens: any[];
  filter: string;
  onFilter: (input: string) => void;
}

const PoolList: FC<PoolListProps> = ({
  pools,
  showing,
  tokens,
  filter,
  onFilter,
}) => {
  const poolsRef: any = useRef(null);
  const handleScroll = () => {
    poolsRef.current.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    if (filter === "") return;
    const timeout = setTimeout(handleScroll, 500);
    return () => clearTimeout(timeout);
  }, [pools, tokens]);

  const { activeAccount } = useWallet();
  const navigate = useNavigate();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return (
    <>
      <PopularPoolsRoot
        ref={poolsRef}
        className={isDarkTheme ? "dark" : "light"}
      >
        {/*<Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <SectionTitle>Popular Pools</SectionTitle>
          </Grid>
          <Grid item xs={12} md={6}>
            {activeAccount ? (
              <CreateTokenButton
                onClick={() => {
                  navigate(`/pool/create`);
                }}
              >
                <CreateButtonInner>
                  <CreateButtonLabel>Create pool</CreateButtonLabel>
                  {<PoolIcon />}
                </CreateButtonInner>
              </CreateTokenButton>
            ) : null}
          </Grid>
          <Grid item xs={12}>
            <Search onChange={onFilter} />
          </Grid>
        </Grid>*/}
        <HeadingRow className="heading-row">
          <SectionTitle>Popular Pools</SectionTitle>
          {activeAccount ? (
            <CreateTokenButton
              onClick={() => {
                navigate(`/pool/create`);
              }}
            >
              <CreateButtonInner>
                <CreateButtonLabel>Create pool</CreateButtonLabel>
                {<PoolIcon />}
              </CreateButtonInner>
            </CreateTokenButton>
          ) : null}
        </HeadingRow>
        <HeadingRow className="heading-row2" style={{ paddingBottom: "32px" }}>
          <Search onChange={onFilter} />
        </HeadingRow>
        <Columns smHidden={true}>
          <Heading2 sx={{ display: { xs: "none", md: "flex" } }}>
            <ColumnPair>
              <ColumnLabel>Pair</ColumnLabel>
            </ColumnPair>
            <ColumnTVL>
              <ColumnLabel>TVL</ColumnLabel>
              <InfoCircleIcon />
            </ColumnTVL>
            <ColumnVolume>
              <ColumnLabel>Volume</ColumnLabel>
              <InfoCircleIcon />
            </ColumnVolume>
            <ColumnAPR>
              <ColumnLabel>APR</ColumnLabel>
              <InfoCircleIcon />
            </ColumnAPR>
          </Heading2>
        </Columns>
        {pools.length > 0 ? (
          pools.slice(0, showing).map((p: IndexerPoolI) => {
            return (
              <PoolCard tokens={tokens} key={p.contractId} pool={p}></PoolCard>
            );
          })
        ) : (
          <div>No pools</div>
        )}
      </PopularPoolsRoot>
    </>
  );
};

export default PoolList;
