import styled from "@emotion/styled";
import React, { useEffect, useMemo, useState } from "react";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import PoolPosition from "../PoolPosition";
import TokenList from "../TokenList";
import axios from "axios";
import { IndexerPoolI, PoolI } from "../../types";
import ProgressBar from "../ProgressBar";

const TokenRoot = styled.div`
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

const formatter = new Intl.NumberFormat("en", { notation: "compact" });

const Pool = () => {
  const dispatch = useDispatch();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const storedPools: PoolI[] = useSelector(
    (state: RootState) => state.pools.pools
  );

  console.log({ storedPools });

  const [pools, setPools] = React.useState<IndexerPoolI[]>();
  useEffect(() => {
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
  }, []);

  const [tokens2, setTokens] = React.useState<any[]>();
  useEffect(() => {
    axios
      .get(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=all`
      )
      .then(({ data: { tokens } }) => {
        setTokens(tokens);
      });
  }, []);

  const combinedTokens = useMemo(() => {
    if (!pools || !tokens2) return [];
    const fTokens = tokens2.filter(
      (t) => !["ARC200LT", "LPT"].includes(t.symbol)
    );
    const pTokens = fTokens.map((t) => {
      const tPools = pools.filter(
        (p) =>
          [p.tokAId, p.tokBId].includes(`${t.contractId}`) &&
          p.providerId === "01"
      );
      const tTVL = tPools.reduce(
        (acc, val) => acc + Math.min(Number(val.tvlA), Number(val.tvlB)),
        0
      );
      const tVOL = tPools.reduce(
        (acc, val) =>
          acc +
          (val.tokAId === `${t.contractId}`
            ? Number(val.volA)
            : Number(val.volB)),
        0
      );
      return {
        ...t,
        pools: tPools,
        tvl: tTVL,
        vol: tVOL,
      };
    });
    const wntTokens = pTokens?.filter((t) => t.tokenId === "0") || [];
    console.log({ wntTokens });
    const nt = {
      name: "Voi",
      symbol: "VOI",
      decimals: 6,
      price: "1.000000",
      tvl: wntTokens.reduce((acc, val) => acc + val.tvl, 0),
      contractId: wntTokens.reduce(
        (acc, val) => Math.max(acc, val.contractId),
        0
      ),
      pools: wntTokens.flatMap((t) => t.pools),
    };
    const pts = pTokens.filter((t) => t.tokenId !== "0");
    const tokens = pts.length > 0 ? [nt, ...pts] : [];
    tokens.sort((a, b) => b.tvl - a.tvl);
    return tokens;
  }, [tokens2, pools]);

  const [filter, setFilter] = useState("");

  const filteredTokens = useMemo(() => {
    return combinedTokens.filter(
      (t: any) =>
        filter === "" ||
        String(t.symbol).toUpperCase().indexOf(filter.toUpperCase()) != -1
    );
  }, [combinedTokens, filter]);

  const [showing, setShowing] = useState<number>(20);

  // progress bar

  const message = useMemo(() => {
    if (!tokens2) return "Loading tokens...";
    return "Loading pools...";
  }, [tokens2, pools]);

  const progress = useMemo(() => {
    let progress = 0;
    if (!!tokens2) progress += 50;
    if (!!pools) progress += 50;
    return progress;
  }, [tokens2, pools]);

  const isActive = useMemo(() => {
    return !tokens2 || !pools || progress < 100;
  }, [tokens2, pools]);

  return (
    <TokenRoot className={isDarkTheme ? "dark" : "light"}>
      <TokenList
        onFilter={setFilter}
        tokens={filteredTokens}
        showing={showing}
      />
      {filteredTokens.length > showing ? (
        <ViewMoreButton
          onClick={() => {
            setShowing(showing + 10);
          }}
        >
          <ButtonLabelContainer>
            <DropdownIcon />
            <ButtonLabel>View More</ButtonLabel>
          </ButtonLabelContainer>
        </ViewMoreButton>
      ) : null}
      <ProgressBar
        message={message}
        isActive={isActive}
        totalSteps={100}
        currentStep={progress}
      />
    </TokenRoot>
  );
};

export default Pool;
