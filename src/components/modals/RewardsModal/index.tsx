import React, { FC, useEffect } from "react";
import { Dialog, DialogContent, Modal, Box, Tooltip } from "@mui/material";
import mstyled from "@emotion/styled";
import styled from "styled-components";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../store/store";
import { RewardTransfer, markRewardsAsSeen, selectCurrentAddress } from "../../../store/rewardsSlice";
import { tokenSymbol } from "../../../utils/dex";
import { selectTokens } from "../../../store/tokenSlice";
import { useWallet } from "@txnlab/use-wallet-react";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ReactConfetti from "react-confetti";
import { useWindowSize } from "react-use";

const CustomDialog = mstyled(Dialog)(({ theme }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return {
    "& .MuiDialog-paper": {
      borderRadius: "24px",
      overflow: "hidden",
      border: `1px solid ${
        isDarkTheme
          ? "rgba(255, 255, 255, 0.15)"
          : "rgba(41, 88, 255, 0.15)"
      }`,
      boxShadow: isDarkTheme
        ? "0px 4px 10px 0px rgba(255, 255, 255, 0.20)"
        : "0px 4px 10px 0px rgba(0, 0, 0, 0.10)",
      position: "relative",
      zIndex: 1400,
      margin: "16px",
      width: "calc(100% - 32px)",
      maxWidth: "500px",
      maxHeight: "90vh",
      display: "flex",
      flexDirection: "column",
    },
    "& .MuiDialogContent-root": {
      padding: 0,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      flex: 1,
    },
    "& .MuiBackdrop-root": {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(8px)",
    },
  };
});

const ModalBodyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;

  @media (max-width: 480px) {
    padding: 24px 16px 32px;
    max-height: 90vh;
    overflow-y: auto;
  }
`;

const ModalBody = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;

  @media (max-width: 480px) {
    gap: 20px;
  }
`;

const ModalTitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const ModalTitle = styled.div<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  font-family: "Plus Jakarta Sans";
  font-size: 28px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%;
  letter-spacing: -1px;
  text-align: center;
`;

const RewardItem = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(41, 88, 255, 0.15)"};
  background: ${(props) =>
    props.isDarkTheme
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(41, 88, 255, 0.05)"};
  width: 100%;
`;

const RewardAmount = styled.div<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#FFFFFF" : "#0c0c10")};
  font-family: "Plus Jakarta Sans";
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RewardTime = styled.div<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#9CA3AF" : "#6B7280")};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-weight: 400;
`;

const RewardLink = styled.a<{ isDarkTheme: boolean }>`
  color: ${(props) => (props.isDarkTheme ? "#6366F1" : "#4F46E5")};
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  &:hover {
    text-decoration: underline;
  }
`;

const ButtonContainer = styled.div<{ isDarkTheme: boolean }>`
  cursor: pointer;
  display: flex;
  padding: 16px 24px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: 20px;
  background: ${(props) => (props.isDarkTheme ? "#6366F1" : "#4F46E5")};
  margin-top: 8px;
  @media (max-width: 480px) {
    padding: 14px 20px;
  }
`;

const ButtonLabel = styled.div`
  color: #fff;
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-weight: 700;
  line-height: 120%;

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const TokenIcon = styled.img`
  height: 32px;
  width: 32px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const RewardsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
`;

interface RewardsModalProps {
  open: boolean;
  handleClose: () => void;
  rewards: RewardTransfer[];
}

const RewardsModal: React.FC<RewardsModalProps> = ({
  open,
  handleClose,
  rewards,
}) => {
  const dispatch = useDispatch();
  const { activeAccount } = useWallet();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const tokens = useSelector(selectTokens);
  const currentAddress = useSelector(selectCurrentAddress);
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = React.useState(true);

  // Get WAD token info (contractId 47138068)
  const rewardToken = tokens.find((t) => t.contractId === 47138068);
  const rewardTokenSymbol = rewardToken
    ? tokenSymbol(rewardToken, true)
    : "WAD";

  React.useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleCloseAndMarkSeen = () => {
    // Get the address to mark rewards for (use active account or current address from store)
    const address = activeAccount?.address || currentAddress;
    
    if (!address) {
      handleClose();
      return;
    }
    
    // Mark all displayed rewards as seen
    const rewardIds = rewards.map((reward) => {
      return reward.txId || reward.transactionId || reward.id || "";
    }).filter(Boolean);
    
    if (rewardIds.length > 0) {
      dispatch(markRewardsAsSeen({ address, rewardIds }));
    }
    
    handleClose();
  };

  const formatAmount = (reward: RewardTransfer): string => {
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

  const formatTime = (reward: RewardTransfer): string => {
    const timestamp = reward.timestamp || reward.time || reward.roundTime;
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTxId = (reward: RewardTransfer): string | null => {
    return reward.txId || reward.transactionId || reward.id || null;
  };

  return (
    <>
      {open && showConfetti && (
        <ReactConfetti
          width={width}
          height={height}
          numberOfPieces={200}
          recycle={false}
          colors={
            isDarkTheme
              ? ["#FFBE1D", "#9933FF", "#FFFFFF"]
              : ["#9933FF", "#41137E", "#FFBE1D"]
          }
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 1500,
            pointerEvents: "none",
          }}
        />
      )}

      <CustomDialog
        open={open}
        onClose={handleCloseAndMarkSeen}
        BackdropProps={{
          style: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
          },
        }}
        fullWidth
      >
        <DialogContent
          sx={{
            background: isDarkTheme ? "#050507" : "#ffffff",
            position: "relative",
            zIndex: 1600,
          }}
        >
          <ModalBodyContainer>
            <ModalBody>
              <ModalTitleContainer>
                <ModalTitle isDarkTheme={isDarkTheme}>
                  🎉 New Rewards Received!
                </ModalTitle>
              </ModalTitleContainer>

              <RewardsList>
                {rewards.map((reward, index) => {
                  const txId = getTxId(reward);
                  return (
                    <RewardItem key={index} isDarkTheme={isDarkTheme}>
                      <RewardAmount isDarkTheme={isDarkTheme}>
                        {rewardToken && (
                          <TokenIcon
                            src={`https://asset-verification.nautilus.sh/icons/${rewardToken.contractId === 390001 ? 0 : rewardToken.contractId}.png`}
                            alt={rewardTokenSymbol}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://asset-verification.nautilus.sh/icons/0.png";
                            }}
                          />
                        )}
                        {formatAmount(reward)} {rewardTokenSymbol}
                      </RewardAmount>
                      <RewardTime isDarkTheme={isDarkTheme}>
                        {formatTime(reward)}
                      </RewardTime>
                      {txId && (
                        <RewardLink
                          href={`https://voiager.xyz/transaction/${txId}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          isDarkTheme={isDarkTheme}
                        >
                          View on Explorer →
                        </RewardLink>
                      )}
                    </RewardItem>
                  );
                })}
              </RewardsList>

              <ButtonContainer
                isDarkTheme={isDarkTheme}
                onClick={handleCloseAndMarkSeen}
              >
                <ButtonLabel>Got it!</ButtonLabel>
              </ButtonContainer>
            </ModalBody>
          </ModalBodyContainer>
        </DialogContent>
      </CustomDialog>
    </>
  );
};

export default RewardsModal;

