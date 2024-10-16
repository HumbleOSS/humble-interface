import styled from "@emotion/styled";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import PoolPosition from "../PoolPosition";
import PoolList from "../PoolList";
import { BalanceI, IndexerPoolI, PoolI, PositionI } from "../../types";
import { getTokens } from "../../store/tokenSlice";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useLocation } from "react-router-dom";
import ProgressBar from "../ProgressBar";
import { ButtonGroup, Button as MUIButton } from "@mui/material";
import GoToTop from "../GoToTop";

const formatter = new Intl.NumberFormat("en", { notation: "compact" });

const PoolRoot = styled.div`
  display: flex;
  /*
  padding: var(--Spacing-1000, 40px);
  */
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
    @media screen and (min-width: 600px) {
      padding: var(--Spacing-1000, 40px);
    }
  }
  &.dark {
    border: 1px solid var(--Color-Brand-Primary, #41137e);
    box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
    @media screen and (min-width: 600px) {
      background: var(--Color-Canvas-Transparent-white-950, #070709);
      padding: var(--Spacing-1000, 40px);
    }
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
        strokeWidth="2"
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
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 22px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 26.4px */
`;

const applyFilter = (p: any, f: string) =>
  String(p.symbolA).toUpperCase().indexOf(f.toUpperCase()) >= 0 ||
  String(p.symbolB).toUpperCase().indexOf(f.toUpperCase()) >= 0 ||
  `${p.tokAId}` === f ||
  `${p.tokBId}` === f ||
  p.poolId === f.toUpperCase();

const Pool = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // Example: Getting a specific query parameter
  const paramFilter = searchParams.get("filter");

  const { activeAccount } = useWallet();
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const pageSize = 25;
  const [page, setPage] = useState<number>(1);
  const [page2, setPage2] = useState<number>(1);
  const [showing, setShowing] = useState<number>(pageSize);
  const [showingPositions, setShowingPositions] = useState<number>(pageSize);

  const [filter, setFilter] = useState<string>(paramFilter || "");
  const [filter2, setFilter2] = useState<string>("");

  const [balances, setBalances] = React.useState<BalanceI[]>();
  useEffect(() => {
    if (!activeAccount) return;
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?accountId=${activeAccount.address}`
      )
      .then((res) => {
        setBalances(res.data.balances);
      });
  }, [activeAccount]);

  const [tokens, setTokens] = React.useState<any[]>();
  useEffect(() => {
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=all`
      )
      .then((res) => {
        setTokens(res.data.tokens);
      });
  }, [activeAccount]);

  // POOLs
  const fetchPools = () =>
    axios
      .get(`https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools`)
      .then(({ data }) => {
        setPools(
          data.pools.map((p: IndexerPoolI) => ({
            ...p,
            tvl: formatter.format(Number(p.tvl)),
            vol: formatter.format(Number(p.volA) + Number(p.volB)),
          }))
        );
      });
  const [pools, setPools] = React.useState<IndexerPoolI[]>([]);
  useEffect(() => {
    fetchPools();
  }, []);
  const uniqPools = pools;
  const filteredPools = useMemo(() => {
    const badPools: number[] = [];
    return uniqPools.filter(
      (p) => !badPools.includes(p.contractId) && applyFilter(p, filter)
    );
  }, [uniqPools, filter]);

  const [positions, setPositions] = React.useState<any[]>([]);
  useEffect(() => {
    if (!activeAccount || !balances || !tokens || !uniqPools) return;
    (async () => {
      const positions = [];
      for (const bal of balances) {
        const balance = BigInt(bal.balance);
        const pool = uniqPools.find((p) => p.contractId === bal.contractId);
        if (!pool || balance === BigInt(0)) continue;
        const tokenA = tokens.find(
          (t) => `${t.contractId}` === `${pool.tokAId}`
        );
        const tokenB = tokens.find(
          (t) => `${t.contractId}` === `${pool.tokBId}`
        );
        const value =
          pool.supply && pool.supply !== "0"
            ? new BigNumber(bal.balance)
                .dividedBy(new BigNumber(10).pow(6))
                .dividedBy(new BigNumber(pool.supply))
                .multipliedBy(
                  Number(pool.tvlA) > Number(pool.tvlB)
                    ? new BigNumber(pool.tvlB).multipliedBy(2)
                    : new BigNumber(pool.tvlA).multipliedBy(2)
                )
                .toNumber()
            : 0;
        positions.push({
          ...pool,
          balance: BigInt(bal.balance),
          value,
          formattedValue: formatter.format(value),
          tokenA,
          tokenB,
        });
      }
      positions.sort((a, b) => Number(b.value) - Number(a.value));
      setPositions(positions);
    })();
  }, [activeAccount, uniqPools, balances, tokens]);
  const filteredPositions = useMemo(() => {
    return positions.filter((p) => applyFilter(p, filter2));
  }, [positions, filter2]);
  const value = useMemo(
    () => filteredPositions.reduce((acc, val) => acc + val.value, 0),
    [filteredPositions]
  );

  const isLoading = !filteredPools || !filteredPositions;

  if (isLoading) return null;

  // active tab

  const [active, setActive] = useState<number>(1);

  useEffect(() => {
    setActive(1);
  }, [activeAccount]);

  return (
    <div
    // style={{maxWidth:"100vw", background:"red",overflow:"hidden"}}
    >
      {activeAccount && filteredPositions.length > 0 ? (
        <ButtonGroup sx={{ mb: 5 }} fullWidth>
          {filteredPositions.length > 0 ? (
            <MUIButton
              variant={active === 2 ? "contained" : "text"}
              style={{
                color: active === 2 ? "#fff" : isDarkTheme ? "#fff" : "#2958ff",
                borderRadius: "24px",
                backgroundColor:
                  active === 2
                    ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
                    : undefined,
              }}
              onClick={() => setActive(2)}
            >
              Your Liquidity
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
            Popular Pools
          </MUIButton>
        </ButtonGroup>
      ) : null}
      <PoolRoot className={isDarkTheme ? "dark" : "light"}>
        {active === 2 && activeAccount ? (
          <>
            <PoolPosition
              positions={filteredPositions}
              value={value}
              showing={page2 * pageSize}
              tokens={tokens || ([] as any[])}
              onFilter={(v) => {
                setFilter2(v);
                setPage2(1);
              }}
            />
            {filteredPositions.length > showingPositions ? (
              <ViewMoreButton
                onClick={() => {
                  //setShowingPositions(showingPositions + pageSize);
                  //setShowing(pageSize);
                  setPage2(page2 + 1);
                  setPage(1);
                }}
              >
                <ButtonLabelContainer>
                  <DropdownIcon />
                  <ButtonLabel>View More</ButtonLabel>
                </ButtonLabelContainer>
              </ViewMoreButton>
            ) : page > 1 ? (
              <GoToTop
                onClick={() => {
                  fetchPools().then(() => setShowingPositions(pageSize));
                }}
              />
            ) : null}
          </>
        ) : null}
        {active === 1 ? (
          <>
            <PoolList
              filter={filter}
              pools={filteredPools}
              tokens={tokens || ([] as any[])}
              showing={pageSize * page}
              onFilter={(v) => {
                setFilter(v);
                setShowing(pageSize);
                setPage(1);
              }}
            />
            {filteredPools.length > showing ? (
              <ViewMoreButton
                onClick={() => {
                  setShowingPositions(pageSize);
                  setPage(page + 1);
                  //setShowing(showing + pageSize);
                }}
              >
                <ButtonLabelContainer>
                  <DropdownIcon />
                  <ButtonLabel>View More</ButtonLabel>
                </ButtonLabelContainer>
              </ViewMoreButton>
            ) : page > 1 ? (
              <GoToTop
                onClick={() => {
                  fetchPools().then(() => setShowing(pageSize));
                }}
              />
            ) : null}
          </>
        ) : null}
      </PoolRoot>
    </div>
  );
};

export default Pool;
