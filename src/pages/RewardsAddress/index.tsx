import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { CircularProgress } from "@mui/material";
import { selectTokens } from "../../store/tokenSlice";
import { tokenSymbol, getIconId } from "../../utils/dex";
import { fetchRewards, selectRewards, selectRewardsStatus } from "../../store/rewardsSlice";
import { useWallet } from "@txnlab/use-wallet-react";
import { compactAddress } from "../../utils/mp";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "react-toastify";

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

const Header = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border-radius: 24px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
`;

const Title = styled.h1<{ isDarkTheme: boolean }>`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
`;

const AddressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Address = styled.div<{ isDarkTheme: boolean }>`
  font-family: monospace;
  font-size: 1rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

const CopyButton = styled.button<{ isDarkTheme: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#1F2937" : "#F3F4F6")};
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(41, 88, 255, 0.1)"};
  }
`;

const RewardsSection = styled.div<{ isDarkTheme: boolean }>`
  border-radius: 24px;
  padding: clamp(20px, 2vw, 28px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) => (props.isDarkTheme ? "#050507" : "#ffffff")};
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0c0c10")};
`;

const Table = styled.table<{ isDarkTheme: boolean }>`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th<{ isDarkTheme: boolean }>`
  padding: 12px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  border-bottom: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(12, 12, 16, 0.08)"};
`;

const TableCell = styled.td<{ isDarkTheme: boolean }>`
  padding: 12px;
  font-size: 0.875rem;
  color: ${(props) => (props.isDarkTheme ? "#F3F4F6" : "inherit")};
  border-bottom: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(12, 12, 16, 0.08)"};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
`;

const InfoLink = styled.a<{ isDarkTheme: boolean }>`
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

const TokenIcon = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-right: 8px;
`;

const AmountCell = styled.div`
  display: flex;
  align-items: center;
`;

const EmptyState = styled.div<{ isDarkTheme: boolean }>`
  text-align: center;
  padding: 3rem;
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
`;

export const RewardsAddress: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { activeAccount } = useWallet();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const tokens = useSelector(selectTokens);
  const rewards = useSelector(selectRewards);
  const rewardsStatus = useSelector(selectRewardsStatus);
  const [copiedText, copy] = useCopyToClipboard();

  // Get WAD token info (contractId 47138068)
  const rewardToken = tokens.find((t) => t.contractId === 47138068);
  const rewardTokenSymbol = rewardToken
    ? tokenSymbol(rewardToken, true)
    : "WAD";

  // Fetch rewards for the address
  useEffect(() => {
    if (address) {
      dispatch(fetchRewards({ userAddress: address }) as any);
    }
  }, [address, dispatch]);

  const handleCopy = (text: string) => () => {
    copy(text)
      .then(() => {
        toast.success("Copied to clipboard!");
      })
      .catch((error) => {
        toast.error("Failed to copy to clipboard!");
      });
  };

  const formatAmount = (reward: any): string => {
    const amount = reward.amount || reward.value || "0";
    const decimals = reward.decimals || rewardToken?.decimals || 6;
    const formattedAmount = (
      parseFloat(amount) / Math.pow(10, decimals)
    ).toLocaleString(undefined, {
      maximumFractionDigits: Math.min(6, decimals),
      minimumFractionDigits: 0,
    });
    return formattedAmount;
  };

  const formatTime = (reward: any): string => {
    const timestamp = reward.timestamp || reward.time || reward.roundTime;
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTxId = (reward: any): string | null => {
    return reward.txId || reward.transactionId || reward.id || null;
  };

  const getTokenIconUrl = () => {
    if (rewardToken) {
      const iconId = getIconId(rewardToken.contractId);
      return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
    }
    return "https://asset-verification.nautilus.sh/icons/0.png";
  };

  const isLoading = rewardsStatus === "loading";
  const displayAddress = address || "";

  return (
    <Container>
      <BreadcrumbContainer>
        <BreadcrumbLink to="/" isDarkTheme={isDarkTheme}>
          Home
        </BreadcrumbLink>
        <BreadcrumbSeparator isDarkTheme={isDarkTheme}>/</BreadcrumbSeparator>
        <BreadcrumbCurrent isDarkTheme={isDarkTheme}>
          Rewards
        </BreadcrumbCurrent>
      </BreadcrumbContainer>

      <Header isDarkTheme={isDarkTheme}>
        <Title isDarkTheme={isDarkTheme}>Rewards History</Title>
        <AddressContainer>
          <Address isDarkTheme={isDarkTheme}>
            {compactAddress(displayAddress)}
          </Address>
          <CopyButton
            isDarkTheme={isDarkTheme}
            onClick={handleCopy(displayAddress)}
            title="Copy address"
          >
            <ContentCopyIcon fontSize="small" />
          </CopyButton>
          {activeAccount?.address === displayAddress && (
            <span style={{ color: isDarkTheme ? "#10B981" : "#059669", fontSize: "0.875rem" }}>
              (Your Address)
            </span>
          )}
        </AddressContainer>
      </Header>

      <RewardsSection isDarkTheme={isDarkTheme}>
        {isLoading ? (
          <LoadingContainer>
            <CircularProgress />
          </LoadingContainer>
        ) : rewards.length > 0 ? (
          <Table isDarkTheme={isDarkTheme}>
            <thead>
              <tr>
                <TableHeader isDarkTheme={isDarkTheme}>Time</TableHeader>
                <TableHeader isDarkTheme={isDarkTheme}>Amount</TableHeader>
                <TableHeader isDarkTheme={isDarkTheme}>Transaction</TableHeader>
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward: any, index: number) => {
                const txId = getTxId(reward);
                return (
                  <tr key={index}>
                    <TableCell isDarkTheme={isDarkTheme}>
                      {formatTime(reward)}
                    </TableCell>
                    <TableCell isDarkTheme={isDarkTheme}>
                      <AmountCell>
                        <TokenIcon
                          src={getTokenIconUrl()}
                          alt={rewardTokenSymbol}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://asset-verification.nautilus.sh/icons/0.png";
                          }}
                        />
                        {formatAmount(reward)} {rewardTokenSymbol}
                      </AmountCell>
                    </TableCell>
                    <TableCell isDarkTheme={isDarkTheme}>
                      {txId ? (
                        <InfoLink
                          href={`https://voiager.xyz/transaction/${txId}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          isDarkTheme={isDarkTheme}
                        >
                          View on Explorer →
                        </InfoLink>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState isDarkTheme={isDarkTheme}>
            No rewards found for this address
          </EmptyState>
        )}
      </RewardsSection>
    </Container>
  );
};

