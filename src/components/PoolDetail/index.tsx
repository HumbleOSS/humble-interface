import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { CircularProgress } from "@mui/material";
import { selectTokens } from "../../store/tokenSlice";
import { getIconId } from "../../utils/dex";
import { TOKEN_WVOI1 } from "../../constants/tokens";
import { API_BASE_URL } from "../../constants/api";

const BLOCK_REWARD_ADJUSTMENT = 17.05 / 2; // block rewards for VOI pairs
import { useNavigate, useParams, Link } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import EmbeddedSwapWidget from "../EmbeddedSwapWidget";
import useDefiRewards from "../../hooks/useDefiRewards";
import { Tooltip } from "@mui/material";
import BigNumber from "bignumber.js";

interface PoolStatData {
  poolId: string;
  pool: {
    txid: string;
    poolId: string;
    tokA: string;
    tokB: string;
    lastRound: number;
  };
  poolInfo: {
    poolId: string;
    lptBals: {
      lpHeld: string;
      lpMinted: string;
    };
    poolBals: {
      A: string;
      B: string;
    };
    protoInfo: {
      protoFee: number;
      lpFee: number;
      totFee: number;
      protoAddr: string;
      locked: number;
    };
    protoBals: {
      A: string;
      B: string;
    };
    tokB: number;
    tokA: number;
    lastUpdated: number;
  };
  tokens: {
    tokenA: {
      assetId: string;
      name: string;
      unitName: string;
      symbol?: string;
      decimals: string;
      totalSupply: string;
      lastUpdated: number;
    };
    tokenB: {
      assetId: string;
      name: string;
      unitName: string;
      symbol?: string;
      decimals: string;
      totalSupply: string;
      lastUpdated: number;
    };
  };
  tvl: {
    usd: string;
    tokenA: {
      amount: string;
      normalized: number;
      usdValue: string;
    };
    tokenB: {
      amount: string;
      normalized: number;
      usdValue: string;
    };
  };
  volume: {
    "24h": {
      baseVolume: string;
      targetVolume: string;
      usdVolume: string;
    };
    "7d": {
      baseVolume: string;
      targetVolume: string;
      usdVolume: string;
    };
  };
  fees: {
    protocolFee: number;
    lpFee: number;
    totalFee: number;
    "24hFeesUSD": string;
    apr: string;
    apy?: string;
  };
  lastUpdated: number;
  [key: string]: any;
}

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0;
`;

const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const BreadcrumbLink = styled(Link)<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  text-decoration: none;
  font-size: 14px;
  &:hover {
    color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  }
`;

const BreadcrumbSeparator = styled.span<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-size: 14px;
`;

const BreadcrumbCurrent = styled.span<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  font-size: 14px;
  font-weight: 600;
`;

const PoolHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const PoolIconsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: -8px;
  position: relative;
`;

const PoolIconFirst = styled.img<{ isDarkTheme: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid ${(props) => (props.isDarkTheme ? "#1F2937" : "#FFFFFF")};
  background: ${(props) => (props.isDarkTheme ? "#1F2937" : "#FFFFFF")};
  position: relative;
  z-index: 2;
`;

const PoolIconSecond = styled.img<{ isDarkTheme: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid ${(props) => (props.isDarkTheme ? "#1F2937" : "#FFFFFF")};
  background: ${(props) => (props.isDarkTheme ? "#1F2937" : "#FFFFFF")};
  position: relative;
  margin-left: -16px;
  z-index: 1;
`;

const PoolInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PoolName = styled.h1<{ isDarkTheme: boolean }>`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExchangeRate = styled.div<{ isDarkTheme: boolean }>`
  font-size: 1rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RefreshIcon = styled.span`
  cursor: pointer;
  font-size: 16px;
  &:hover {
    opacity: 0.7;
  }
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 1200px) {
    grid-template-columns: 1fr 400px;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LiquidityCard = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 24px;
  padding: clamp(20px, 2vw, 28px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LiquidityLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LiquidityRight = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;

  @media (max-width: 768px) {
    align-items: flex-start;
  }
`;

const TotalLiquidityLabel = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-weight: 500;
`;

const TotalLiquidityValue = styled.div<{ isDarkTheme: boolean }>`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
`;

const LockedAssetsLabel = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-weight: 500;
  margin-top: 8px;
`;

const LockedAssetsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
`;

const LockedAssetItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: inherit;
`;

const TokenIconSmall = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
`;

const APYLabel = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-weight: 500;
`;

const APYValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #ec4899;
`;

const APYDescription = styled.div<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  margin-top: 4px;
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SwapButton = styled.button<{ isDarkTheme: boolean }>`
  width: 100%;
  padding: 16px 24px;
  border-radius: 16px;
  border: none;
  background: #ec4899;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const AddButton = styled.button<{ isDarkTheme: boolean }>`
  width: 100%;
  padding: 12px 24px;
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(41, 88, 255, 0.1)"};
  }
`;

const ManageButton = styled.button<{ isDarkTheme: boolean }>`
  width: 100%;
  padding: 12px 24px;
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(41, 88, 255, 0.1)"};
  }
`;

const InfoText = styled.p<{ isDarkTheme: boolean }>`
  font-size: 0.875rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  line-height: 1.6;
  margin: 0;
`;

const ExternalLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
`;

const ExternalLink = styled.a<{ isDarkTheme: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${(props) => (props.isDarkTheme ? "#6366F1" : "#4F46E5")};
  text-decoration: none;
  font-size: 0.875rem;
  &:hover {
    text-decoration: underline;
  }
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatsCard = styled.div<{ isDarkTheme: boolean }>`
  padding: 16px;
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(41, 88, 255, 0.12)"};
  background: ${(props) =>
    props.isDarkTheme
      ? "rgba(255, 255, 255, 0.03)"
      : "rgba(41, 88, 255, 0.03)"};
`;

const StatsTitle = styled.h3<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#4B5563")};
  font-size: 0.875rem;
  margin: 0 0 8px 0;
  font-weight: 500;
`;

const StatsValue = styled.div<{ isDarkTheme: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const TransactionsSection = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 24px;
  padding: clamp(20px, 2vw, 28px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
  margin-top: 24px;
`;

const TransactionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 16px;
`;

const TransactionsTitle = styled.h2<{ isDarkTheme: boolean }>`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TransactionFilters = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button<{ active: boolean; isDarkTheme: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid
    ${(props) =>
      props.active
        ? props.isDarkTheme
          ? "#6366F1"
          : "#4F46E5"
        : props.isDarkTheme
        ? "#374151"
        : "#D1D5DB"};
  background-color: ${(props) =>
    props.active
      ? props.isDarkTheme
        ? "#4F46E5"
        : "#6366F1"
      : props.isDarkTheme
      ? "#1F2937"
      : "white"};
  color: ${(props) =>
    props.active ? "#FFFFFF" : props.isDarkTheme ? "#9CA3AF" : "#4B5563"};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) =>
      props.active
        ? props.isDarkTheme
          ? "#6366F1"
          : "#4F46E5"
        : props.isDarkTheme
        ? "#374151"
        : "#F3F4F6"};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
`;

const SwapPanel = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 24px;
  padding: clamp(16px, 2vw, 20px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
  height: fit-content;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
`;

const IBuyVOIButton = styled.button<{ isDarkTheme: boolean }>`
  width: 100%;
  padding: 22px 40px;
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  &:hover {
    background: ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(41, 88, 255, 0.1)"};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const IBuyVOIIframe = styled.iframe`
  width: 100%;
  min-height: 500px;
  height: 600px;
  border: none;
  border-radius: 16px;
  display: block;
  margin-top: 24px;

  @media (max-width: 768px) {
    height: 500px;
    min-height: 400px;
  }
`;

const PoolDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const tokens = useSelector(selectTokens);
  const navigate = useNavigate();
  const { activeAccount } = useWallet();
  const [poolData, setPoolData] = useState<PoolStatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactionFilter, setTransactionFilter] = useState<
    "all" | "swap" | "add" | "remove"
  >("all");
  const [showIBuyVOIWidget, setShowIBuyVOIWidget] = useState<boolean>(false);
  const rewards = useDefiRewards();

  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        setLoading(true);
        // Try different API endpoint patterns
        const endpoints = [
          `${API_BASE_URL}pools/${id}/stats`,
          `${API_BASE_URL}pools/stats?poolId=${id}`,
        ];

        let data: PoolStatData | null = null;
        for (const url of endpoints) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const responseData = await response.json();
              // Handle different response formats
              if (Array.isArray(responseData)) {
                data = responseData[0] || null;
              } else if (
                responseData.stats &&
                Array.isArray(responseData.stats)
              ) {
                data = responseData.stats[0] || null;
              } else if (responseData.poolId || responseData.pool) {
                data = responseData as PoolStatData;
              }
              if (data) break;
            }
          } catch (err) {
            console.error(`Error fetching from ${url}:`, err);
          }
        }

        if (data) {
          setPoolData(data);
        }
      } catch (err) {
        console.error("Error fetching pool data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPoolData();
    }
  }, [id]);

  const normalizeSymbol = (
    symbol: string,
    tokenId?: string | number
  ): string => {
    if (!symbol) return symbol;
    const tokenIdNum = tokenId ? Number(tokenId) : null;
    const isVOI =
      tokenIdNum === 0 ||
      tokenIdNum === TOKEN_WVOI1 ||
      symbol.toUpperCase() === "WVOI" ||
      symbol.toUpperCase() === "VOI";
    if (isVOI) {
      return "VOI";
    }
    return symbol;
  };

  const getTokenIconUrl = (assetId: string | number) => {
    const assetIdNum = Number(assetId);
    if (!isNaN(assetIdNum)) {
      const iconId = getIconId(assetIdNum);
      return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
    }
    return "https://asset-verification.nautilus.sh/icons/0.png";
  };

  const formatCurrency = (value: string | number | undefined): string => {
    if (!value) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "$0.00";
    if (num === 0) return "$0.00";
    if (num < 0.01) {
      return `$${num.toFixed(6)}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: num > 1000000 ? "compact" : "standard",
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatNumber = (value: string | number | undefined): string => {
    if (!value) return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";
    if (num === 0) return "0";
    if (num < 0.000001) {
      return num.toExponential(2);
    }
    if (num < 1) {
      return num.toFixed(6);
    }
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
      notation: num > 1000000 ? "compact" : "standard",
    }).format(num);
  };

  const formatAPY = (value?: string | number): string => {
    const apyNumber = Number(value || 0);
    if (!apyNumber) return "0.00%";
    return `${apyNumber.toFixed(2)}%`;
  };

  const calculateExchangeRate = (): string => {
    if (!poolData) return "0";
    const poolInfo = poolData.poolInfo || {};
    const poolBals = poolInfo.poolBals || {};
    const balA = parseFloat(poolBals.A || "0");
    const balB = parseFloat(poolBals.B || "0");

    if (balA === 0 || balB === 0) return "0";
    const rate = balB / balA;
    return rate.toFixed(6);
  };

  // Find tokens in Redux store for Swap component
  const tokenAInStore = useMemo(() => {
    if (!poolData) return null;
    const tokAId = poolData.pool?.tokA || poolData.poolInfo?.tokA || "";
    const assetIdNum = Number(tokAId);
    if (!isNaN(assetIdNum)) {
      return tokens.find(
        (t) => t.tokenId === assetIdNum || t.contractId === assetIdNum
      );
    }
    return null;
  }, [poolData, tokens]);

  const tokenBInStore = useMemo(() => {
    if (!poolData) return null;
    const tokBId = poolData.pool?.tokB || poolData.poolInfo?.tokB || "";
    const assetIdNum = Number(tokBId);
    if (!isNaN(assetIdNum)) {
      return tokens.find(
        (t) => t.tokenId === assetIdNum || t.contractId === assetIdNum
      );
    }
    return null;
  }, [poolData, tokens]);

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </Container>
    );
  }

  if (!poolData) {
    return (
      <Container>
        <div>Pool not found</div>
      </Container>
    );
  }

  const tokenA = poolData.tokens?.tokenA || {};
  const tokenB = poolData.tokens?.tokenB || {};
  const tokAId = poolData.pool?.tokA || poolData.poolInfo?.tokA || "";
  const tokBId = poolData.pool?.tokB || poolData.poolInfo?.tokB || "";
  const symbolA = normalizeSymbol(
    tokenA.unitName || tokenA.symbol || "",
    tokAId
  );
  const symbolB = normalizeSymbol(
    tokenB.unitName || tokenB.symbol || "",
    tokBId
  );

  const tvl = poolData.tvl?.usd || "0";
  const tvlA = poolData.tvl?.tokenA || {};
  const tvlB = poolData.tvl?.tokenB || {};
  const apy = poolData.fees?.apy || poolData.fees?.apr || "0";
  const volume24h = poolData.volume?.["24h"]?.usdVolume || "0";
  const volume7d = poolData.volume?.["7d"]?.usdVolume || "0";
  const fees24h = poolData.fees?.["24hFeesUSD"] || "0";
  const exchangeRate = calculateExchangeRate();

  // Calculate LP fee percentage from protoInfo (lpFee is in basis points)
  const lpFeeBasisPoints = poolData.poolInfo?.protoInfo?.lpFee || 50;
  const lpFeePercentage = lpFeeBasisPoints / 100; // Convert basis points to percentage

  // Calculate DeFi boost and total APR
  const poolIdNum = Number(id);
  const reward = rewards.find(
    (r) =>
      r.poolId === poolIdNum ||
      `${r.poolId}` === `${poolIdNum}` ||
      `${r.poolId}` === `${id}`
  ) || {
    aprBoost: 0,
    blockReward: 0,
    additionalAprBoost: 0,
  };

  // Check for VOI pairs - VOI can be represented as 0 or 390001 (TOKEN_WVOI1)
  const tokAValues = [Number(tokAId), Number(tokBId)];
  const isVOIPair =
    tokAValues.includes(0) || tokAValues.includes(TOKEN_WVOI1);

  // Apply block reward adjustment for VOI pairs
  let blockReward = reward.blockReward || 0;
  if (isVOIPair) {
    blockReward = BLOCK_REWARD_ADJUSTMENT;
  }

  const baseApr = Number(apy || "0");
  const totalApr =
    baseApr +
    (reward.aprBoost || 0) +
    blockReward +
    (reward.additionalAprBoost || 0);

  const aprBreakdown = {
    baseApr,
    aprBoost: reward.aprBoost || 0,
    blockReward,
    additionalAprBoost: reward.additionalAprBoost || 0,
    totalApr,
  };

  const iconAUrl = getTokenIconUrl(tokAId);
  const iconBUrl = getTokenIconUrl(tokBId);

  // Calculate normalized amounts for locked assets
  const tokenADecimals = Number(tokenA.decimals || "6");
  const tokenBDecimals = Number(tokenB.decimals || "6");
  const lockedAmountA = tvlA.amount
    ? new BigNumber(tvlA.amount)
        .dividedBy(new BigNumber(10).pow(tokenADecimals))
        .toNumber()
    : 0;
  const lockedAmountB = tvlB.amount
    ? new BigNumber(tvlB.amount)
        .dividedBy(new BigNumber(10).pow(tokenBDecimals))
        .toNumber()
    : 0;

  return (
    <Container>
      <BreadcrumbContainer>
        <BreadcrumbLink to="/pool" isDarkTheme={isDarkTheme}>
          Pool
        </BreadcrumbLink>
        <BreadcrumbSeparator isDarkTheme={isDarkTheme}>/</BreadcrumbSeparator>
        <BreadcrumbCurrent isDarkTheme={isDarkTheme}>
          {symbolA}/{symbolB}
        </BreadcrumbCurrent>
      </BreadcrumbContainer>

      <PoolHeader>
        <PoolIconsWrapper>
          <PoolIconFirst
            isDarkTheme={isDarkTheme}
            src={iconAUrl}
            alt={symbolA}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://asset-verification.nautilus.sh/icons/0.png";
            }}
          />
          <PoolIconSecond
            isDarkTheme={isDarkTheme}
            src={iconBUrl}
            alt={symbolB}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://asset-verification.nautilus.sh/icons/0.png";
            }}
          />
        </PoolIconsWrapper>
        <PoolInfo>
          <PoolName isDarkTheme={isDarkTheme}>
            {symbolA} / {symbolB}
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 400,
                color: isDarkTheme ? "#9CA3AF" : "#6B7280",
              }}
            >
              {" "}
              v1
            </span>
          </PoolName>
          <ExchangeRate isDarkTheme={isDarkTheme}>
            {exchangeRate} {symbolB} per {symbolA}
            <RefreshIcon>↻</RefreshIcon>
          </ExchangeRate>
        </PoolInfo>
      </PoolHeader>

      <MainLayout>
        <LeftColumn>
          <LiquidityCard isDarkTheme={isDarkTheme}>
            <LiquidityLeft>
              <TotalLiquidityLabel isDarkTheme={isDarkTheme}>
                Total Liquidity
              </TotalLiquidityLabel>
              <TotalLiquidityValue isDarkTheme={isDarkTheme}>
                {formatCurrency(tvl)}
              </TotalLiquidityValue>
              <LockedAssetsLabel isDarkTheme={isDarkTheme}>
                Locked assets
              </LockedAssetsLabel>
              <LockedAssetsList>
                <LockedAssetItem>
                  <TokenIconSmall
                    src={iconAUrl}
                    alt={symbolA}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://asset-verification.nautilus.sh/icons/0.png";
                    }}
                  />
                  {formatNumber(lockedAmountA)} {symbolA}
                </LockedAssetItem>
                <LockedAssetItem>
                  <TokenIconSmall
                    src={iconBUrl}
                    alt={symbolB}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://asset-verification.nautilus.sh/icons/0.png";
                    }}
                  />
                  {formatNumber(lockedAmountB)} {symbolB}
                </LockedAssetItem>
              </LockedAssetsList>
            </LiquidityLeft>
            <LiquidityRight>
              <APYLabel isDarkTheme={isDarkTheme}>APY</APYLabel>
              <Tooltip
                title={
                  <div>
                    <p style={{ margin: "4px 0" }}>
                      <strong>Total APR: {totalApr.toFixed(2)}%</strong>
                    </p>
                    <p style={{ margin: "4px 0" }}>
                      Base Swap APR: {baseApr.toFixed(2)}%
                    </p>
                    {aprBreakdown.aprBoost > 0 && (
                      <p style={{ margin: "4px 0" }}>
                        DeFi Boost: {aprBreakdown.aprBoost.toFixed(2)}%
                      </p>
                    )}
                    {aprBreakdown.blockReward > 0 && (
                      <p style={{ margin: "4px 0" }}>
                        Block Rewards: {aprBreakdown.blockReward.toFixed(2)}%
                      </p>
                    )}
                    {aprBreakdown.additionalAprBoost > 0 && (
                      <p style={{ margin: "4px 0" }}>
                        Additional APR Boost:{" "}
                        {aprBreakdown.additionalAprBoost.toFixed(2)}%
                      </p>
                    )}
                  </div>
                }
                arrow
                placement="top"
              >
                <APYValue style={{ cursor: "help" }}>
                  {formatAPY(totalApr > 0 ? totalApr : apy)}
                </APYValue>
              </Tooltip>
              <APYDescription isDarkTheme={isDarkTheme}>
                This shows the 7-day average APY value of the pool.
                {(isVOIPair || aprBreakdown.aprBoost > 0 || aprBreakdown.additionalAprBoost > 0) && (
                  <span style={{ display: "block", marginTop: "4px" }}>
                    {isVOIPair && (aprBreakdown.aprBoost > 0 || aprBreakdown.additionalAprBoost > 0)
                      ? "Includes defi incentives and block rewards."
                      : isVOIPair
                      ? "Includes block rewards."
                      : "Includes defi incentives."}
                  </span>
                )}
              </APYDescription>
            </LiquidityRight>
          </LiquidityCard>

          <StatsSection>
            <StatsCard isDarkTheme={isDarkTheme}>
              <StatsTitle isDarkTheme={isDarkTheme}>Volume (24h)</StatsTitle>
              <StatsValue isDarkTheme={isDarkTheme}>
                {formatCurrency(volume24h)}
              </StatsValue>
            </StatsCard>
            <StatsCard isDarkTheme={isDarkTheme}>
              <StatsTitle isDarkTheme={isDarkTheme}>Volume (7d)</StatsTitle>
              <StatsValue isDarkTheme={isDarkTheme}>
                {formatCurrency(volume7d)}
              </StatsValue>
            </StatsCard>
            <StatsCard isDarkTheme={isDarkTheme}>
              <StatsTitle isDarkTheme={isDarkTheme}>Fees (24h)</StatsTitle>
              <StatsValue isDarkTheme={isDarkTheme}>
                {formatCurrency(fees24h)}
              </StatsValue>
            </StatsCard>
          </StatsSection>

          <TransactionsSection isDarkTheme={isDarkTheme}>
            <TransactionsHeader>
              <TransactionsTitle isDarkTheme={isDarkTheme}>
                <span>⇅</span> Transactions
              </TransactionsTitle>
              <TransactionFilters>
                <FilterButton
                  active={transactionFilter === "all"}
                  isDarkTheme={isDarkTheme}
                  onClick={() => setTransactionFilter("all")}
                >
                  All Transactions
                </FilterButton>
                <FilterButton
                  active={transactionFilter === "swap"}
                  isDarkTheme={isDarkTheme}
                  onClick={() => setTransactionFilter("swap")}
                >
                  Swap
                </FilterButton>
                <FilterButton
                  active={transactionFilter === "add"}
                  isDarkTheme={isDarkTheme}
                  onClick={() => setTransactionFilter("add")}
                >
                  Add
                </FilterButton>
                <FilterButton
                  active={transactionFilter === "remove"}
                  isDarkTheme={isDarkTheme}
                  onClick={() => setTransactionFilter("remove")}
                >
                  Remove
                </FilterButton>
              </TransactionFilters>
            </TransactionsHeader>
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: isDarkTheme ? "#9CA3AF" : "#6B7280",
              }}
            >
              No transactions available
            </div>
          </TransactionsSection>
        </LeftColumn>

        <RightColumn>
          <ActionButtons>
            <SwapButton
              isDarkTheme={isDarkTheme}
              onClick={() => navigate("/swap")}
            >
              SWAP
            </SwapButton>
            <AddButton
              isDarkTheme={isDarkTheme}
              onClick={() => navigate(`/pool/add?poolId=${id}`)}
            >
              ADD
            </AddButton>
            <ManageButton
              isDarkTheme={isDarkTheme}
              onClick={() => navigate(`/pool/remove?poolId=${id}`)}
            >
              MANAGE
            </ManageButton>
          </ActionButtons>

          <InfoText isDarkTheme={isDarkTheme}>
            By adding liquidity you'll earn {lpFeePercentage.toFixed(2)}% of all
            trades on this pair proportional to your share of the pool. Fees are
            added to the pool, accrue in real time and can be claimed by
            removing your liquidity.
          </InfoText>

          {/*<ExternalLinks>
            <ExternalLink
              href={`https://explorer.voi.network/application/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              isDarkTheme={isDarkTheme}
            >
              <span>→</span> View on Pera Explorer
            </ExternalLink>
            <ExternalLink
              href={`https://voiager.xyz/pool/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              isDarkTheme={isDarkTheme}
            >
              <span>→</span> View on Allo
            </ExternalLink>
          </ExternalLinks>*/}

          <SwapPanel isDarkTheme={isDarkTheme}>
            <EmbeddedSwapWidget defaultToken={tokenAInStore || undefined} />
          </SwapPanel>

          {activeAccount && (
            <>
              {!showIBuyVOIWidget ? (
                <IBuyVOIButton
                  isDarkTheme={isDarkTheme}
                  onClick={() => setShowIBuyVOIWidget(true)}
                >
                  <span>💳</span>
                  Buy VOI
                </IBuyVOIButton>
              ) : (
                <IBuyVOIIframe
                  src={`https://ibuyvoi.com/widget?destination=${activeAccount.address}&theme=${isDarkTheme ? "dark" : "light"}`}
                  title="VOI Purchase Widget"
                  allow="payment"
                />
              )}
            </>
          )}
        </RightColumn>
      </MainLayout>
    </Container>
  );
};

export default PoolDetail;
