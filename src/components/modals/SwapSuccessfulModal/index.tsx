import React, { FC, useEffect, useState } from "react";
import { Dialog, DialogContent, Modal, Box, Tooltip } from "@mui/material";
import mstyled from "@emotion/styled";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import ReactConfetti from "react-confetti";
import { useWindowSize } from "react-use";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import axios from "axios";

const CustomDialog = mstyled(Dialog)(({ theme }) => {
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return {
    "& .MuiDialog-paper": {
      borderRadius: "24px",
      overflow: "hidden",
      border:
        "1px solid var(--Color-Neutral-Stroke-Primary, rgba(255, 255, 255, 0.80))",
      boxShadow: "0px 4px 10px 0px rgba(255, 255, 255, 0.20)",
      position: "relative",
      zIndex: 1400,
      margin: "16px",
      width: "calc(100% - 32px)",
      maxWidth: "480px",
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
  gap: var(--Spacing-900, 32px);
  width: 100%;

  @media (max-width: 480px) {
    gap: 24px;
  }
`;

const ModalTitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const ModalTitle = styled.div`
  color: var(--Color-Neutral-Element-Primary, #0c0c10);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;

  /* Heading/Display 1 */
  font-family: "Plus Jakarta Sans";
  font-size: 32px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 38.4px */
  letter-spacing: -1px;
  &.dark {
    color: #fff;
  }
`;

const Button = styled.div`
  cursor: pointer;
`;

const ButtonContainer = styled(Button)`
  display: flex;
  padding: var(--Spacing-700, 16px) var(--Spacing-800, 24px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: var(--Radius-750, 20px);
  background: var(--Color-Accent-CTA-Background-Default, #2958ff);
  margin-bottom: 8px;
  @media (max-width: 480px) {
    padding: 14px 20px;
  }
`;

const SecondaryButtonContainer = styled(ButtonContainer)`
  background: var(--Color-Accent-CTA-Background-Default, #ffbe1d);
`;

const ExplorerButtonContainer = styled(ButtonContainer)`
  background: blueviolet;
  margin-bottom: 0;
`;

const ButtonBody = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
`;

const ButtonLabel = styled.div`
  color: var(--Color-Brand-White, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 22px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%;

  @media (max-width: 480px) {
    font-size: 18px;
  }
`;

const SwapInfoContainer = styled.div`
  width: 100%;
  max-width: 420px;

  @media (max-width: 480px) {
    max-width: 100%;
  }
`;

const SwapInContainer = styled.div`
  padding: 24px 20px;

  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const SwapOutContainer = styled.div`
  padding: 24px 20px;

  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const SwapInContentContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  align-self: stretch;
`;

const SwapOutContentContainer = styled.div`
  display: flex;
  width: 100%;
  padding: 28px var(--Spacing-900, 32px) 16px 20px;
  padding-bottom: 28px;
  padding-left: 7px;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  flex-shrink: 0;
  border-radius: 0px 0px 26px 26px;
`;

const SwapOutContent = styled.div`
  display: flex;
  height: 22px;
  justify-content: space-between;
  align-items: flex-start;
  align-self: stretch;
`;

const SwapInTokenContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SwapInTokenLabel = styled.div`
  color: var(--Brand-Black, #000);
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%;
  display: flex;
  align-items: center;
  gap: 8px;
  &.dark {
    color: #fff;
  }
`;

const SwapInValueContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-end;
  gap: 16px;
`;

const SwapInValue = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
`;

const SwapInLabel = styled.div`
  color: #000;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 32px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 38.4px */
  letter-spacing: -1px;
  &.dark {
    color: #fff;
  }
`;

const TokenIcon = styled.img`
  height: 32px;
  width: 32px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const TokenIconFallback = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ffbe1d;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

interface TokenInfo {
  contractId: number;
  tokenId: string;
  verified: number;
  name: string;
  symbol: string;
}

interface ModalPatterProps {
  theme: "light" | "dark";
}

const ModalPattern: FC<ModalPatterProps> = ({ theme }) => {
  return theme == "light" ? (
    <svg
      width="630"
      height="140"
      viewBox="0 0 630 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_392_56109)">
        <rect
          width="1004.73"
          height="424.171"
          transform="matrix(-0.999755 0.022148 0.022148 0.999755 807.602 -306.385)"
          fill="#F1EAFC"
        />
        <path
          d="M498.711 155.122C488.645 164.736 476.703 172.371 463.567 177.589C450.431 182.808 436.358 185.508 422.153 185.537C407.947 185.565 393.886 182.921 380.772 177.754C367.659 172.588 355.751 165.001 345.726 155.427C335.702 145.853 327.759 134.479 322.35 121.954C316.941 109.43 314.173 95.9999 314.202 82.4316"
          stroke="#D4A0FF"
          stroke-width="50"
        />
        <path
          d="M422.583 -39.7873C436.782 -39.8157 450.837 -37.1732 463.945 -32.0107C477.052 -26.8482 488.955 -19.2668 498.975 -9.69936C508.995 -0.131907 516.934 11.2342 522.341 23.75C527.747 36.2659 530.515 49.6863 530.485 63.2451"
          stroke="#FFBE1D"
          stroke-width="50"
        />
        <path
          d="M97.6156 63.9013C97.6453 50.3292 100.473 36.8844 105.937 24.3346C111.402 11.7848 119.395 0.375719 129.462 -9.24119C139.529 -18.8581 151.473 -26.4945 164.61 -31.7145C177.747 -36.9344 191.821 -39.6356 206.028 -39.6639C220.235 -39.6922 234.298 -37.0469 247.412 -31.8792C260.526 -26.7115 272.436 -19.1226 282.461 -9.54563C292.486 0.0313027 300.43 11.4086 305.84 23.9368C311.249 36.465 314.018 49.8986 313.989 63.4707"
          stroke="#41137E"
          stroke-width="50"
        />
      </g>
      <defs>
        <clipPath id="clip0_392_56109">
          <rect
            width="1004.73"
            height="424.171"
            fill="white"
            transform="matrix(-0.999755 0.022148 0.022148 0.999755 807.602 -306.385)"
          />
        </clipPath>
      </defs>
    </svg>
  ) : (
    <svg
      width="630"
      height="140"
      viewBox="0 0 630 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_392_57147)">
        <rect
          width="1004.73"
          height="424.171"
          transform="matrix(-0.999755 0.022148 0.022148 0.999755 807.602 -306.385)"
          fill="#291C47"
        />
        <path
          d="M498.711 155.122C488.645 164.736 476.703 172.371 463.567 177.589C450.431 182.808 436.358 185.508 422.152 185.537C407.946 185.565 393.885 182.921 380.772 177.754C367.659 172.588 355.75 165.001 345.726 155.427C335.702 145.853 327.759 134.479 322.35 121.954C316.941 109.43 314.172 95.9999 314.202 82.4316"
          stroke="#D4A0FF"
          stroke-width="50"
        />
        <path
          d="M422.583 -39.7873C436.783 -39.8157 450.837 -37.1732 463.945 -32.0107C477.052 -26.8482 488.956 -19.2668 498.975 -9.69936C508.995 -0.131907 516.935 11.2342 522.341 23.75C527.748 36.2659 530.515 49.6863 530.485 63.2451"
          stroke="#FFBE1D"
          stroke-width="50"
        />
        <path
          d="M97.6157 63.9013C97.6454 50.3292 100.473 36.8844 105.937 24.3346C111.402 11.7848 119.396 0.375719 129.463 -9.24119C139.53 -18.8581 151.473 -26.4945 164.61 -31.7145C177.747 -36.9344 191.821 -39.6356 206.028 -39.6639C220.235 -39.6922 234.298 -37.0469 247.412 -31.8792C260.527 -26.7115 272.436 -19.1226 282.461 -9.54563C292.486 0.0313027 300.431 11.4086 305.84 23.9368C311.249 36.465 314.018 49.8986 313.989 63.4707"
          stroke="#41137E"
          stroke-width="50"
        />
      </g>
      <defs>
        <clipPath id="clip0_392_57147">
          <rect
            width="1004.73"
            height="424.171"
            fill="white"
            transform="matrix(-0.999755 0.022148 0.022148 0.999755 807.602 -306.385)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

const SmileIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="46"
      height="16"
      viewBox="0 0 46 16"
      fill="none"
    >
      <path
        d="M45.8925 6.64615C39.5267 12.1234 31.4274 15.1702 23.0299 15.2466C14.6324 15.323 6.47905 12.424 0.0146484 7.06353L1.35453 5.44773C7.43723 10.4917 15.1092 13.2195 23.0108 13.1476C30.9125 13.0757 38.5336 10.2088 44.5235 5.055L45.8925 6.64615Z"
        fill="#0C0C10"
      />
      <path
        d="M45.9853 2.09147C39.6195 7.5687 31.5202 10.6155 23.1227 10.6919C14.7252 10.7683 6.57182 7.86936 0.107422 2.50885L1.4473 0.893042C7.53 5.93703 15.202 8.66479 23.1036 8.5929C31.0053 8.52102 38.6263 5.65413 44.6162 0.500309L45.9853 2.09147Z"
        fill="#141010"
      />
    </svg>
  );
};

const SwapIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="27"
      height="25"
      viewBox="0 0 27 25"
      fill="none"
    >
      <path
        d="M5.28886 10.8661L3.39155 8.96875L1.50513 10.8661"
        stroke="white"
        stroke-width="1.63562"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.7104 13.6309L23.6078 15.5282L25.5051 13.6309"
        stroke="white"
        stroke-width="1.63562"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.5968 14.7774V12.2476C23.5968 6.66471 19.0716 2.15039 13.4995 2.15039C10.3155 2.15039 7.46955 3.63339 5.61584 5.93416"
        stroke="white"
        stroke-width="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.40247 9.71875V12.2485C3.40247 17.8314 7.92768 22.3458 13.4997 22.3458C16.6837 22.3458 19.5297 20.8628 21.3834 18.562"
        stroke="white"
        stroke-width="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface SwapSuccessfulModalProps {
  open: boolean;
  handleClose: () => void;
  poolId?: number;
  swapIn: string;
  swapOut: string;
  tokIn: string;
  tokOut: string;
  txId: string;
}

const SwapSuccessfulModal: React.FC<SwapSuccessfulModalProps> = ({
  open,
  handleClose,
  poolId,
  swapIn,
  swapOut,
  tokIn,
  tokOut,
  txId,
}) => {
  const [tokInInfo, setTokInInfo] = useState<TokenInfo | null>(null);
  const [tokOutInfo, setTokOutInfo] = useState<TokenInfo | null>(null);
  const navigate = useNavigate();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      axios
        .get(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?includes=all`
        )
        .then(({ data }) => {
          const tokInData = data.tokens.find(
            (t: TokenInfo) => t.symbol === tokIn
          );
          const tokOutData = data.tokens.find(
            (t: TokenInfo) => t.symbol === tokOut
          );
          setTokInInfo(tokInData);
          setTokOutInfo(tokOutData);
        });
    }
  }, [open, tokIn, tokOut]);

  const renderTokenIcon = (token: TokenInfo | null, symbol: string) => {
    if (symbol === "VOI") {
      return (
        <Tooltip title="Voi" placement="top" arrow>
          <TokenIcon
            src={`https://asset-verification.nautilus.sh/icons/0.png`}
            alt="VOI icon"
          />
        </Tooltip>
      );
    }

    if (token?.verified || 0 > 0) {
      return (
        <Tooltip title={token?.name} placement="top" arrow>
          <TokenIcon
            src={`https://asset-verification.nautilus.sh/icons/${token?.contractId}.png`}
            alt={`${token?.symbol} icon`}
          />
        </Tooltip>
      );
    }

    return (
      <TokenIconFallback>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12.6187 7.38128C12.9604 7.72299 12.9604 8.27701 12.6187 8.61872L8.61872 12.6187C8.27701 12.9604 7.72299 12.9604 7.38128 12.6187C7.03957 12.277 7.03957 11.723 7.38128 11.3813L11.3813 7.38128C11.723 7.03957 12.277 7.03957 12.6187 7.38128Z"
            fill="#56566E"
          />
          {/* ... rest of the path data ... */}
        </svg>
      </TokenIconFallback>
    );
  };

  const handleExplorerClick = () => {
    window.open(
      `https://block.voi.network/explorer/transaction/${txId}/arguments`,
      "_blank"
    );
  };

  const renderTokenLabel = (
    symbol: string,
    isVerified: boolean,
    isDarkTheme: boolean
  ) => (
    <SwapInTokenLabel className={isDarkTheme ? "dark" : "light"}>
      <span>{symbol}</span>
      {isVerified && (
        <VerifiedUserIcon
          fontSize="small"
          sx={{
            color: symbol === "VOI" ? "gold" : "inherit",
            verticalAlign: "middle",
          }}
        />
      )}
    </SwapInTokenLabel>
  );

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
        onClose={handleClose}
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
            background: isDarkTheme ? "#000" : "#fff",
            position: "relative",
            zIndex: 1600,
          }}
        >
          <ModalPattern theme={isDarkTheme ? "dark" : "light"} />
          <ModalBodyContainer>
            <ModalBody>
              <ModalTitleContainer>
                <SmileIcon />
                <ModalTitle className={isDarkTheme ? "dark" : "light"}>
                  Swap Successful
                </ModalTitle>
              </ModalTitleContainer>
              <SwapInfoContainer>
                <SwapInContainer>
                  <SwapInContentContainer>
                    <SwapInTokenContainer>
                      {renderTokenIcon(tokInInfo, tokIn)}
                      {renderTokenLabel(
                        tokIn,
                        (tokInInfo?.verified || 0) > 0 || tokIn === "VOI",
                        isDarkTheme
                      )}
                    </SwapInTokenContainer>
                    <SwapInValueContainer>
                      <SwapInValue>
                        <SwapInLabel className={isDarkTheme ? "dark" : "light"}>
                          {swapIn}
                        </SwapInLabel>
                      </SwapInValue>
                    </SwapInValueContainer>
                  </SwapInContentContainer>
                </SwapInContainer>
                <SwapOutContainer>
                  <SwapOutContentContainer>
                    <SwapOutContent>
                      <SwapInTokenContainer>
                        {renderTokenIcon(tokOutInfo, tokOut)}
                        {renderTokenLabel(
                          tokOut,
                          (tokOutInfo?.verified || 0) > 0 || tokOut === "VOI",
                          isDarkTheme
                        )}
                      </SwapInTokenContainer>
                      <SwapInValueContainer>
                        <SwapInValue>
                          <SwapInLabel
                            className={isDarkTheme ? "dark" : "light"}
                          >
                            {swapOut}
                          </SwapInLabel>
                        </SwapInValue>
                      </SwapInValueContainer>
                    </SwapOutContent>
                  </SwapOutContentContainer>
                </SwapOutContainer>
              </SwapInfoContainer>
              <ButtonContainer onClick={handleClose}>
                <ButtonBody>
                  <ButtonLabel>Go back to swap</ButtonLabel>
                  <SwapIcon />
                </ButtonBody>
              </ButtonContainer>
              <SecondaryButtonContainer
                onClick={() => {
                  navigate(`/pool/add?poolId=${poolId}`);
                }}
              >
                <ButtonBody>
                  <ButtonLabel>Add Liquidity</ButtonLabel>
                </ButtonBody>
              </SecondaryButtonContainer>
              <ExplorerButtonContainer onClick={handleExplorerClick}>
                <ButtonBody>
                  <ButtonLabel>View on Explorer</ButtonLabel>
                </ButtonBody>
              </ExplorerButtonContainer>
            </ModalBody>
          </ModalBodyContainer>
        </DialogContent>
      </CustomDialog>
    </>
  );
};

export default SwapSuccessfulModal;
