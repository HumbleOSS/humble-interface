import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { CircularProgress, Collapse } from "@mui/material";
import { selectTokens } from "../../store/tokenSlice";
import { tokenSymbol } from "../../utils/dex";
import { TOKEN_WVOI1 } from "../../constants/tokens";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

interface PriceData {
  tokenId: string;
  price: string;
  quoteTokenId: string;
  poolId: string;
  source: string;
  lastUpdated: number;
}

interface PricesResponse {
  prices: PriceData[];
  count: number;
  totalPrices: number;
  uniqueTokens: number;
  lastUpdated: number;
}

const Container = styled.div`
  margin: 0 auto;
  padding: 1.5rem;
  max-width: 1200px;
`;

const Title = styled.h1<{ isDarkTheme: boolean }>`
  font-size: 1.875rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const StatsCardWrapper = styled.div<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
`;

const StatsTitle = styled.h3<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#4B5563")};
  font-size: 0.875rem;
`;

const StatsValue = styled.div<{ isDarkTheme: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.5rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const StatsCard: React.FC<{
  title: string;
  value: string;
  isDarkTheme: boolean;
}> = ({ title, value, isDarkTheme }) => {
  return (
    <StatsCardWrapper isDarkTheme={isDarkTheme}>
      <StatsTitle isDarkTheme={isDarkTheme}>{title}</StatsTitle>
      <StatsValue isDarkTheme={isDarkTheme}>{value}</StatsValue>
    </StatsCardWrapper>
  );
};

const TableWrapper = styled.div<{ isDarkTheme: boolean }>`
  overflow-x: auto;
  background-color: ${(props) =>
    props.isDarkTheme ? "#1F2937" : "white"};
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);

  @media (max-width: 768px) {
    overflow-x: visible;
  }
`;

const Table = styled.table<{ isDarkTheme: boolean }>`
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;

  @media (max-width: 768px) {
    display: block;

    & thead {
      display: none;
    }

    & tbody {
      display: block;
    }

    & tr {
      display: block;
      margin-bottom: 1.5rem;
      border: 1px solid
        ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
      border-radius: 0.5rem;
      padding: 0.75rem;
    }

    & td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border: none;

      &::before {
        content: attr(data-label);
        font-weight: 600;
        margin-right: 1rem;
      }
    }
  }
`;

const TableHead = styled.thead<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#374151" : "#F9FAFB")};
`;

const TableHeader = styled.th<{ isDarkTheme: boolean }>`
  padding: 0.75rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const TableBody = styled.tbody<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#1F2937" : "white")};
  & > tr {
    border-bottom: 1px solid
      ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};

    &:hover {
      background-color: ${(props) =>
        props.isDarkTheme ? "#374151" : "#F3F4F6"};
    }
  }
`;

const ExpandableRow = styled.tr<{ isDarkTheme: boolean; isExpanded: boolean }>`
  cursor: pointer;
  background-color: ${(props) =>
    props.isExpanded
      ? props.isDarkTheme
        ? "#4B5563"
        : "#E5E7EB"
      : "transparent"};

  &:hover {
    background-color: ${(props) =>
      props.isDarkTheme ? "#374151" : "#F3F4F6"};
  }
`;

const ExpandIcon = styled.div<{ isDarkTheme: boolean }>`
  display: inline-flex;
  align-items: center;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  margin-left: 0.5rem;
`;

const ExpandedContent = styled.tr<{ isDarkTheme: boolean }>`
  background-color: ${(props) => (props.isDarkTheme ? "#111827" : "#F9FAFB")};
`;

const ExpandedCell = styled.td<{ isDarkTheme: boolean }>`
  padding: 1rem 1.5rem;
  padding-left: 3rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const ExpandedTable = styled.table<{ isDarkTheme: boolean }>`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
`;

const ExpandedTableHeader = styled.th<{ isDarkTheme: boolean }>`
  padding: 0.5rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  border-bottom: 1px solid
    ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
`;

const ExpandedTableCell = styled.td<{ isDarkTheme: boolean }>`
  padding: 0.75rem 1rem;
  white-space: nowrap;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 0.875rem;
  border-bottom: 1px solid
    ${(props) => (props.isDarkTheme ? "#374151" : "#E5E7EB")};
`;

const LoadingWrapper = styled.div<{ isDarkTheme: boolean }>`
  padding: 1rem;
  text-align: center;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  display: flex;
  justify-content: center;
  align-items: center;
`;

const EmptyMessage = styled.div<{ isDarkTheme: boolean }>`
  padding: 1rem;
  text-align: center;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-size: 0.875rem;
`;

const TableCell = styled.td<{ isDarkTheme: boolean }>`
  padding: 1rem 1.5rem;
  white-space: nowrap;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  font-size: 0.875rem;
`;

const TokenCell = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TokenIcon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const TokenInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const TokenSymbol = styled.span<{ isDarkTheme: boolean }>`
  font-weight: 500;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const TokenId = styled.span<{ isDarkTheme: boolean }>`
  font-size: 0.75rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const PriceCell = styled.div<{ isDarkTheme: boolean }>`
  font-family: monospace;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
`;

const ErrorMessage = styled.div<{ isDarkTheme: boolean }>`
  padding: 1rem;
  background-color: ${(props) => (props.isDarkTheme ? "#374151" : "#FEE2E2")};
  color: ${(props) => (props.isDarkTheme ? "#FCA5A5" : "#991B1B")};
  border-radius: 0.5rem;
  margin-bottom: 1rem;
`;

const Prices: React.FC = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const tokens = useSelector(selectTokens);
  const [pricesData, setPricesData] = useState<PricesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [quotePrices, setQuotePrices] = useState<
    Record<string, { data: PricesResponse | null; loading: boolean }>
  >({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          "https://humble-api.voi.nautilus.sh/prices?quoteTokenId=390001"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch prices");
        }
        const data: PricesResponse = await response.json();
        setPricesData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  const getTokenInfo = (tokenId: string) => {
    const tokenIdNum = Number(tokenId);
    const token = tokens.find(
      (t) => t.tokenId === tokenIdNum || t.contractId === tokenIdNum
    );
    return token;
  };

  const getTokenIconUrl = (tokenId: string) => {
    const tokenIdNum = Number(tokenId);
    if (tokenIdNum === 390001 || tokenIdNum === 0) {
      return "https://asset-verification.nautilus.sh/icons/0.png";
    }
    return `https://asset-verification.nautilus.sh/icons/${tokenIdNum}.png`;
  };

  const formatPrice = (price: string) => {
    // Price is in wei/smallest unit, need to format it
    const priceNum = Number(price);
    if (priceNum === 0) return "0";
    // Assuming 18 decimals for quote token (VOI)
    const formatted = priceNum / 1e18;
    if (formatted < 0.000001) {
      return formatted.toExponential(2);
    }
    return formatted.toFixed(6);
  };

  const handleTokenClick = async (tokenId: string) => {
    const isExpanded = expandedTokens.has(tokenId);
    
    if (isExpanded) {
      // Collapse
      const newExpanded = new Set(expandedTokens);
      newExpanded.delete(tokenId);
      setExpandedTokens(newExpanded);
    } else {
      // Expand - fetch prices for this token as quote
      setExpandedTokens(new Set([...expandedTokens, tokenId]));
      
      // Check if we already have the data
      if (!quotePrices[tokenId]) {
        setQuotePrices((prev) => ({
          ...prev,
          [tokenId]: { data: null, loading: true },
        }));

        try {
          const response = await fetch(
            `https://humble-api.voi.nautilus.sh/prices?quoteTokenId=${tokenId}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch quote prices");
          }
          const data: PricesResponse = await response.json();
          setQuotePrices((prev) => ({
            ...prev,
            [tokenId]: { data, loading: false },
          }));
        } catch (err) {
          setQuotePrices((prev) => ({
            ...prev,
            [tokenId]: { data: null, loading: false },
          }));
        }
      }
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Title isDarkTheme={isDarkTheme}>Prices</Title>
        <ErrorMessage isDarkTheme={isDarkTheme}>
          Error: {error}
        </ErrorMessage>
      </Container>
    );
  }

  if (!pricesData) {
    return (
      <Container>
        <Title isDarkTheme={isDarkTheme}>Prices</Title>
        <ErrorMessage isDarkTheme={isDarkTheme}>
          No price data available
        </ErrorMessage>
      </Container>
    );
  }

  // Filter out zero prices and sort by price (descending)
  const validPrices = pricesData.prices
    .filter((p) => p.price !== "0")
    .sort((a, b) => {
      const priceA = Number(a.price);
      const priceB = Number(b.price);
      return priceB - priceA;
    });

  return (
    <Container>
      <Title isDarkTheme={isDarkTheme}>Prices</Title>

      <StatsGrid>
        <StatsCard
          title="Total Prices"
          value={pricesData.totalPrices.toString()}
          isDarkTheme={isDarkTheme}
        />
        <StatsCard
          title="Unique Tokens"
          value={pricesData.uniqueTokens.toString()}
          isDarkTheme={isDarkTheme}
        />
        <StatsCard
          title="Active Pools"
          value={validPrices.length.toString()}
          isDarkTheme={isDarkTheme}
        />
      </StatsGrid>

      <TableWrapper isDarkTheme={isDarkTheme}>
        <Table isDarkTheme={isDarkTheme}>
          <TableHead isDarkTheme={isDarkTheme}>
            <tr>
              <TableHeader isDarkTheme={isDarkTheme}>Token</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Price (VOI)</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Pool ID</TableHeader>
              <TableHeader isDarkTheme={isDarkTheme}>Source</TableHeader>
            </tr>
          </TableHead>
          <TableBody isDarkTheme={isDarkTheme}>
            {validPrices.map((price) => {
              const token = getTokenInfo(price.tokenId);
              const symbol = token
                ? tokenSymbol(token)
                : `Token ${price.tokenId}`;
              const isExpanded = expandedTokens.has(price.tokenId);
              const quoteData = quotePrices[price.tokenId];
              const quotePricesList = quoteData?.data?.prices
                .filter((p) => p.price !== "0")
                .sort((a, b) => {
                  const priceA = Number(a.price);
                  const priceB = Number(b.price);
                  return priceB - priceA;
                }) || [];

              return (
                <React.Fragment key={`${price.tokenId}-${price.poolId}`}>
                  <ExpandableRow
                    isDarkTheme={isDarkTheme}
                    isExpanded={isExpanded}
                    onClick={() => handleTokenClick(price.tokenId)}
                  >
                    <TableCell isDarkTheme={isDarkTheme} data-label="Token">
                      <TokenCell>
                        <TokenIcon
                          src={getTokenIconUrl(price.tokenId)}
                          alt={symbol}
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://asset-verification.nautilus.sh/icons/0.png";
                          }}
                        />
                        <TokenInfo>
                          <TokenSymbol isDarkTheme={isDarkTheme}>
                            {symbol}
                          </TokenSymbol>
                          <TokenId isDarkTheme={isDarkTheme}>
                            ID: {price.tokenId}
                          </TokenId>
                        </TokenInfo>
                        <ExpandIcon isDarkTheme={isDarkTheme}>
                          {isExpanded ? (
                            <ExpandLessIcon fontSize="small" />
                          ) : (
                            <ExpandMoreIcon fontSize="small" />
                          )}
                        </ExpandIcon>
                      </TokenCell>
                    </TableCell>
                    <TableCell isDarkTheme={isDarkTheme} data-label="Price">
                      <PriceCell isDarkTheme={isDarkTheme}>
                        {formatPrice(price.price)}
                      </PriceCell>
                    </TableCell>
                    <TableCell isDarkTheme={isDarkTheme} data-label="Pool ID">
                      {price.poolId}
                    </TableCell>
                    <TableCell isDarkTheme={isDarkTheme} data-label="Source">
                      {price.source}
                    </TableCell>
                  </ExpandableRow>
                  {isExpanded && (
                    <ExpandedContent isDarkTheme={isDarkTheme}>
                      <ExpandedCell
                        isDarkTheme={isDarkTheme}
                        colSpan={4}
                      >
                        {quoteData?.loading ? (
                          <LoadingWrapper isDarkTheme={isDarkTheme}>
                            <CircularProgress size={20} />
                          </LoadingWrapper>
                        ) : quoteData?.data && quotePricesList.length > 0 ? (
                          <div>
                            <div
                              style={{
                                marginBottom: "0.75rem",
                                fontSize: "0.875rem",
                                fontWeight: 500,
                                color: isDarkTheme ? "#9CA3AF" : "#6B7280",
                              }}
                            >
                              Tokens priced in {symbol}:
                            </div>
                            <ExpandedTable isDarkTheme={isDarkTheme}>
                              <thead>
                                <tr>
                                  <ExpandedTableHeader isDarkTheme={isDarkTheme}>
                                    Token
                                  </ExpandedTableHeader>
                                  <ExpandedTableHeader isDarkTheme={isDarkTheme}>
                                    Price ({symbol})
                                  </ExpandedTableHeader>
                                  <ExpandedTableHeader isDarkTheme={isDarkTheme}>
                                    Pool ID
                                  </ExpandedTableHeader>
                                  <ExpandedTableHeader isDarkTheme={isDarkTheme}>
                                    Source
                                  </ExpandedTableHeader>
                                </tr>
                              </thead>
                              <tbody>
                                {quotePricesList.map((quotePrice) => {
                                  const quoteToken = getTokenInfo(
                                    quotePrice.tokenId
                                  );
                                  const quoteSymbol = quoteToken
                                    ? tokenSymbol(quoteToken)
                                    : `Token ${quotePrice.tokenId}`;

                                  return (
                                    <tr key={`${quotePrice.tokenId}-${quotePrice.poolId}`}>
                                      <ExpandedTableCell
                                        isDarkTheme={isDarkTheme}
                                      >
                                        <TokenCell>
                                          <TokenIcon
                                            src={getTokenIconUrl(
                                              quotePrice.tokenId
                                            )}
                                            alt={quoteSymbol}
                                            onError={(e) => {
                                              e.currentTarget.src =
                                                "https://asset-verification.nautilus.sh/icons/0.png";
                                            }}
                                          />
                                          <TokenInfo>
                                            <TokenSymbol isDarkTheme={isDarkTheme}>
                                              {quoteSymbol}
                                            </TokenSymbol>
                                            <TokenId isDarkTheme={isDarkTheme}>
                                              ID: {quotePrice.tokenId}
                                            </TokenId>
                                          </TokenInfo>
                                        </TokenCell>
                                      </ExpandedTableCell>
                                      <ExpandedTableCell
                                        isDarkTheme={isDarkTheme}
                                      >
                                        <PriceCell isDarkTheme={isDarkTheme}>
                                          {formatPrice(quotePrice.price)}
                                        </PriceCell>
                                      </ExpandedTableCell>
                                      <ExpandedTableCell
                                        isDarkTheme={isDarkTheme}
                                      >
                                        {quotePrice.poolId}
                                      </ExpandedTableCell>
                                      <ExpandedTableCell
                                        isDarkTheme={isDarkTheme}
                                      >
                                        {quotePrice.source}
                                      </ExpandedTableCell>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </ExpandedTable>
                          </div>
                        ) : (
                          <EmptyMessage isDarkTheme={isDarkTheme}>
                            No tokens found priced in {symbol}
                          </EmptyMessage>
                        )}
                      </ExpandedCell>
                    </ExpandedContent>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableWrapper>
    </Container>
  );
};

export default Prices;

