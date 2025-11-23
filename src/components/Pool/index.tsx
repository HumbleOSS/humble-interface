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
import { swap } from "ulujs";
import { getAlgorandClients } from "../../wallets";
import { TOKEN_WVOI1 } from "../../constants/tokens";

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

const applyFilter = (p: any, f: string, tokens?: any[]) => {
  const filterUpper = f.toUpperCase();

  // Check token IDs
  if (`${p.tokAId}` === f || `${p.tokBId}` === f || p.poolId === filterUpper) {
    return true;
  }

  // Check symbolA and symbolB if they exist
  if (p.symbolA && String(p.symbolA).toUpperCase().indexOf(filterUpper) >= 0) {
    return true;
  }
  if (p.symbolB && String(p.symbolB).toUpperCase().indexOf(filterUpper) >= 0) {
    return true;
  }

  // If tokens array is available, check token symbols by matching tokAId/tokBId
  if (tokens && tokens.length > 0) {
    const findToken = (tokenIdStr: string) => {
      const id = Number(tokenIdStr);
      let token = tokens.find((t: any) => `${t.contractId}` === tokenIdStr);
      if (!token) {
        token = tokens.find((t: any) => `${t.tokenId}` === tokenIdStr);
      }
      // Handle VOI (0) -> wVOI (390001) mapping
      if (!token && (id === 0 || id === 390001)) {
        token = tokens.find(
          (t: any) => t.tokenId === 0 || t.contractId === 390001
        );
      }
      return token;
    };

    const tokA = findToken(p.tokAId);
    const tokB = findToken(p.tokBId);

    if (
      tokA &&
      (tokA.symbol?.toUpperCase().indexOf(filterUpper) >= 0 ||
        tokA.name?.toUpperCase().indexOf(filterUpper) >= 0)
    ) {
      return true;
    }
    if (
      tokB &&
      (tokB.symbol?.toUpperCase().indexOf(filterUpper) >= 0 ||
        tokB.name?.toUpperCase().indexOf(filterUpper) >= 0)
    ) {
      return true;
    }
  }

  return false;
};

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
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/balances?accountId=${activeAccount.address}`
      )
      .then((res) => {
        setBalances(res.data.balances);
      });
  }, [activeAccount]);

  const [tokens, setTokens] = React.useState<any[]>();
  useEffect(() => {
    axios.get(`https://humble-api.voi.nautilus.sh/tokens`).then((res) => {
      // Map the new API structure to the expected format
      const mappedTokens = res.data.tokens.map((t: any) => {
        const assetId = Number(t.assetId);
        // Assume tokens from Humble API are verified (they're from a trusted source)
        // Also handle VOI (tokenId 0) and wVOI (390001) as special cases
        const isVOI = assetId === 0 || assetId === 390001;
        return {
          ...t,
          contractId: assetId,
          tokenId: assetId,
          symbol: t.unitName || t.symbol,
          decimals: Number(t.decimals),
          verified: isVOI ? 2 : 1, // 2 = trusted (gold badge), 1 = verified
        };
      });

      // Ensure VOI (tokenId 0) is in the list for pool matching
      // VOI should have contractId 390001 but tokenId 0 for display
      const hasVoi = mappedTokens.some(
        (t: any) => t.tokenId === 0 || t.contractId === 390001
      );
      if (!hasVoi) {
        mappedTokens.unshift({
          tokenId: 0,
          contractId: 390001, // Use 390001 internally
          name: "Voi",
          symbol: "VOI",
          decimals: 6,
          verified: 2,
        });
      }

      setTokens(mappedTokens);
    });
  }, [activeAccount]);

  // POOLs
  const fetchPools = async () => {
    try {
      const { data } = await axios.get(
        `https://humble-api.voi.nautilus.sh/pools`
      );
      const { algodClient, indexerClient } = getAlgorandClients();

      // Fetch tokens first to get decimals
      const tokensResponse = await axios.get(
        `https://humble-api.voi.nautilus.sh/tokens`
      );
      const tokensMap = new Map();
      tokensResponse.data.tokens.forEach((t: any) => {
        const assetId = Number(t.assetId);
        tokensMap.set(assetId, {
          decimals: Number(t.decimals),
          symbol: t.unitName || t.symbol,
        });
      });
      // Add VOI token
      tokensMap.set(0, { decimals: 6, symbol: "VOI" });
      tokensMap.set(390001, { decimals: 6, symbol: "VOI" });

      // Fetch pool balances in parallel to calculate TVL
      const poolsWithBalances = await Promise.all(
        data.pools.map(async (p: any) => {
          try {
            const poolId = Number(p.poolId);
            const ci = new swap(poolId, algodClient, indexerClient);
            const infoR = await ci.Info();

            if (infoR.success) {
              const info = infoR.returnValue;
              const poolBalA = info.poolBals?.A || "0";
              const poolBalB = info.poolBals?.B || "0";

              // Get token decimals from tokens map
              const tokAId = Number(p.tokA);
              const tokBId = Number(p.tokB);
              const tokAInfo = tokensMap.get(tokAId) || {
                decimals: 6,
                symbol: "",
              };
              const tokBInfo = tokensMap.get(tokBId) || {
                decimals: 6,
                symbol: "",
              };

              // Get decimals for each token
              const decimalsA = tokAInfo.decimals;
              const decimalsB = tokBInfo.decimals;

              // Calculate TVL: convert balances using correct decimals
              const balA = new BigNumber(poolBalA).dividedBy(
                new BigNumber(10).pow(decimalsA)
              );
              const balB = new BigNumber(poolBalB).dividedBy(
                new BigNumber(10).pow(decimalsB)
              );

              // If one token is VOI (390001), TVL = 2 * VOI balance (since pool maintains 50/50 ratio)
              const isVoiPair =
                tokAId === 390001 ||
                tokBId === 390001 ||
                tokAId === 0 ||
                tokBId === 0;

              let tvl = 0;
              if (isVoiPair) {
                // If VOI is one of the tokens, TVL = 2 * VOI balance (since both sides should be equal value)
                const voiBal = tokAId === 390001 || tokAId === 0 ? balA : balB;
                // Multiply by 2 (both sides of pool)
                tvl = voiBal.multipliedBy(2).toNumber();
              } else {
                // For non-VOI pairs, use 2 * min(balA, balB) as rough estimate
                // This assumes equal value on both sides (standard AMM behavior)
                const minBal = BigNumber.minimum(balA, balB);
                tvl = minBal.multipliedBy(2).toNumber();
              }

              return {
                ...p,
                contractId: poolId,
                poolId: p.poolId,
                tokAId: String(p.tokA),
                tokBId: String(p.tokB),
                symbolA: "",
                symbolB: "",
                tvl: tvl,
                tvlA: poolBalA,
                tvlB: poolBalB,
                poolBalA: poolBalA,
                poolBalB: poolBalB,
                vol: "0",
                volA: "0",
                volB: "0",
                apr: "0",
                supply: info.lptBals?.lpMinted || "0",
                providerId: "01",
              } as IndexerPoolI;
            } else {
              // Fallback if Info() fails
              return {
                ...p,
                contractId: Number(p.poolId),
                poolId: p.poolId,
                tokAId: String(p.tokA),
                tokBId: String(p.tokB),
                symbolA: "",
                symbolB: "",
                tvl: 0,
                tvlA: "0",
                tvlB: "0",
                poolBalA: "0",
                poolBalB: "0",
                vol: "0",
                volA: "0",
                volB: "0",
                apr: "0",
                supply: "0",
                providerId: "01",
              } as IndexerPoolI;
            }
          } catch (error) {
            console.error(`Error fetching pool info for ${p.poolId}:`, error);
            // Return pool without TVL if fetch fails
            return {
              ...p,
              contractId: Number(p.poolId),
              poolId: p.poolId,
              tokAId: String(p.tokA),
              tokBId: String(p.tokB),
              symbolA: "",
              symbolB: "",
              tvl: 0,
              tvlA: "0",
              tvlB: "0",
              poolBalA: "0",
              poolBalB: "0",
              vol: "0",
              volA: "0",
              volB: "0",
              apr: "0",
              supply: "0",
              providerId: "01",
            } as IndexerPoolI;
          }
        })
      );

      setPools(poolsWithBalances);
    } catch (error) {
      console.error("Error fetching pools:", error);
    }
  };
  const [pools, setPools] = React.useState<IndexerPoolI[]>([]);
  useEffect(() => {
    fetchPools();
  }, []);
  const uniqPools = pools;
  const filteredPools = useMemo(() => {
    const badPools: number[] = [];
    const filtered = uniqPools.filter(
      (p) => !badPools.includes(p.contractId) && applyFilter(p, filter, tokens)
    );

    // Helper function to check if a pool is a VOI pair
    const isVoiPair = (pool: IndexerPoolI) => {
      const tokA = Number(pool.tokAId);
      const tokB = Number(pool.tokBId);
      return tokA === 390001 || tokB === 390001 || tokA === 0 || tokB === 0;
    };

    // Helper function to find corresponding VOI pair for a non-VOI pool
    const findCorrespondingVoiPair = (
      pool: IndexerPoolI,
      allPools: IndexerPoolI[]
    ) => {
      const tokA = Number(pool.tokAId);
      const tokB = Number(pool.tokBId);

      // Find VOI/tokA pairs (VOI can be in either position)
      const voiPairA = allPools.find((p) => {
        const pTokA = Number(p.tokAId);
        const pTokB = Number(p.tokBId);
        return (
          ((pTokA === 390001 || pTokA === 0) && pTokB === tokA) ||
          ((pTokB === 390001 || pTokB === 0) && pTokA === tokA)
        );
      });

      // Find VOI/tokB pairs (VOI can be in either position)
      const voiPairB = allPools.find((p) => {
        const pTokA = Number(p.tokAId);
        const pTokB = Number(p.tokBId);
        return (
          ((pTokA === 390001 || pTokA === 0) && pTokB === tokB) ||
          ((pTokB === 390001 || pTokB === 0) && pTokA === tokB)
        );
      });

      // Return the VOI pair with higher TVL, or the first one found
      if (voiPairA && voiPairB) {
        const tvlA =
          typeof voiPairA.tvl === "number"
            ? voiPairA.tvl
            : typeof voiPairA.tvl === "string"
            ? parseFloat(voiPairA.tvl) || 0
            : 0;
        const tvlB =
          typeof voiPairB.tvl === "number"
            ? voiPairB.tvl
            : typeof voiPairB.tvl === "string"
            ? parseFloat(voiPairB.tvl) || 0
            : 0;
        return tvlA > tvlB ? voiPairA : voiPairB;
      }
      return voiPairA || voiPairB;
    };

    // Sort by TVL descending, but prioritize non-VOI pairs over their corresponding VOI pairs if they have higher TVL
    return filtered.sort((a, b) => {
      const tvlA =
        typeof a.tvl === "number"
          ? a.tvl
          : typeof a.tvl === "string"
          ? parseFloat(a.tvl) || 0
          : 0;
      const tvlB =
        typeof b.tvl === "number"
          ? b.tvl
          : typeof b.tvl === "string"
          ? parseFloat(b.tvl) || 0
          : 0;

      const aIsVoiPair = isVoiPair(a);
      const bIsVoiPair = isVoiPair(b);

      // If a is a non-VOI pair and b is its corresponding VOI pair
      if (!aIsVoiPair && bIsVoiPair) {
        const correspondingVoiPair = findCorrespondingVoiPair(a, filtered);
        if (
          correspondingVoiPair &&
          correspondingVoiPair.contractId === b.contractId
        ) {
          // If non-VOI pair has higher TVL than its VOI pair, prioritize it
          if (tvlA > tvlB) {
            return -1; // a comes before b
          }
        }
      }

      // If b is a non-VOI pair and a is its corresponding VOI pair
      if (!bIsVoiPair && aIsVoiPair) {
        const correspondingVoiPair = findCorrespondingVoiPair(b, filtered);
        if (
          correspondingVoiPair &&
          correspondingVoiPair.contractId === a.contractId
        ) {
          // If non-VOI pair has higher TVL than its VOI pair, prioritize it
          if (tvlB > tvlA) {
            return 1; // b comes before a
          }
        }
      }

      // Default: sort by TVL descending
      return tvlB - tvlA;
    });
  }, [uniqPools, filter, tokens]);

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
    return positions.filter((p) => applyFilter(p, filter2, tokens));
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
