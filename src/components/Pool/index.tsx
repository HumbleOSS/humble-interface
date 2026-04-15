import styled from "@emotion/styled";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import { useWallet } from "@txnlab/use-wallet-react";
import PoolPosition from "../PoolPosition";
import PoolStats from "../PoolStats";
import { BalanceI, IndexerPoolI } from "../../types";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useLocation, useNavigate } from "react-router-dom";
import useDefiRewards from "../../hooks/useDefiRewards";
import { TOKEN_WVOI1 } from "../../constants/tokens";
import { API_BASE_URL } from "../../constants/api";
import {
  BLOCK_REWARD_ADJUSTMENT,
  ENABLE_BLOCK_REWARD_ADJUSTMENT,
} from "../../constants/rewards";

const formatter = new Intl.NumberFormat("en", { notation: "compact" });

// Normalize symbol: replace wVOI with VOI
const normalizeSymbol = (symbol: string, tokenId?: string | number): string => {
  if (!symbol) return symbol;
  const tokenIdNum = tokenId ? Number(tokenId) : null;
  // Check if token is VOI/wVOI by ID or symbol
  const isVOI = tokenIdNum === 0 || tokenIdNum === TOKEN_WVOI1 || 
                symbol.toUpperCase() === "WVOI" || symbol.toUpperCase() === "VOI";
  if (isVOI) {
    return "VOI";
  }
  return symbol;
};

const PageWrapper = styled.div`
  width: 100%;
  padding: clamp(16px, 4vw, 40px);
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 3vw, 32px);
`;

const HeroCard = styled.div`
  border-radius: 32px;
  padding: clamp(20px, 4vw, 40px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(
      135deg,
      rgba(41, 88, 255, 0.35),
      rgba(65, 19, 126, 0.4)
    ),
    var(--Color-Canvas-Transparent-white-950, #070709);
  box-shadow: 0px 20px 50px rgba(9, 9, 17, 0.5);
  color: var(--Color-Neutral-Element-Primary, #fff);

  &.light {
    background: linear-gradient(
        135deg,
        rgba(41, 88, 255, 0.35),
        rgba(41, 88, 255, 0.1)
      ),
      #ffffff;
    border: 1px solid rgba(41, 88, 255, 0.2);
    box-shadow: 0px 30px 60px rgba(41, 88, 255, 0.15);
    color: var(--Color-Neutral-Element-Primary, #0c0c10);
  }
`;

const HeroHeadline = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
`;

const HeroValue = styled.div`
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 700;
  line-height: 1;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeroCaption = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;

  .light & {
    color: rgba(12, 12, 16, 0.7);
  }
`;

const HeroCTA = styled.button`
  width: fit-content;
  border: none;
  border-radius: 16px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: var(--Color-Brand-White, #fff);
  background: var(--Color-Accent-CTA-Background-Default, #2958ff);
  transition: opacity 150ms ease;
  &:hover {
    opacity: 0.9;
  }
`;

const LayoutGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr);
  gap: clamp(16px, 3vw, 32px);

  @media screen and (min-width: 1100px) {
    grid-template-columns: minmax(0, 3fr) minmax(280px, 1.1fr);
  }
`;

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 3vw, 32px);
`;

const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Panel = styled.div`
  border-radius: 24px;
  padding: clamp(20px, 2vw, 28px);
  border: 1px solid
    var(--Color-Neutral-Stroke-Primary, rgba(255, 255, 255, 0.15));
  background: var(--Color-Canvas-Transparent-white-950, #050507);
  color: var(--Color-Neutral-Element-Primary, #fff);

  &.light {
    background: #fff;
    border-color: rgba(41, 88, 255, 0.15);
    color: var(--Color-Neutral-Element-Primary, #0c0c10);
  }
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: inherit;
`;

const PanelSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: var(--Color-Neutral-Element-Secondary, #a5a5c0);

  .light & {
    color: var(--Color-Neutral-Element-Secondary, #56566e);
  }
`;

const SimpleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SimpleListRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: inherit;
  &:last-of-type {
    border-bottom: none;
  }
  &.light {
    border-color: rgba(0, 0, 0, 0.06);
  }
`;

const SimpleListLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
`;

const SimpleListValue = styled.div`
  font-weight: 600;
  color: inherit;
`;

const EmptyState = styled.div`
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  color: var(--Color-Neutral-Element-Secondary, #a5a5c0);
  &.light {
    border-color: rgba(0, 0, 0, 0.15);
  }
`;

const UserStatsGrid = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 16px;
  padding: 16px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);

  &.light {
    background: rgba(41, 88, 255, 0.05);
    border-color: rgba(41, 88, 255, 0.15);
  }
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StatLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: var(--Color-Neutral-Element-Secondary, #a5a5c0);
  text-transform: uppercase;
  letter-spacing: 0.5px;

  .light & {
    color: var(--Color-Neutral-Element-Secondary, #56566e);
  }
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: var(--Color-Neutral-Element-Primary, #fff);
  line-height: 1.2;

  .light & {
    color: var(--Color-Neutral-Element-Primary, #0c0c10);
  }
`;

const FullWidthStatsWrapper = styled.div`
  width: 100%;
  margin-top: clamp(16px, 3vw, 32px);

  /* Override PoolStats Container styles */
  & > div {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-wrap: wrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 8px;

  @media screen and (max-width: 600px) {
    gap: 4px;
    justify-content: flex-start;
    padding-left: 8px;
    padding-right: 8px;
  }

  &.light {
    border-top-color: rgba(0, 0, 0, 0.06);
  }
`;

const PaginationButton = styled.button<{
  disabled?: boolean;
  active?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: ${(props) =>
    props.active
      ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
      : props.disabled
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(255, 255, 255, 0.03)"};
  color: ${(props) =>
    props.active
      ? "#fff"
      : props.disabled
      ? "rgba(255, 255, 255, 0.3)"
      : "var(--Color-Neutral-Element-Primary, #fff)"};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-weight: 600;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  transition: all 0.2s ease;
  min-width: 36px;
  height: 36px;
  white-space: nowrap;
  flex-shrink: 0;

  .pagination-text-full {
    display: inline;
  }
  .pagination-text-short {
    display: none;
  }

  @media screen and (max-width: 600px) {
    padding: 6px 10px;
    font-size: 12px;
    min-width: 32px;
    height: 32px;

    .pagination-text-full {
      display: none;
    }
    .pagination-text-short {
      display: inline;
    }
  }

  &:hover:not(:disabled) {
    background: ${(props) =>
      props.active
        ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
        : "rgba(255, 255, 255, 0.08)"};
    border-color: rgba(255, 255, 255, 0.25);
  }

  &.light {
    border-color: rgba(41, 88, 255, 0.15);
    background: ${(props) =>
      props.active
        ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
        : props.disabled
        ? "rgba(41, 88, 255, 0.05)"
        : "rgba(41, 88, 255, 0.03)"};
    color: ${(props) =>
      props.active
        ? "#fff"
        : props.disabled
        ? "rgba(12, 12, 16, 0.3)"
        : "var(--Color-Neutral-Element-Primary, #0c0c10)"};

    &:hover:not(:disabled) {
      background: ${(props) =>
        props.active
          ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
          : "rgba(41, 88, 255, 0.08)"};
      border-color: rgba(41, 88, 255, 0.25);
    }
  }
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
  const rewards = useDefiRewards();
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const pageSize = 25;
  const positionsPageSize = 6;
  const [page2, setPage2] = useState<number>(1);

  const [filter] = useState<string>(paramFilter || "");
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
    axios
      .get(
        `${API_BASE_URL}tokens`
      )
      .then((res) => {
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
        `${API_BASE_URL}pools/stats?sortBy=tvl`
      );

      // The API returns { stats: [...], count: number }
      const poolsStats = data.stats || [];

      // Map the stats response to IndexerPoolI format
      const poolsWithStats = poolsStats.map((poolStat: any) => {
        const poolId = Number(poolStat.poolId);
        const pool = poolStat.pool || {};
        const poolInfo = poolStat.poolInfo || {};
        const tokens = poolStat.tokens || {};
        const tvl = poolStat.tvl || {};
        const volume = poolStat.volume || {};
        const fees = poolStat.fees || {};

        // Get token symbols
        const tokenA = tokens.tokenA || {};
        const tokenB = tokens.tokenB || {};
        const tokAId = String(pool.tokA || poolInfo.tokA || "");
        const tokBId = String(pool.tokB || poolInfo.tokB || "");
        const symbolA = normalizeSymbol(
          tokenA.unitName || tokenA.symbol || "",
          tokAId
        );
        const symbolB = normalizeSymbol(
          tokenB.unitName || tokenB.symbol || "",
          tokBId
        );

        // Get pool balances
        const poolBalA = poolInfo.poolBals?.A || "0";
        const poolBalB = poolInfo.poolBals?.B || "0";

        // Get TVL values
        const tvlUsd = parseFloat(tvl.usd || "0");
        const tvlA = tvl.tokenA?.amount || "0";
        const tvlB = tvl.tokenB?.amount || "0";

        // Get volume values
        const vol24h = volume["24h"] || {};
        const volA = vol24h.baseVolume || "0";
        const volB = vol24h.targetVolume || "0";
        const volUsd = parseFloat(vol24h.usdVolume || "0");

        // Get APR and supply
        const apr = fees.apr || "0";
        const supply = poolInfo.lptBals?.lpMinted || "0";

        // Get unitValue (USD value per LP token unit)
        const unitValue = poolStat.unitValue || undefined;

        return {
          contractId: poolId,
          poolId: String(poolId),
          tokAId: tokAId,
          tokBId: tokBId,
          symbolA: symbolA,
          symbolB: symbolB,
          tvl: tvlUsd,
          tvlA: tvlA,
          tvlB: tvlB,
          poolBalA: poolBalA,
          poolBalB: poolBalB,
          vol: volUsd,
          volA: volA,
          volB: volB,
          apr: apr,
          supply: supply,
          unitValue: unitValue,
          providerId: "01",
        } as IndexerPoolI;
      });

      setPools(poolsWithStats);
    } catch (error) {
      console.error("Error fetching pools stats:", error);
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

    // Return filtered pools as-is without sorting
    return filtered;
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
        // Calculate position value using unitValue if available, otherwise fallback to old calculation
        const value = pool.unitValue
          ? new BigNumber(bal.balance)
              .dividedBy(new BigNumber(10).pow(6))
              .multipliedBy(new BigNumber(pool.unitValue))
              .toNumber()
          : pool.supply && pool.supply !== "0"
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
      setPositions(positions);
    })();
  }, [activeAccount, uniqPools, balances, tokens]);
  const filteredPositions = useMemo(() => {
    return positions
      .filter((p) => applyFilter(p, filter2, tokens))
      .sort((a, b) => (b.value || 0) - (a.value || 0)); // Sort by value descending (highest first)
  }, [positions, filter2, tokens]);

  const rewardsEarned = useMemo(
    () => filteredPositions.reduce((acc, val) => acc + val.value, 0),
    [filteredPositions]
  );

  // Calculate total APR including boosts for a pool
  const calculateTotalApr = useCallback(
    (pool: IndexerPoolI): number => {
      const baseApr = Number(pool.apr || "0");
      const poolIdNum = pool.contractId;

      // Find matching reward - check both string and number poolId formats
      const reward = rewards.find(
        (r) =>
          r.poolId === poolIdNum ||
          `${r.poolId}` === `${poolIdNum}` ||
          `${r.poolId}` === `${pool.poolId}`
      ) || {
        aprBoost: 0,
        blockReward: 0,
        additionalAprBoost: 0,
      };

      // Check for VOI pairs - VOI can be represented as 0 or 390001 (TOKEN_WVOI1)
      const tokAValues = [Number(pool.tokAId), Number(pool.tokBId)];
      const isVOIPair =
        tokAValues.includes(0) || tokAValues.includes(TOKEN_WVOI1);

      // Apply block reward adjustment for VOI pairs
      let blockReward = reward.blockReward || 0;
      if (ENABLE_BLOCK_REWARD_ADJUSTMENT && isVOIPair) {
        blockReward = BLOCK_REWARD_ADJUSTMENT;
      }

      const totalApr =
        baseApr +
        (reward.aprBoost || 0) +
        blockReward +
        (reward.additionalAprBoost || 0);

      return totalApr;
    },
    [rewards]
  );

  const rewardPools = useMemo(() => {
    return [...filteredPools]
      .map((pool) => ({
        ...pool,
        totalApr: calculateTotalApr(pool),
      }))
      .filter((pool) => pool.totalApr > 0)
      .sort((a, b) => b.totalApr - a.totalApr)
      .slice(0, 3);
  }, [filteredPools, calculateTotalApr]);

  const topPoolsByTVL = useMemo(() => {
    return [...filteredPools]
      .sort((a, b) => Number(b.tvl) - Number(a.tvl))
      .slice(0, 3);
  }, [filteredPools]);

  const topPoolsByVolume = useMemo(() => {
    return [...filteredPools]
      .sort((a, b) => Number(b.vol) - Number(a.vol))
      .slice(0, 3);
  }, [filteredPools]);

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value || 0);

  const formatAPR = (value?: string) => {
    const aprNumber = Number(value || 0);
    if (!aprNumber) return "—";
    return `${aprNumber.toFixed(2)}% APR`;
  };

  const navigate = useNavigate();

  const totalPages = Math.ceil(filteredPositions.length / positionsPageSize);
  const startIndex = (page2 - 1) * positionsPageSize;
  const endIndex = startIndex + positionsPageSize;
  const currentPositions = filteredPositions.slice(startIndex, endIndex);

  // Generate page numbers with ellipsis for mobile
  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    // Show fewer pages on mobile (assume mobile if totalPages > 5)
    const isMobile = totalPages > 5;
    const maxVisible = isMobile ? 3 : totalPages;

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (page2 <= 2) {
      // Show first pages
      for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) {
        pages.push(i);
      }
      if (totalPages > maxVisible) {
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    } else if (page2 >= totalPages - 1) {
      // Show last pages
      pages.push(1);
      if (totalPages > maxVisible) {
        pages.push("ellipsis");
      }
      for (
        let i = Math.max(1, totalPages - maxVisible + 1);
        i <= totalPages;
        i++
      ) {
        pages.push(i);
      }
    } else {
      // Show middle pages
      pages.push(1);
      pages.push("ellipsis");
      for (let i = page2 - 1; i <= Math.min(page2 + 1, totalPages); i++) {
        pages.push(i);
      }
      if (page2 + 1 < totalPages) {
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  }, [totalPages, page2]);

  const isLoading = !filteredPools;

  if (isLoading) return null;

  return (
    <PageWrapper>
      <HeroCard className={isDarkTheme ? "" : "light"}>
        <HeroHeadline>
          <div>
            <PanelTitle>Rewards earned</PanelTitle>
            <HeroCaption>
              Find pools that pay incentives and grow LP fees.
            </HeroCaption>
          </div>
          <HeroCTA>Collect rewards</HeroCTA>
        </HeroHeadline>
        <HeroCaption>
          Eligible pools have token rewards so you can earn more.
        </HeroCaption>
      </HeroCard>

      <LayoutGrid>
        <MainColumn>
          <Panel className={isDarkTheme ? "" : "light"}>
            <PanelHeader>
              <div>
                <PanelTitle>Your positions</PanelTitle>
                <PanelSubtitle>
                  Provide liquidity to start earning fees and on-chain rewards.
                </PanelSubtitle>
              </div>
              <HeroCTA onClick={() => navigate("/pool/create")}>
                New position
              </HeroCTA>
            </PanelHeader>

            {activeAccount ? (
              <>
                <UserStatsGrid className={isDarkTheme ? "" : "light"}>
                  <StatItem>
                    <StatLabel>Positions</StatLabel>
                    <StatValue>{filteredPositions.length}</StatValue>
                  </StatItem>
                </UserStatsGrid>

                {filteredPositions.length > 0 ? (
                  <>
                    <PoolPosition
                      positions={currentPositions}
                      value={rewardsEarned}
                      showing={currentPositions.length}
                      tokens={tokens || ([] as any[])}
                      onFilter={(v) => {
                        setFilter2(v);
                        setPage2(1);
                      }}
                    />
                    {totalPages > 1 && (
                      <PaginationContainer
                        className={isDarkTheme ? "" : "light"}
                      >
                        <PaginationButton
                          disabled={page2 === 1}
                          onClick={() => setPage2(page2 - 1)}
                          className={isDarkTheme ? "" : "light"}
                        >
                          <span className="pagination-text-full">Previous</span>
                          <span className="pagination-text-short">Prev</span>
                        </PaginationButton>
                        {getPageNumbers.map((pageItem, index) => {
                          if (pageItem === "ellipsis") {
                            return (
                              <span
                                key={`ellipsis-${index}`}
                                style={{
                                  padding: "0 4px",
                                  color: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.5)"
                                    : "rgba(12, 12, 16, 0.5)",
                                  fontSize: "14px",
                                }}
                              >
                                ...
                              </span>
                            );
                          }
                          return (
                            <PaginationButton
                              key={pageItem}
                              active={page2 === pageItem}
                              onClick={() => setPage2(pageItem as number)}
                              className={isDarkTheme ? "" : "light"}
                            >
                              {pageItem}
                            </PaginationButton>
                          );
                        })}
                        <PaginationButton
                          disabled={page2 === totalPages}
                          onClick={() => setPage2(page2 + 1)}
                          className={isDarkTheme ? "" : "light"}
                        >
                          Next
                        </PaginationButton>
                      </PaginationContainer>
                    )}
                  </>
                ) : (
                  <EmptyState className={isDarkTheme ? "" : "light"}>
                    You don't have liquidity positions yet. Create one to see it
                    here.
                  </EmptyState>
                )}
              </>
            ) : (
              <EmptyState className={isDarkTheme ? "" : "light"}>
                Connect a wallet to see existing positions or create a new one.
              </EmptyState>
            )}
          </Panel>
        </MainColumn>

        <SideColumn>
          <Panel className={isDarkTheme ? "" : "light"}>
            <PanelHeader>
              <div>
                <PanelTitle>Pools with rewards</PanelTitle>
                <PanelSubtitle>
                  APR includes token incentives if available.
                </PanelSubtitle>
              </div>
            </PanelHeader>
            <SimpleList>
              {rewardPools.length ? (
                rewardPools.map((pool) => (
                  <SimpleListRow
                    key={`reward-${pool.contractId}`}
                    className={isDarkTheme ? "" : "light"}
                  >
                    <SimpleListLabel>
                      {normalizeSymbol(pool.symbolA, pool.tokAId)}/
                      {normalizeSymbol(pool.symbolB, pool.tokBId)}
                    </SimpleListLabel>
                    <SimpleListValue>
                      {formatAPR(String(pool.totalApr))}
                    </SimpleListValue>
                  </SimpleListRow>
                ))
              ) : (
                <PanelSubtitle>
                  No incentivized pools at the moment.
                </PanelSubtitle>
              )}
            </SimpleList>
          </Panel>

          <Panel className={isDarkTheme ? "" : "light"}>
            <PanelHeader>
              <div>
                <PanelTitle>Top pools by TVL</PanelTitle>
                <PanelSubtitle>
                  Most capitalized pools in the network.
                </PanelSubtitle>
              </div>
            </PanelHeader>
            <SimpleList>
              {topPoolsByTVL.map((pool) => (
                <SimpleListRow
                  key={`tvl-${pool.contractId}`}
                  className={isDarkTheme ? "" : "light"}
                >
                  <SimpleListLabel>
                    {normalizeSymbol(pool.symbolA, pool.tokAId)}/
                    {normalizeSymbol(pool.symbolB, pool.tokBId)}
                  </SimpleListLabel>
                  <SimpleListValue>
                    {formatUSD(Number(pool.tvl))}
                  </SimpleListValue>
                </SimpleListRow>
              ))}
            </SimpleList>
          </Panel>

          <Panel className={isDarkTheme ? "" : "light"}>
            <PanelHeader>
              <div>
                <PanelTitle>Top pools by Volume</PanelTitle>
                <PanelSubtitle>Highest 24h trading volume pools.</PanelSubtitle>
              </div>
            </PanelHeader>
            <SimpleList>
              {topPoolsByVolume.map((pool) => (
                <SimpleListRow
                  key={`volume-${pool.contractId}`}
                  className={isDarkTheme ? "" : "light"}
                >
                  <SimpleListLabel>
                    {normalizeSymbol(pool.symbolA, pool.tokAId)}/
                    {normalizeSymbol(pool.symbolB, pool.tokBId)}
                  </SimpleListLabel>
                  <SimpleListValue>
                    {formatUSD(Number(pool.vol))}
                  </SimpleListValue>
                </SimpleListRow>
              ))}
            </SimpleList>
          </Panel>
        </SideColumn>
      </LayoutGrid>

      <FullWidthStatsWrapper>
        <PoolStats />
      </FullWidthStatsWrapper>
    </PageWrapper>
  );
};

export default Pool;
