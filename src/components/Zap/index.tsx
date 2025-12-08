import React, { useState, useCallback, useEffect, useMemo, FC } from "react";
import {
  Box,
  Button,
  Card,
  List,
  ListItem,
  Typography,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Skeleton,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { useWallet } from "@txnlab/use-wallet-react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { ARC200TokenI } from "@/types";
import {
  getTokensWithTickers,
  selectTokens,
  selectTickers,
} from "@/store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { tokenSymbol, getIconId } from "@/utils/dex";
import TokenSelect from "../TokenSelect";
import { getAlgorandClients } from "@/wallets";
import { swap } from "ulujs";
import { TOKEN_WVOI1 } from "@/constants/tokens";
import BigNumber from "bignumber.js";
import algosdk from "algosdk";
import styled from "styled-components";
import mstyled from "@emotion/styled";
import ReactConfetti from "react-confetti";
import { useWindowSize } from "react-use";
import axios from "axios";
import { getAsaIdFromArc200Contract } from "@/config/arc200AsaMapping";
import useDefiRewards from "@/hooks/useDefiRewards";

const BLOCK_REWARD_ADJUSTMENT = 17.05 / 2; // block rewards for VOI pairs

// Helper function to normalize WVOI to VOI for symbol display
// Must be defined before components that use it
const normalizeSymbol = (
  symbol: string,
  tokenId?: string | number,
  contractId?: number
): string => {
  if (!symbol) return "";

  const id = typeof tokenId === "string" ? Number(tokenId) : tokenId;
  const cId = contractId;

  // Check if this is WVOI/VOI (by symbol or ID)
  const isVOI =
    symbol.toUpperCase() === "WVOI" ||
    symbol.toUpperCase() === "VOI" ||
    id === 0 ||
    id === 390001 ||
    cId === TOKEN_WVOI1 ||
    cId === 390001;

  if (isVOI) {
    return "VOI";
  }

  return symbol.toUpperCase();
};

// Modern Styled Components
const ZapRoot = styled.div<{ isDark?: boolean }>`
  display: flex;
  padding: var(--Spacing-1000, 40px);
  flex-direction: column;
  align-items: stretch;
  gap: var(--Spacing-800, 24px);
  border-radius: var(--Radius-800, 24px);
  max-width: 630px;
  width: 100%;
  margin: 0 auto;
  margin-top: var(--Spacing-800, 24px);
  position: relative;
  overflow: hidden;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 20px 16px;
    gap: 16px;
    margin-top: 16px;
    border-radius: 16px;
  }

  @media (max-width: 480px) {
    padding: 16px 12px;
    gap: 12px;
    margin-top: 12px;
  }

  ${(props) =>
    props.isDark
      ? `
    border: 1px solid rgba(65, 19, 126, 0.5);
    background: linear-gradient(
      135deg,
      rgba(41, 88, 255, 0.15),
      rgba(65, 19, 126, 0.25)
    ),
    var(--Color-Canvas-Transparent-white-950, #070709);
    box-shadow: 0px 20px 50px rgba(9, 9, 17, 0.5),
                0px 0px 0px 1px rgba(65, 19, 126, 0.3);
    backdrop-filter: blur(20px);
  `
      : `
    border: 1px solid rgba(41, 88, 255, 0.2);
    background: linear-gradient(
      135deg,
      rgba(41, 88, 255, 0.08),
      rgba(255, 255, 255, 0.95)
    );
    box-shadow: 0px 30px 60px rgba(41, 88, 255, 0.15),
                0px 0px 0px 1px rgba(41, 88, 255, 0.1);
  `}
`;

const ZapHeader = styled.div`
  width: 100%;
  text-align: center;
  margin-bottom: var(--Spacing-600, 16px);
`;

const ZapTitle = styled.h1<{ isDark?: boolean }>`
  color: var(--Color-Neutral-Element-Primary, #0c0c10);
  font-family: "Plus Jakarta Sans";
  font-size: 28px;
  font-weight: 800;
  line-height: 120%;
  margin: 0 0 8px 0;
  background: ${(props) =>
    props.isDark
      ? "linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.9) 100%)"
      : "linear-gradient(135deg, #0c0c10 0%, #2958ff 100%)"};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;

  @media (max-width: 768px) {
    font-size: 24px;
    margin: 0 0 6px 0;
  }

  @media (max-width: 480px) {
    font-size: 20px;
    margin: 0 0 4px 0;
  }

  ${(props) =>
    props.isDark &&
    `
    background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  `}
`;

const ZapSubtitle = styled.p<{ isDark?: boolean }>`
  color: var(--Color-Neutral-Element-Secondary, #7e7e9a);
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-weight: 400;
  line-height: 140%;
  margin: 0;

  @media (max-width: 480px) {
    font-size: 12px;
  }
`;

const StepContainer = styled.div`
  width: 100%;
  margin-bottom: var(--Spacing-800, 24px);
`;

const StepIndicatorContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--Spacing-600, 16px);
  gap: var(--Spacing-400, 8px);
  position: relative;

  @media (min-width: 768px) {
    justify-content: space-evenly;
  }

  @media (max-width: 480px) {
    gap: 4px;
    margin-bottom: 12px;
  }
`;

const StepCircle = styled.div<{
  isActive: boolean;
  isCompleted: boolean;
  isDark?: boolean;
}>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  z-index: 2;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  ${(props) =>
    props.isActive || props.isCompleted
      ? `
    background: linear-gradient(135deg, #2958ff 0%, #6f2ae2 100%);
    color: white;
    box-shadow: 0 4px 16px rgba(41, 88, 255, 0.4),
                0 0 0 4px ${
                  props.isDark
                    ? "rgba(41, 88, 255, 0.2)"
                    : "rgba(41, 88, 255, 0.1)"
                };
    transform: scale(1.05);
  `
      : `
    background: ${props.isDark ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB"};
    color: ${props.isDark ? "rgba(255, 255, 255, 0.4)" : "#9CA3AF"};
    border: 2px solid ${
      props.isDark ? "rgba(255, 255, 255, 0.1)" : "transparent"
    };
  `}

  &:hover {
    transform: ${(props) =>
      props.isActive || props.isCompleted ? "scale(1.08)" : "scale(1.05)"};
    box-shadow: ${(props) =>
      props.isActive || props.isCompleted
        ? "0 6px 20px rgba(41, 88, 255, 0.5), 0 0 0 4px rgba(41, 88, 255, 0.2)"
        : "0 4px 12px rgba(0, 0, 0, 0.15)"};
  }
`;

const StepLabel = styled.div<{ isActive: boolean; isDark?: boolean }>`
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
  font-weight: ${(props) => (props.isActive ? "700" : "400")};
  color: ${(props) =>
    props.isActive
      ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
      : props.isDark
      ? "rgba(255, 255, 255, 0.6)"
      : "var(--Color-Neutral-Element-Secondary, #7e7e9a)"};
  text-align: center;
  margin-top: var(--Spacing-200, 4px);
  line-height: 1.2;

  @media (max-width: 480px) {
    font-size: 10px;
    margin-top: 2px;
  }
`;

const StepItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 auto;
  position: relative;
  min-width: 100px;

  @media (min-width: 768px) {
    min-width: 150px;
    flex: 0 0 auto;
  }
`;

const ProgressBar = styled.div<{ progress: number; isDark?: boolean }>`
  position: absolute;
  top: 24px;
  left: 0;
  right: 0;
  height: 4px;
  background: ${(props) =>
    props.isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"};
  border-radius: 4px;
  z-index: 1;
  overflow: hidden;

  @media (max-width: 768px) {
    top: 20px;
  }

  @media (max-width: 480px) {
    top: 18px;
    height: 3px;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${(props) => props.progress}%;
    background: linear-gradient(90deg, #2958ff 0%, #6f2ae2 100%);
    border-radius: 4px;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 12px rgba(41, 88, 255, 0.5);
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

const ContentSection = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--Spacing-400, 8px);
  box-sizing: border-box;
  min-width: 0;

  @media (max-width: 480px) {
    gap: 8px;
  }
`;

const SectionTitle = styled.h2<{ isDark?: boolean }>`
  font-family: "Plus Jakarta Sans";
  font-size: 20px;
  font-weight: 700;
  line-height: 120%;
  margin: 0 0 var(--Spacing-400, 8px) 0;
  color: ${(props) =>
    props.isDark
      ? "var(--Color-Neutral-Element-Primary, #fff)"
      : "var(--Color-Neutral-Element-Primary, #0c0c10)"};
  letter-spacing: -0.3px;
  text-align: left;

  @media (max-width: 768px) {
    font-size: 18px;
    margin: 0 0 8px 0;
    text-align: center;
  }

  @media (max-width: 480px) {
    font-size: 16px;
    margin: 0 0 6px 0;
    text-align: center;
  }
`;

const PoolCard = styled.div<{ isSelected: boolean; isDark?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--Spacing-500, 12px);
  border-radius: var(--Radius-600, 16px);
  border: 2px solid
    ${(props) =>
      props.isSelected
        ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
        : props.isDark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(0, 0, 0, 0.08)"};
  background: ${(props) =>
    props.isSelected
      ? props.isDark
        ? "linear-gradient(135deg, rgba(41, 88, 255, 0.2), rgba(111, 42, 226, 0.15))"
        : "linear-gradient(135deg, rgba(41, 88, 255, 0.12), rgba(41, 88, 255, 0.06))"
      : props.isDark
      ? "rgba(255, 255, 255, 0.04)"
      : "rgba(255, 255, 255, 0.8)"};
  width: 100%;
  min-height: 56px;
  box-sizing: border-box;
  max-width: 100%;

  @media (max-width: 768px) {
    padding: 10px;
    border-radius: 12px;
    min-height: 52px;
  }

  @media (max-width: 480px) {
    padding: 8px;
    border-radius: 10px;
    border-width: 1.5px;
    min-height: 48px;
  }
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 0;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      ${(props) =>
        props.isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(41, 88, 255, 0.1)"},
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-3px) scale(1.01);
    box-shadow: ${(props) =>
      props.isSelected
        ? "0 8px 24px rgba(41, 88, 255, 0.3)"
        : props.isDark
        ? "0 8px 24px rgba(0, 0, 0, 0.3)"
        : "0 8px 24px rgba(41, 88, 255, 0.15)"};
    border-color: var(--Color-Accent-CTA-Background-Default, #2958ff);

    &::before {
      left: 100%;
    }
  }
`;

const ActionButton = styled.button<{
  variant?: "primary" | "secondary";
  isDark?: boolean;
}>`
  display: flex;
  padding: 18px 32px;
  justify-content: center;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-height: 48px;
  flex: 1;

  @media (max-width: 768px) {
    padding: 14px 24px;
    font-size: 14px;
    border-radius: 16px;
    gap: 8px;
    min-height: 44px;
  }

  @media (max-width: 480px) {
    padding: 12px 20px;
    font-size: 13px;
    border-radius: 12px;
    gap: 6px;
    min-height: 44px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  ${(props) =>
    props.variant === "primary"
      ? `
    background: linear-gradient(135deg, #2958ff 0%, #6f2ae2 100%);
    color: white;
    box-shadow: 0 4px 16px rgba(41, 88, 255, 0.3);

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s ease;
    }

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(41, 88, 255, 0.4);
      
      &::before {
        left: 100%;
      }
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  `
      : `
    background: ${
      props.isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
    };
    color: ${
      props.isDark
        ? "rgba(255, 255, 255, 0.9)"
        : "var(--Color-Neutral-Element-Secondary, #7e7e9a)"
    };
    border: 2px solid ${
      props.isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"
    };

    &:hover:not(:disabled) {
      background: ${
        props.isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.06)"
      };
      border-color: ${
        props.isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.15)"
      };
      transform: translateY(-1px);
    }
  `}
`;

const GradientCircularProgress = styled(CircularProgress)({
  color: "transparent",
  background: "conic-gradient(from 0deg, #6f2ae2, #ffd700)",
  borderRadius: "50%",
  position: "absolute",
  mixBlendMode: "color",
});

const GlobalStyles = styled("div")({
  "@keyframes spin": {
    "0%": {
      transform: "rotate(0deg)",
    },
    "100%": {
      transform: "rotate(360deg)",
    },
  },
  "@keyframes fadeInSlide": {
    "0%": {
      opacity: 0,
      transform: "translateY(-10px)",
    },
    "100%": {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
});

// Modern Step Indicator Component
const StepIndicator: React.FC<{
  currentStep: number;
  onStepClick: (step: number) => void;
  canProceedToStep: (step: number) => boolean;
  isDark?: boolean;
}> = ({ currentStep, onStepClick, canProceedToStep, isDark }) => {
  const steps = [
    {
      number: 1,
      title: "Select Token",
      description: "Choose the token to zap",
    },
    { number: 2, title: "Select Pool", description: "Choose the target pool" },
    {
      number: 3,
      title: "Enter Amount",
      description: "Enter amount and validate",
    },
  ];

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <StepContainer>
      <StepIndicatorContainer>
        <ProgressBar progress={progress} isDark={isDark} />
        {steps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;
          const canClick = canProceedToStep(step.number);

          return (
            <StepItem
              key={step.number}
              onClick={() => canClick && onStepClick(step.number)}
              style={{ cursor: canClick ? "pointer" : "default" }}
            >
              <StepCircle
                isActive={isActive}
                isCompleted={isCompleted}
                isDark={isDark}
              >
                {isCompleted ? "✓" : step.number}
              </StepCircle>
              <StepLabel isActive={isActive} isDark={isDark}>
                {step.title}
              </StepLabel>
            </StepItem>
          );
        })}
      </StepIndicatorContainer>
    </StepContainer>
  );
};

// Simple Token Selector for Step 1
const TokenSelector: React.FC<{
  onCurrencySelect: (currency: ARC200TokenI) => void;
  currency: ARC200TokenI | null;
  isDark?: boolean;
}> = ({ onCurrencySelect, currency, isDark }) => {
  const [tokens, setTokens] = useState<ARC200TokenI[]>([]);
  const dispatch = useDispatch();
  const reduxTokens = useSelector(selectTokens);

  useEffect(() => {
    setTokens(reduxTokens);
  }, [reduxTokens]);

  const handleTokenSelect = (token: ARC200TokenI) => {
    onCurrencySelect(token);
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: "1px solid",
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        borderRadius: { xs: 2, sm: 3 },
        bgcolor: isDark
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(255, 255, 255, 0.95)",
        boxShadow: isDark
          ? "0 2px 8px rgba(0,0,0,0.2)"
          : "0 2px 8px rgba(0,0,0,0.05)",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: isDark
            ? "0 4px 12px rgba(0,0,0,0.3)"
            : "0 4px 12px rgba(0,0,0,0.08)",
          borderColor: isDark ? "rgba(41, 88, 255, 0.5)" : "primary.main",
          bgcolor: isDark
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(255, 255, 255, 1)",
        },
      }}
    >
      <TokenSelect
        token={currency || undefined}
        options={tokens}
        onSelect={handleTokenSelect}
      />
    </Box>
  );
};

// Custom Token Input Panel using TokenSelect
const TokenInputPanel: React.FC<{
  value: string;
  onUserInput: (value: string) => void;
  onCurrencySelect: (currency: ARC200TokenI) => void;
  currency: ARC200TokenI | null;
  id: string;
  tokenBalances?: Record<number, string>;
  dexPrices?: Record<string, number>;
  onMaxClick?: () => void;
  balanceLoading?: boolean;
  balanceError?: string | null;
  getTokenIconUrl: (tokenId: string | number, symbol: string) => string;
  isDark?: boolean;
}> = ({
  value,
  onUserInput,
  onCurrencySelect,
  currency,
  id,
  tokenBalances = {},
  dexPrices = {},
  onMaxClick,
  balanceLoading = false,
  balanceError = null,
  getTokenIconUrl,
  isDark,
}) => {
  const [tokens, setTokens] = useState<ARC200TokenI[]>([]);
  const dispatch = useDispatch();
  const reduxTokens = useSelector(selectTokens);

  useEffect(() => {
    setTokens(reduxTokens);
  }, [reduxTokens]);

  const handleTokenSelect = (token: ARC200TokenI) => {
    onCurrencySelect(token);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 1.5, sm: 2 },
        p: { xs: 1.5, sm: 2 },
        border: "1px solid",
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        borderRadius: { xs: 2, sm: 3 },
        bgcolor: isDark
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(255, 255, 255, 0.95)",
        boxShadow: isDark
          ? "0 2px 8px rgba(0,0,0,0.2)"
          : "0 2px 8px rgba(0,0,0,0.05)",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: isDark
            ? "0 4px 12px rgba(0,0,0,0.3)"
            : "0 4px 12px rgba(0,0,0,0.08)",
          borderColor: isDark ? "rgba(41, 88, 255, 0.5)" : "primary.main",
          bgcolor: isDark
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(255, 255, 255, 1)",
        },
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}
      >
        <TokenSelect
          token={currency || undefined}
          options={tokens}
          onSelect={handleTokenSelect}
        />
        <TextField
          type="number"
          value={value}
          onChange={(e) => onUserInput(e.target.value)}
          placeholder="0.0"
          variant="outlined"
          size="small"
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: { xs: 2, sm: 2.5 },
              fontSize: { xs: "0.875rem", sm: "1rem" },
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(255, 255, 255, 0.9)",
              color: isDark ? "rgba(255, 255, 255, 0.9)" : "inherit",
              "& fieldset": {
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
              },
              "&:hover": {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(255, 255, 255, 1)",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: isDark
                    ? "rgba(41, 88, 255, 0.5)"
                    : "primary.main",
                },
              },
              "&.Mui-focused": {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(255, 255, 255, 1)",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: isDark
                    ? "rgba(41, 88, 255, 0.7)"
                    : "primary.main",
                  borderWidth: 2,
                },
              },
            },
            "& .MuiInputBase-input": {
              color: isDark ? "rgba(255, 255, 255, 0.9)" : "inherit",
            },
          }}
          InputProps={{
            startAdornment:
              currency &&
              (() => {
                const iconUrl = getTokenIconUrl(
                  currency.tokenId,
                  currency.symbol
                );
                return iconUrl ? (
                  <InputAdornment position="start">
                    <img
                      src={iconUrl}
                      alt={`${currency.symbol} icon`}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        // Hide icon if it fails to load
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </InputAdornment>
                ) : null;
              })(),
            endAdornment: currency && (
              <InputAdornment position="end">
                <Typography variant="caption" color="text.secondary">
                  {normalizeSymbol(
                    currency.symbol,
                    currency.tokenId,
                    currency.contractId
                  )}
                </Typography>
              </InputAdornment>
            ),
          }}
        />
      </Box>
      {currency && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {(() => {
              // Override wVOI (390001) to display as Voi
              const tokenId = currency.tokenId ?? 0;
              const contractId = currency.contractId ?? tokenId;
              if (
                tokenId === 0 ||
                contractId === TOKEN_WVOI1 ||
                tokenId === TOKEN_WVOI1
              ) {
                return "Voi";
              }
              return currency.name;
            })()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Decimals: {currency.decimals}
          </Typography>
        </Box>
      )}

      {/* Balance Display and Max Button */}
      {currency &&
        (() => {
          // Get balance for the currency, trying both tokenId and contractId
          let balance = null;
          if (currency.symbol === "VOI") {
            balance = tokenBalances[0];
          } else {
            balance = tokenBalances[currency.tokenId];
            if (!balance && currency.contractId !== undefined) {
              balance = tokenBalances[currency.contractId];
            }
          }
          return balance && balance !== "0";
        })() && (
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: { xs: 1, sm: 0 },
              mt: 1,
              animation: "fadeInSlide 0.3s ease-out",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  wordBreak: "break-word",
                }}
              >
                Balance:{" "}
                {(() => {
                  const tokenId = currency.tokenId ?? 0;
                  const contractId = currency.contractId ?? tokenId;
                  const isVOI =
                    tokenId === 0 ||
                    contractId === TOKEN_WVOI1 ||
                    tokenId === TOKEN_WVOI1;
                  const displaySymbol = normalizeSymbol(
                    currency.symbol,
                    currency.tokenId,
                    currency.contractId
                  );

                  let balance = null;
                  if (
                    isVOI ||
                    currency.symbol === "VOI" ||
                    currency.symbol === "WVOI" ||
                    currency.symbol === "wVOI"
                  ) {
                    balance = tokenBalances[0];
                  } else {
                    balance = tokenBalances[currency.tokenId];
                    if (!balance && currency.contractId !== undefined) {
                      balance = tokenBalances[currency.contractId];
                    }
                  }
                  return `${balance} ${displaySymbol}`;
                })()}
              </Typography>
              {(() => {
                let balance = null;
                if (currency.symbol === "VOI") {
                  balance = tokenBalances[0];
                } else {
                  balance = tokenBalances[currency.tokenId];
                  if (!balance && currency.contractId !== undefined) {
                    balance = tokenBalances[currency.contractId];
                  }
                }
                const balanceNum = parseFloat(balance.replace(/,/g, ""));
                const usdPrice = dexPrices[currency.tokenId.toString()] || 0;
                const usdValue = balanceNum * usdPrice;
                return usdValue > 0 ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: "0.65rem", sm: "0.75rem" },
                    }}
                  >
                    ≈ $
                    {usdValue.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                ) : null;
              })()}
            </Box>
            {onMaxClick && (
              <Button
                variant="text"
                size="small"
                aria-label="Select maximum token amount"
                onClick={onMaxClick}
                sx={{
                  textTransform: "none",
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  minWidth: { xs: "48px", sm: "auto" },
                  minHeight: { xs: "36px", sm: "auto" },
                  padding: { xs: "6px 12px", sm: "4px 8px" },
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "scale(1.05)",
                  },
                }}
              >
                Max
              </Button>
            )}
          </Box>
        )}

      {balanceLoading && currency && (
        <Box sx={{ mt: 1 }}>
          <Skeleton
            variant="text"
            width="60%"
            height={20}
            sx={{
              width: { xs: "80%", sm: "60%" },
            }}
          />
        </Box>
      )}

      {balanceError && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="error">
            Failed to load balance: {balanceError}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

interface Pool {
  contractId: number;
  poolId: string;
  symbolA: string;
  symbolB: string;
  tokAId: string;
  tokBId: string;
  tokADecimals: number;
  tokBDecimals: number;
  tvl: number;
  tvlA: string;
  tvlB: string;
  apr: string;
  iconA?: string;
  iconB?: string;
}

// Helper function to normalize pool pair display
// Helper function to normalize WVOI to VOI for symbol display
const normalizePoolPair = (pool: Pool) => {
  const tokAIdNum = Number(pool.tokAId) || 0;
  const tokBIdNum = Number(pool.tokBId) || 0;

  // Normalize VOI/wVOI IDs (0 and 390001) to 0 for comparison
  const normalizeId = (id: number) => {
    if (isNaN(id)) return 0;
    return id === 390001 || id === TOKEN_WVOI1 ? 0 : id;
  };

  const normalizedA = normalizeId(tokAIdNum);
  const normalizedB = normalizeId(tokBIdNum);

  // Swap if A > B to ensure consistent ordering (lower ID first)
  const shouldSwap = normalizedA > normalizedB;

  const symbolA = pool.symbolA || "";
  const symbolB = pool.symbolB || "";

  // Normalize symbols (WVOI -> VOI)
  const normalizedSymbolA = normalizeSymbol(symbolA, pool.tokAId);
  const normalizedSymbolB = normalizeSymbol(symbolB, pool.tokBId);

  return {
    ...pool,
    displaySymbolA: shouldSwap ? normalizedSymbolB : normalizedSymbolA,
    displaySymbolB: shouldSwap ? normalizedSymbolA : normalizedSymbolB,
    displayTokAId: shouldSwap ? pool.tokBId : pool.tokAId,
    displayTokBId: shouldSwap ? pool.tokAId : pool.tokBId,
    displayIconA: shouldSwap ? pool.iconB : pool.iconA,
    displayIconB: shouldSwap ? pool.iconA : pool.iconB,
  };
};

const ZapAnimation = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      position: "relative",
      height: 120,
      width: 120,
      opacity: 0.7,
    }}
  >
    <svg width="0" height="0">
      <filter id="pixelate" x="0" y="0">
        <feFlood x="8" y="8" height="4" width="4" />
        <feComposite width="20" height="20" />
        <feTile result="a" />
        <feComposite in="SourceGraphic" in2="a" operator="in" />
        <feMorphology operator="dilate" radius="3" />
      </filter>
    </svg>
    <GradientCircularProgress
      size={120}
      sx={{ animation: "spin 2s linear infinite" }}
    />
  </Box>
);

// Success Modal Styled Components
const CustomDialog = mstyled(Dialog)(({ theme }) => {
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

const StyledButton = styled.div`
  cursor: pointer;
`;

const ButtonContainer = styled(StyledButton)`
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

const ZapInfoContainer = styled.div<{ $isDarkTheme?: boolean }>`
  width: 100%;
  max-width: 420px;
  padding: 24px 20px;
  border-radius: 16px;
  background: ${(props) =>
    props.$isDarkTheme
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(41, 88, 255, 0.05)"};

  @media (max-width: 480px) {
    padding: 16px;
    max-width: 100%;
  }
`;

const ZapInfoRow = styled.div<{ $isDarkTheme?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};

  &:last-child {
    border-bottom: none;
  }
`;

const ZapInfoLabel = styled.div<{ $isDarkTheme?: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)"};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-weight: 500;
  line-height: 120%;
`;

const ZapInfoValue = styled.div<{ $isDarkTheme?: boolean }>`
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#0c0c10")};
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-weight: 700;
  line-height: 120%;
  text-align: right;
  word-break: break-all;
`;

interface ModalPatternProps {
  theme: "light" | "dark";
}

const ModalPattern: FC<ModalPatternProps> = ({ theme }) => {
  return theme === "light" ? (
    <svg
      width="630"
      height="140"
      viewBox="0 0 630 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "140px",
        pointerEvents: "none",
      }}
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
          strokeWidth="50"
        />
        <path
          d="M422.583 -39.7873C436.782 -39.8157 450.837 -37.1732 463.945 -32.0107C477.052 -26.8482 488.955 -19.2668 498.975 -9.69936C508.995 -0.131907 516.934 11.2342 522.341 23.75C527.747 36.2659 530.515 49.6863 530.485 63.2451"
          stroke="#FFBE1D"
          strokeWidth="50"
        />
        <path
          d="M97.6156 63.9013C97.6453 50.3292 100.473 36.8844 105.937 24.3346C111.402 11.7848 119.395 0.375719 129.462 -9.24119C139.529 -18.8581 151.473 -26.4945 164.61 -31.7145C177.747 -36.9344 191.821 -39.6356 206.028 -39.6639C220.235 -39.6922 234.298 -37.0469 247.412 -31.8792C260.526 -26.7115 272.436 -19.1226 282.461 -9.54563C292.486 0.0313027 300.43 11.4086 305.84 23.9368C311.249 36.465 314.018 49.8986 313.989 63.4707"
          stroke="#41137E"
          strokeWidth="50"
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
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "140px",
        pointerEvents: "none",
      }}
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
          strokeWidth="50"
        />
        <path
          d="M422.583 -39.7873C436.783 -39.8157 450.837 -37.1732 463.945 -32.0107C477.052 -26.8482 488.956 -19.2668 498.975 -9.69936C508.995 -0.131907 516.935 11.2342 522.341 23.75C527.748 36.2659 530.515 49.6863 530.485 63.2451"
          stroke="#FFBE1D"
          strokeWidth="50"
        />
        <path
          d="M97.6157 63.9013C97.6454 50.3292 100.473 36.8844 105.937 24.3346C111.402 11.7848 119.396 0.375719 129.463 -9.24119C139.53 -18.8581 151.473 -26.4945 164.61 -31.7145C177.747 -36.9344 191.821 -39.6356 206.028 -39.6639C220.235 -39.6922 234.298 -37.0469 247.412 -31.8792C260.527 -26.7115 272.436 -19.1226 282.461 -9.54563C292.486 0.0313027 300.431 11.4086 305.84 23.9368C311.249 36.465 314.018 49.8986 313.989 63.4707"
          stroke="#41137E"
          strokeWidth="50"
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

const Zap: React.FC = () => {
  const { activeAccount, signTransactions } = useWallet();
  const dispatch = useDispatch();
  const tokens: ARC200TokenI[] = useSelector(selectTokens);
  console.log("tokens", tokens);
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [canProceedToNext, setCanProceedToNext] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [inputCurrency, setInputCurrency] = useState<ARC200TokenI | null>(null);
  const [inputAmount, setInputAmount] = useState<string>("");
  const [targetPairAddress, setTargetPairAddress] = useState<string>("");
  const [availablePools, setAvailablePools] = useState<Pool[]>([]);
  const [page, setPage] = useState(1);
  const poolsPerPage = 8;
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [maxBalance, setMaxBalance] = useState<string>("0");
  const { width, height } = useWindowSize();
  const rewards = useDefiRewards();
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [estimatedOutput, setEstimatedOutput] = useState<string | null>(null);
  const [poolSearchQuery, setPoolSearchQuery] = useState("");
  const [availableTokens, setAvailableTokens] = useState<ARC200TokenI[]>([]);

  // Enhanced state for balance and price management
  const [tokenBalances, setTokenBalances] = useState<Record<number, string>>(
    {}
  );
  const [dexPrices, setDexPrices] = useState<Record<string, number>>({});
  const [usdcPrice, setUsdcPrice] = useState<number>(1);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Token pair switching state
  const [selectedTokenInPair, setSelectedTokenInPair] = useState<"A" | "B">(
    "A"
  );

  // Success state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    inputAmount: string;
    inputToken: string;
    poolName: string;
    transactionId: string;
  } | null>(null);

  // Price impact and share calculations
  const [priceImpact, setPriceImpact] = useState<number>(0);
  const [estimatedShare, setEstimatedShare] = useState<number>(0);
  const [impactLoading, setImpactLoading] = useState(false);

  const loadingMessages = [
    "Preparing your transaction...",
    "Mixing the perfect cocktail of tokens...",
    "Teaching algorithms to dance...",
    "Consulting with crypto hamsters...",
    "Aligning the blockchain stars...",
    "Warming up the quantum computers...",
  ];

  // Load tokens from Redux store
  useEffect(() => {
    dispatch(getTokensWithTickers() as unknown as UnknownAction);
  }, [dispatch]);

  // Fetch DEX prices for USD calculations
  const fetchDexPrices = useCallback(async () => {
    try {
      const response = await axios.get(
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/prices",
        { timeout: 10000 }
      );

      if (response.data?.prices && Array.isArray(response.data.prices)) {
        const priceMap: Record<string, number> = {};

        response.data.prices.forEach((priceData: any) => {
          // Extract token IDs from poolId (format: "tokenA-tokenB")
          const [tokenAId, tokenBId] = priceData.poolId.split("-");

          // Store prices relative to VOI (tokenId: 0)
          if (tokenAId === "0") {
            // VOI is token A, so price is how many VOI per token B
            priceMap[tokenBId] = 1 / priceData.price;
          } else if (tokenBId === "0") {
            // VOI is token B, so price is how many VOI per token A
            priceMap[tokenAId] = priceData.price;
          }
        });

        // Find USDC (aUSDC - tokenId: 395614) price in VOI
        const usdcTokenId = "395614";
        const usdcToVoiPrice = priceMap[usdcTokenId];

        if (usdcToVoiPrice) {
          // If 1 USDC = X VOI, then 1 VOI = 1/X USDC
          const voiToUsdcPrice = 1 / usdcToVoiPrice;
          setUsdcPrice(voiToUsdcPrice);

          // Convert all VOI prices to USD using USDC as reference
          const usdPrices: Record<string, number> = {};
          Object.entries(priceMap).forEach(([tokenId, voiPrice]) => {
            usdPrices[tokenId] = voiPrice * voiToUsdcPrice;
          });

          // Add VOI itself
          usdPrices["0"] = voiToUsdcPrice;

          setDexPrices(usdPrices);
        } else {
          console.warn("USDC price not found in DEX data");
          setDexPrices(priceMap);
        }
      }
    } catch (error) {
      console.error("Error fetching DEX prices:", error);
    }
  }, []);

  // Fetch balances using Nautilus indexer API
  const fetchBalances = useCallback(async () => {
    if (!activeAccount) {
      setTokenBalances({});
      return;
    }

    setBalanceLoading(true);
    setBalanceError(null);

    try {
      // Fetch account balances from Nautilus indexer
      const response = await axios.get(
        `https://voi-mainnet-mimirapi.nftnavigator.xyz/arc200/balances?accountId=${activeAccount.address}`,
        { timeout: 10000 } // 10 second timeout
      );

      const balances: Record<number, string> = {};

      // Process all balances from the API response (including zero balances for proper display)
      if (response.data?.balances && Array.isArray(response.data.balances)) {
        console.log(
          "Processing balances:",
          response.data.balances.length,
          "items"
        );
        response.data.balances.forEach((balanceItem: any) => {
          const contractId = balanceItem.contractId;
          const balance = balanceItem.balance || "0";
          const decimals = balanceItem.decimals || 0;

          console.log("Processing balance item:", {
            contractId,
            balance,
            decimals,
          });

          // Convert balance to human readable format
          if (balance !== "0") {
            const balanceNumber = parseFloat(balance) / Math.pow(10, decimals);
            balances[contractId] = balanceNumber.toLocaleString(undefined, {
              maximumFractionDigits: Math.min(6, decimals),
              minimumFractionDigits: 0,
            });
            console.log(
              "Set balance for contractId",
              contractId,
              ":",
              balances[contractId]
            );
          } else {
            balances[contractId] = "0";
          }
        });
      }

      // Also fetch VOI balance from account info
      try {
        const { algodClient } = getAlgorandClients();
        const accountInfo = await algodClient
          .accountInformation(activeAccount.address)
          .do();
        const voiAmount = accountInfo.amount || 0;
        const minBalance = accountInfo["min-balance"] || 0;
        const availableVoi = Math.max(0, voiAmount - minBalance);
        balances[0] = (availableVoi / 1e6).toLocaleString(undefined, {
          maximumFractionDigits: 6,
          minimumFractionDigits: 0,
        });
      } catch (voiError) {
        console.warn("Error fetching VOI balance:", voiError);
        balances[0] = "0";
      }

      setTokenBalances(balances);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error("Error fetching balances:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch balances";

      // Auto-retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        console.log(`Retrying balance fetch (attempt ${retryCount + 1})...`);
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          fetchBalances();
        }, Math.pow(2, retryCount) * 1000); // 1s, 2s, 4s delays
      } else {
        setBalanceError(errorMessage);
        setTokenBalances({});
      }
    } finally {
      setBalanceLoading(false);
    }
  }, [activeAccount, retryCount]);

  // Helper function to get token USD price from DEX data
  const getTokenUsdPrice = useCallback(
    (token: ARC200TokenI): number => {
      return dexPrices[token.tokenId.toString()] || 0;
    },
    [dexPrices]
  );

  // Helper function to calculate balance value in USD
  const getBalanceValue = useCallback(
    (token: ARC200TokenI): number => {
      const balance = tokenBalances[token.tokenId];
      if (!balance || balance === "0") {
        return 0;
      }

      // Parse balance (remove commas)
      const balanceNum = parseFloat(balance.replace(/,/g, ""));
      if (isNaN(balanceNum)) return 0;

      // Get USD price from DEX data
      const usdPrice = getTokenUsdPrice(token);
      if (!usdPrice) {
        return 0;
      }

      return balanceNum * usdPrice;
    },
    [tokenBalances, getTokenUsdPrice]
  );

  // Filter tokens with balances for better UX
  const tokensWithBalances = useMemo(() => {
    return tokens
      .filter((token) => {
        const balance = tokenBalances[token.tokenId];
        const num = balance ? parseFloat(balance.replace(/,/g, "")) : 0;
        return !!num && !isNaN(num) && num > 0;
      })
      .sort((a, b) => getBalanceValue(b) - getBalanceValue(a));
  }, [tokens, tokenBalances, getBalanceValue]);

  // Initial balance and price fetch
  useEffect(() => {
    fetchBalances();
    fetchDexPrices();
  }, [fetchBalances, fetchDexPrices]);

  // Periodic refresh
  useEffect(() => {
    const balanceInterval = setInterval(fetchBalances, 300000); // 5 minutes
    const priceInterval = setInterval(fetchDexPrices, 60000); // 1 minute

    return () => {
      clearInterval(balanceInterval);
      clearInterval(priceInterval);
    };
  }, [fetchBalances, fetchDexPrices]);

  useEffect(() => {
    if (isSigningModalOpen) {
      const interval = setInterval(() => {
        setLoadingMessage((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSigningModalOpen]);

  // Confetti effect for success modal
  useEffect(() => {
    if (showSuccessModal) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal]);

  // Step validation
  const validateStep = useCallback(
    (step: number) => {
      console.log("validateStep called", {
        step,
        inputCurrency,
        targetPairAddress,
        inputAmount,
      });
      switch (step) {
        case 1:
          return !!inputCurrency;
        case 2:
          return !!inputCurrency; // Only require inputCurrency for step 2, not targetPairAddress
        case 3:
          return (
            !!inputCurrency &&
            !!targetPairAddress &&
            !!inputAmount &&
            parseFloat(inputAmount) > 0
          );
        default:
          return false;
      }
    },
    [inputCurrency, targetPairAddress, inputAmount]
  );

  // Update can proceed when dependencies change
  useEffect(() => {
    setCanProceedToNext(validateStep(currentStep));
  }, [currentStep, validateStep]);

  // Enhanced token selection with balance information
  const handleInputSelect = useCallback((inputCurrency: ARC200TokenI) => {
    console.log("Token selected:", inputCurrency);
    setInputCurrency(inputCurrency);
    // Reset subsequent steps when token changes
    setTargetPairAddress("");
    setSelectedPoolId(null);
    setInputAmount("");
    setCurrentStep(2); // Automatically move to step 2 when token is selected
    setShowConfirmation(false);
    setPoolSearchQuery(""); // Reset search query when token changes
    setPage(1); // Reset to first page
  }, []);

  const handleInputAmountChange = useCallback((value: string) => {
    setInputAmount(value);
  }, []);

  // Step navigation
  const handleNextStep = useCallback(() => {
    console.log("handleNextStep called", {
      canProceedToNext,
      currentStep,
      inputCurrency,
    });
    if (canProceedToNext && currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [canProceedToNext, currentStep, inputCurrency]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setShowConfirmation(false);
    }
  }, [currentStep]);

  const handleStepClick = useCallback(
    (step: number) => {
      // Only allow clicking on completed steps or current step
      if (step <= currentStep || validateStep(step - 1)) {
        setCurrentStep(step);
      }
    },
    [currentStep, validateStep]
  );

  // Helper function to get all possible token IDs for matching
  const getTokenIdsForMatching = useCallback(
    (currency: ARC200TokenI | null): string[] => {
      if (!currency || currency.tokenId === undefined) return [];

      const tokenId = currency.tokenId;
      const contractId = currency.contractId;
      const possibleTokenIds: string[] = [];

      // Check if this is VOI/WVOI (normalize symbol first)
      const normalizedSymbol = normalizeSymbol(
        currency.symbol,
        tokenId,
        contractId
      );
      const isVOI =
        normalizedSymbol === "VOI" ||
        tokenId === 0 ||
        contractId === TOKEN_WVOI1 ||
        tokenId === TOKEN_WVOI1;

      // Add tokenId (handle VOI special case)
      if (isVOI) {
        possibleTokenIds.push("390001", "0");
      } else {
        possibleTokenIds.push(String(tokenId));
      }

      // Add contractId if it exists and is different
      if (contractId !== undefined && contractId !== tokenId) {
        possibleTokenIds.push(String(contractId));
      }

      // Also add TOKEN_WVOI1 if this is VOI
      if (isVOI) {
        possibleTokenIds.push(String(TOKEN_WVOI1));
      }

      // Remove duplicates
      return [...new Set(possibleTokenIds)];
    },
    []
  );

  // Add new useEffect to fetch pools when input currency changes
  useEffect(() => {
    const fetchPools = async () => {
      if (inputCurrency && inputCurrency.tokenId !== undefined) {
        console.log(
          "Fetching pools for token:",
          inputCurrency.symbol,
          "tokenId:",
          inputCurrency.tokenId,
          "contractId:",
          inputCurrency.contractId
        );

        // Get all possible token identifiers to match against
        const uniqueTokenIds = getTokenIdsForMatching(inputCurrency);
        console.log("Searching for pools with token IDs:", uniqueTokenIds);

        try {
          // Try to fetch pools with stats for USD TVL
          let poolsData: any[] = [];
          try {
            const statsResponse = await fetch(
              `https://humble-api.voi.nautilus.sh/pools/stats?sortBy=tvl`
            );
            const statsData = await statsResponse.json();
            if (statsData.stats && Array.isArray(statsData.stats)) {
              // Filter pools that contain the selected token (check all possible IDs)
              poolsData = statsData.stats.filter((stat: any) => {
                const pool = stat.pool || stat.poolInfo || {};
                const tokA = String(pool.tokA || "");
                const tokB = String(pool.tokB || "");
                // Check if either token matches any of our possible IDs
                return (
                  uniqueTokenIds.includes(tokA) || uniqueTokenIds.includes(tokB)
                );
              });
            }
          } catch (statsError) {
            console.log("Stats API failed, falling back to basic pools API");
          }

          // Fallback to basic pools API if stats didn't work
          if (poolsData.length === 0) {
            // Try with the primary tokenId first
            const tokenId = inputCurrency.tokenId;
            const contractId = inputCurrency.contractId;
            const normalizedSymbol = normalizeSymbol(
              inputCurrency.symbol,
              tokenId,
              contractId
            );
            const primaryTokenId =
              normalizedSymbol === "VOI" ? 390001 : tokenId;
            const response = await fetch(
              `https://humble-api.voi.nautilus.sh/pools?tokenId=${primaryTokenId}`
            );
            const data = await response.json();
            if (data.pools && Array.isArray(data.pools)) {
              // Filter the results to ensure they match our token
              poolsData = data.pools.filter((pool: any) => {
                const tokA = String(pool.tokA || pool.tokAId || "");
                const tokB = String(pool.tokB || pool.tokBId || "");
                return (
                  uniqueTokenIds.includes(tokA) || uniqueTokenIds.includes(tokB)
                );
              });
            }
          }

          if (poolsData.length > 0) {
            console.log("Found pools:", poolsData.length);
            // Map API structure to Pool interface
            const mappedPools = poolsData.map((poolData: any) => {
              const pool = poolData.pool || poolData;
              const poolInfo = poolData.poolInfo || {};
              const tokens = poolData.tokens || {};
              const tvl = poolData.tvl || {};
              const fees = poolData.fees || {};

              const tokenA = tokens.tokenA || {};
              const tokenB = tokens.tokenB || {};
              const tokAId = String(pool.tokA || poolInfo.tokA || "");
              const tokBId = String(pool.tokB || poolInfo.tokB || "");

              // Get TVL in USD - prioritize tvl.usd from stats API
              let tvlUsd = 0;
              if (tvl.usd) {
                tvlUsd =
                  typeof tvl.usd === "number" ? tvl.usd : parseFloat(tvl.usd);
              } else if (poolData.tvl && typeof poolData.tvl === "number") {
                tvlUsd = poolData.tvl;
              } else if (poolData.tvl) {
                tvlUsd = parseFloat(poolData.tvl);
              }

              return {
                contractId: Number(pool.poolId || poolData.poolId),
                poolId: String(pool.poolId || poolData.poolId),
                tokAId: tokAId,
                tokBId: tokBId,
                symbolA:
                  poolData.symbolA || tokenA.unitName || tokenA.symbol || "",
                symbolB:
                  poolData.symbolB || tokenB.unitName || tokenB.symbol || "",
                tokADecimals:
                  poolData.tokADecimals || Number(tokenA.decimals) || 6,
                tokBDecimals:
                  poolData.tokBDecimals || Number(tokenB.decimals) || 6,
                tvl: tvlUsd,
                tvlA: poolData.tvlA || tvl.tokenA?.amount || "0",
                tvlB: poolData.tvlB || tvl.tokenB?.amount || "0",
                apr: poolData.apr || fees.apr || "0",
                iconA:
                  poolData.iconA ||
                  (tokAId
                    ? `https://asset-verification.nautilus.sh/icons/${getIconId(
                        Number(tokAId)
                      )}.png`
                    : undefined),
                iconB:
                  poolData.iconB ||
                  (tokBId
                    ? `https://asset-verification.nautilus.sh/icons/${getIconId(
                        Number(tokBId)
                      )}.png`
                    : undefined),
              } as Pool;
            });
            setAvailablePools(mappedPools);
          } else {
            console.log("No pools found or invalid response format");
            // Try alternative API endpoint or show fallback pools
            try {
              const fallbackResponse = await fetch(
                `https://humble-api.voi.nautilus.sh/pools`
              );
              const fallbackData = await fallbackResponse.json();
              console.log("Fallback API response:", fallbackData);
              if (fallbackData.pools && Array.isArray(fallbackData.pools)) {
                // Get all possible token identifiers using helper function
                const uniqueTokenIds = getTokenIdsForMatching(inputCurrency);

                // Filter pools that contain the selected token (check all possible IDs)
                const relevantPools = fallbackData.pools
                  .filter((pool: any) => {
                    const tokA = String(pool.tokA || pool.tokAId || "");
                    const tokB = String(pool.tokB || pool.tokBId || "");
                    return (
                      uniqueTokenIds.includes(tokA) ||
                      uniqueTokenIds.includes(tokB)
                    );
                  })
                  .map((pool: any) => {
                    // Get TVL in USD
                    let tvlUsd = 0;
                    if (pool.tvl) {
                      tvlUsd =
                        typeof pool.tvl === "number"
                          ? pool.tvl
                          : parseFloat(pool.tvl);
                    } else if (pool.tvl?.usd) {
                      tvlUsd =
                        typeof pool.tvl.usd === "number"
                          ? pool.tvl.usd
                          : parseFloat(pool.tvl.usd);
                    }

                    const tokAId = pool.tokA || pool.tokAId || "";
                    const tokBId = pool.tokB || pool.tokBId || "";

                    return {
                      ...pool,
                      contractId: Number(pool.poolId),
                      tokAId: tokAId,
                      tokBId: tokBId,
                      symbolA: pool.symbolA || "",
                      symbolB: pool.symbolB || "",
                      tokADecimals: pool.tokADecimals || 6,
                      tokBDecimals: pool.tokBDecimals || 6,
                      tvl: tvlUsd,
                      tvlA: pool.tvlA || pool.tvl?.tokenA?.amount || "0",
                      tvlB: pool.tvlB || pool.tvl?.tokenB?.amount || "0",
                      apr: pool.apr || pool.fees?.apr || "0",
                      iconA:
                        pool.iconA ||
                        (tokAId
                          ? `https://asset-verification.nautilus.sh/icons/${getIconId(
                              Number(tokAId)
                            )}.png`
                          : undefined),
                      iconB:
                        pool.iconB ||
                        (tokBId
                          ? `https://asset-verification.nautilus.sh/icons/${getIconId(
                              Number(tokBId)
                            )}.png`
                          : undefined),
                    } as Pool;
                  });
                console.log(
                  "Found relevant pools from fallback:",
                  relevantPools.length
                );
                setAvailablePools(relevantPools);
              } else {
                setAvailablePools([]);
              }
            } catch (fallbackError) {
              console.error("Fallback API also failed:", fallbackError);
              setAvailablePools([]);
            }
          }
        } catch (error) {
          console.error("Failed to fetch pools:", error);
          setAvailablePools([]);
        }
      } else {
        console.log("No input currency or tokenId, clearing pools");
        setAvailablePools([]);
      }
    };

    fetchPools();
  }, [inputCurrency, getTokenIdsForMatching]);

  const handleMaxClick = () => {
    console.log("Max button clicked", { inputCurrency, tokenBalances });

    if (!inputCurrency) {
      console.log("No input currency selected");
      return;
    }

    // Get the appropriate balance for the selected token
    let balance = null;
    const normalizedSymbol = normalizeSymbol(
      inputCurrency.symbol,
      inputCurrency.tokenId,
      inputCurrency.contractId
    );
    if (
      normalizedSymbol === "VOI" ||
      inputCurrency.symbol === "WVOI" ||
      inputCurrency.symbol === "wVOI"
    ) {
      balance = tokenBalances[0]; // VOI/WVOI uses tokenId 0
    } else {
      // For ARC200 tokens, try both tokenId and contractId
      balance = tokenBalances[inputCurrency.tokenId];

      // If not found by tokenId, try contractId
      if (!balance && inputCurrency.contractId !== undefined) {
        balance = tokenBalances[inputCurrency.contractId];
      }
    }

    console.log("Balance lookup result:", {
      symbol: inputCurrency.symbol,
      tokenId: inputCurrency.tokenId,
      contractId: inputCurrency.contractId,
      balance: balance,
      availableBalances: Object.keys(tokenBalances),
    });

    if (balance && balance !== "0") {
      // Remove commas from balance for number input
      const cleanBalance = balance.replace(/,/g, "");
      console.log("Setting max amount:", cleanBalance);
      setInputAmount(cleanBalance);
    } else {
      console.log("Cannot set max amount - no balance available:", {
        symbol: inputCurrency.symbol,
        tokenId: inputCurrency.tokenId,
        contractId: inputCurrency.contractId,
        balance: balance || "N/A",
        allBalances: tokenBalances,
      });
    }
  };

  const handlePoolSelect = (poolId: string, contractId: string) => {
    setSelectedPoolId(poolId);
    setTargetPairAddress(contractId);

    // Set the initial token to token A of the selected pool
    setSelectedTokenInPair("A");

    // Auto-advance to next step when pool is selected
    setTimeout(() => {
      setCurrentStep(3);
    }, 100);
  };

  const handleOpenModal = async () => {
    setIsLoadingTokens(true);
    try {
      // Token loading is now handled by Redux
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleZapConfirm = () => {
    setShowConfirmation(true);
  };

  const handleBackFromConfirmation = () => {
    setShowConfirmation(false);
  };

  const handleExecuteZap = () => {
    setShowConfirmation(false);
    handleZap();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleZap = async () => {
    if (!activeAccount) return;
    setIsModalOpen(false);
    setIsLoading(true);
    setIsSigningModalOpen(true);

    const pool = availablePools.find(
      (p) => p.contractId === Number(targetPairAddress)
    );

    if (!pool) {
      setErrorMessage("Pool not found");
      setIsLoading(false);
      setIsSigningModalOpen(false);
      return;
    }

    const acc = {
      addr: activeAccount.address,
      sk: new Uint8Array(0),
    };

    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      // pick a pool with best rate

      // get last round
      const status = await algodClient.status().do();
      const { ["last-round"]: lastRound } = status;

      const ci = new swap(
        Number(targetPairAddress),
        algodClient,
        indexerClient,
        {
          acc,
        }
      );

      const networkToken = {
        contractId: TOKEN_WVOI1,
        tokenId: "0",
        decimals: 6,
        symbol: "VOI",
      };

      const swapAForB =
        pool.tokAId === `${inputCurrency?.tokenId}` ||
        pool.tokAId === `${inputCurrency?.contractId}`;

      // Helper function to get the correct tokenId (ASA asset ID) for transactions
      const getTokenIdForTransaction = (
        contractId: number | undefined
      ): string | null => {
        if (!contractId) return null;

        // Priority: 1) ASA mapping from config, 2) contract ID (for pure ARC200 tokens)
        const asaAssetId = getAsaIdFromArc200Contract(contractId);
        if (asaAssetId) {
          return asaAssetId.toString();
        } else {
          // For pure ARC200 tokens without ASA, use contract ID
          return contractId.toString();
        }
      };

      // Get the contract ID from inputCurrency (prioritize contractId over tokenId)
      const inputContractId =
        inputCurrency?.contractId || inputCurrency?.tokenId;

      // Check if pool tokens are VOI/WVOI (normalize symbols)
      const isTokenAVOI =
        normalizeSymbol(pool.symbolA || "", pool.tokAId) === "VOI" ||
        Number(pool.tokAId) === 0 ||
        Number(pool.tokAId) === TOKEN_WVOI1;
      const isTokenBVOI =
        normalizeSymbol(pool.symbolB || "", pool.tokBId) === "VOI" ||
        Number(pool.tokBId) === 0 ||
        Number(pool.tokBId) === TOKEN_WVOI1;

      const tokA = tokens.find((t) => t.contractId === Number(pool.tokAId));
      const tokB = tokens.find((t) => t.contractId === Number(pool.tokBId));

      const mA = isTokenAVOI
        ? networkToken
        : {
            contractId: Number(pool.tokAId),
            tokenId: tokA?.assetType === "asa" ? tokA?.tokenId : null,
            decimals: pool.tokADecimals,
            symbol: pool.symbolA,
          };

      const mB = isTokenBVOI
        ? networkToken
        : {
            contractId: Number(pool.tokBId),
            tokenId: tokB?.assetType === "asa" ? tokB?.tokenId : null,
            decimals: pool.tokBDecimals,
            symbol: pool.symbolB,
          };

      console.log({ mA, mB });

      const fromAtomicUnit = new BigNumber(1)
        .dividedBy(new BigNumber(10).pow(inputCurrency?.decimals || 6))
        .toString();

      const fromAmount = new BigNumber(inputAmount)
        .dividedBy(2)
        .toFixed(inputCurrency?.decimals || 6);

      const fromLessAmount = new BigNumber(fromAmount)
        .minus(new BigNumber(fromAtomicUnit))
        .toFixed(inputCurrency?.decimals || 6);

      console.log({
        fromAmount,
        swapAForB,
        tokAId: pool.tokAId,
        tokBId: pool.tokBId,
        targetPairAddress,
        inputCurrency,
        fromLessAmount,
        fromAtomicUnit,
      });

      // figure out to amount

      console.log({ swapAForB });

      // sA - A for swap txns
      // sB - B for swap txns
      const sA = swapAForB
        ? {
            ...mA,
            amount: fromLessAmount,
            decimals: `${mA.decimals}`,
            tokenId: swapAForB
              ? tokA?.assetType === "asa" || tokA?.assetType === "network"
                ? `${tokA?.tokenId}`
                : null
              : null,
          }
        : {
            ...mB,
            amount: fromLessAmount,
            decimals: `${mB.decimals}`,
            tokenId: !swapAForB
              ? tokB?.assetType === "asa" || tokB?.assetType === "network"
                ? `${tokB?.tokenId}`
                : null
              : null,
          };

      const sB = swapAForB
        ? {
            ...mB,
            decimals: `${mB.decimals}`,
            tokenId: undefined,
          }
        : {
            ...mA,
            decimals: `${mA.decimals}`,
            tokenId: undefined,
          };

      console.log({ sA, sB });

      // logIndex
      // if symbolA or symbolB is VOI/WVOI, then logIndex is -2, otherwise it is -1

      const isSymbolAVOI =
        normalizeSymbol(pool.symbolA || "", pool.tokAId) === "VOI";
      const isSymbolBVOI =
        normalizeSymbol(pool.symbolB || "", pool.tokBId) === "VOI";
      const skipWithdraw = isSymbolAVOI || isSymbolBVOI;

      const logIndex = skipWithdraw
        ? -1
        : isSymbolAVOI ||
          normalizeSymbol(pool.symbolA || "", pool.tokAId) === "AUSDC"
        ? -2
        : -1;

      // Override degen mode to true if from token (inputCurrency) is 410811 (node)
      const fromTokenId = inputCurrency?.tokenId;
      const fromContractId = inputCurrency?.contractId;

      const effectiveDegenMode =
        fromTokenId === 410811 || fromContractId === 410811 ? true : true; // Already true, but keeping override logic for consistency

      const swapR: any = await ci.swap(
        acc.addr,
        Number(pool.contractId),
        sA,
        sB,
        [],
        {
          debug: true,
          slippage: 0.1,
          degenMode: effectiveDegenMode,
          skipWithdraw: true,
        }
      );

      console.log({ swapR });

      if (!swapR.success) throw new Error("Swap simulation failed");

      const swapTxnObjs = swapR.objs;

      // pay pool fee for balance box (non wrapped tokens)
      // if (!inputCurrency.tokenId) {
      //   for (let i = 0; i < swapTxnObjs.length; i++) {
      //     if (swapTxnObjs[i].appIndex === pool.contractId) {
      //       console.log("found pool fee", swapTxnObjs[i], pool.contractId);
      //       swapTxnObjs[i].payment = 28500;
      //       console.log("found pool fee", swapTxnObjs[i], pool.contractId);
      //       break;
      //     }
      //   }
      // }

      const outAB = Buffer.from(
        swapR.response.txnGroups[0].txnResults
          .slice(logIndex)[0]
          .txnResult.logs.slice(-1)[0]
          .slice(4)
      );

      console.log({ outAB });

      const outA = outAB.slice(0, 32);
      const outB = outAB.slice(32, 64);

      const out = swapAForB ? outB : outA;

      console.log({ swapAForB, out });

      const outBn = new BigNumber("0x" + Buffer.from(out).toString("hex"));

      console.log({ outBn });

      const outN = outBn
        .dividedBy(
          new BigNumber(10).pow(Number(swapAForB ? mB.decimals : mA.decimals))
        )
        .toFixed(Number(swapAForB ? mB.decimals : mA.decimals));

      console.log({ outBn, out, outA, outB, swapTxnObjs, outN });

      // deposit

      // remove tokenId conditionally to prevent deposit of wrapped token
      const dA = {
        ...mA,
        decimals: `${mA.decimals}`,
        amount: swapAForB ? fromAmount : outN,
        tokenId: swapAForB
          ? tokA?.assetType === "asa" || tokA?.assetType === "network"
            ? `${tokA?.tokenId}`
            : null
          : null,
      };

      // remove tokenId conditionally to prevent deposit of wrapped token
      const dB = {
        ...mB,
        decimals: `${mB.decimals}`,
        amount: swapAForB ? outN : fromAmount,
        tokenId: swapAForB
          ? null
          : tokB?.assetType === "asa" || tokB?.assetType === "network"
          ? `${tokB?.tokenId}`
          : null,
      };

      const depositR: any = await ci.deposit(
        acc.addr,
        Number(pool.contractId),
        dA,
        dB,
        swapTxnObjs,
        {
          debug: true,
        }
      );

      console.log({ depositR });

      if (!depositR.success) throw new Error("Deposit failed");

      setIsSigningModalOpen(true);
      const stxns = await signTransactions(
        depositR.txns.map(
          (t: string) => new Uint8Array(Buffer.from(t, "base64"))
        )
      );

      console.log({ stxns });

      const res = await algodClient
        .sendRawTransaction(stxns as Uint8Array[])
        .do();

      await algosdk.waitForConfirmation(algodClient, res.txId, 1000);

      setInputCurrency(null);
      setTargetPairAddress("");
      setInputAmount("");
      setAvailablePools([]);
      setSelectedPoolId(null);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000); // Hide confetti after 5 seconds

      let swapEvents: any;
      do {
        swapEvents = await ci.SwapEvents({
          minRound: lastRound,
          sender: activeAccount.address,
        });
      } while (!swapEvents.length);

      setIsSigningModalOpen(false);
      handleCloseModal();

      // Show success modal with transaction details
      const normalizedPool = normalizePoolPair(pool);
      setSuccessDetails({
        inputAmount: inputAmount,
        inputToken: inputCurrency
          ? normalizeSymbol(
              inputCurrency.symbol,
              inputCurrency.tokenId,
              inputCurrency.contractId
            )
          : "Unknown",
        poolName: `${normalizedPool.displaySymbolA}/${normalizedPool.displaySymbolB}`,
        transactionId: res.txId,
      });
      setShowSuccessModal(true);
      setShowConfetti(true);

      // trackZapTransaction(true, {
      //   inputToken: inputCurrency?.symbol,
      //   inputAmount,
      //   targetPool: `${pool.symbolA}/${pool.symbolB}`,
      //   ...(swapR.response ? { swapResponse: swapR.response } : {}),
      // });
    } catch (error: any) {
      //setErrorMessage(error.message);
      // trackZapTransaction(false, {
      //   inputToken: inputCurrency?.symbol,
      //   inputAmount,
      //   targetPool: `${pool.symbolA}/${pool.symbolB}`,
      //   error: error.message,
      // });
    } finally {
      setIsLoading(false);
      setIsSigningModalOpen(false);
    }
  };

  // Find the selected pool details
  const selectedPool = availablePools.find(
    (pool) => pool.contractId === Number(targetPairAddress)
  );

  // Get normalized pool display info
  const getNormalizedPoolDisplay = useCallback((pool: Pool | undefined) => {
    if (!pool) return null;
    const normalized = normalizePoolPair(pool);
    return {
      symbolA: normalized.displaySymbolA,
      symbolB: normalized.displaySymbolB,
      tokAId: normalized.displayTokAId,
      tokBId: normalized.displayTokBId,
      iconA: normalized.displayIconA,
      iconB: normalized.displayIconB,
      pairName: `${normalized.displaySymbolA}/${normalized.displaySymbolB}`,
    };
  }, []);

  // Helper function to get token icon URL
  const getTokenIconUrl = useCallback(
    (tokenId: string | number, symbol: string) => {
      const id = typeof tokenId === "string" ? Number(tokenId) : tokenId;
      const iconId = getIconId(id);
      return `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
    },
    []
  );

  // Helper function to calculate total APR including boosts
  const calculateTotalApr = useCallback(
    (pool: Pool): number => {
      const baseApr = parseFloat(pool.apr || "0");
      const poolIdNum = pool.contractId;

      // Find matching reward
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
      if (isVOIPair) {
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

  // Helper function to calculate price impact and share
  const calculateImpactAndShare = useCallback(async () => {
    if (
      !selectedPool ||
      !inputCurrency ||
      !inputAmount ||
      parseFloat(inputAmount) <= 0
    ) {
      setPriceImpact(0);
      setEstimatedShare(0);
      return;
    }

    setImpactLoading(true);
    try {
      const amount = parseFloat(inputAmount);
      const poolTvl = selectedPool.tvl;

      // Calculate estimated share based on input amount relative to pool TVL
      const inputValueUSD =
        amount * (dexPrices[inputCurrency.tokenId.toString()] || 0);
      const sharePercentage = (inputValueUSD / poolTvl) * 100;
      setEstimatedShare(Math.min(sharePercentage, 100)); // Cap at 100%

      // Calculate price impact (simplified model)
      // Higher share = higher price impact
      let impact = 0;
      if (sharePercentage > 0) {
        // Exponential impact model: impact increases with share size
        impact = Math.pow(sharePercentage / 10, 1.5) * 0.1; // Base 0.1% impact
        impact = Math.min(impact, 5); // Cap at 5% impact
      }
      setPriceImpact(impact);
    } catch (error) {
      console.error("Error calculating impact:", error);
      setPriceImpact(0);
      setEstimatedShare(0);
    } finally {
      setImpactLoading(false);
    }
  }, [selectedPool, inputCurrency, inputAmount, dexPrices]);

  // Helper function to get tokens from selected pool
  const getPoolTokens = useCallback(() => {
    if (!selectedPool) return { tokenA: null, tokenB: null };

    // Normalize pool symbols to handle VOI/WVOI
    const symbolA = normalizeSymbol(
      selectedPool.symbolA || "",
      selectedPool.tokAId
    );
    const symbolB = normalizeSymbol(
      selectedPool.symbolB || "",
      selectedPool.tokBId
    );

    // Find token A in the tokens list
    const tokenA = tokens.find((t) => {
      const normalizedSymbol = normalizeSymbol(
        t.symbol,
        t.tokenId,
        t.contractId
      );
      // Check if it's VOI (by symbol or ID)
      if (symbolA === "VOI") {
        return (
          normalizedSymbol === "VOI" ||
          t.tokenId === 0 ||
          t.contractId === TOKEN_WVOI1 ||
          t.tokenId === TOKEN_WVOI1
        );
      }
      // For other tokens, match by tokenId or contractId
      return (
        t.tokenId.toString() === selectedPool.tokAId ||
        (t.contractId !== undefined &&
          t.contractId.toString() === selectedPool.tokAId)
      );
    });

    // Find token B in the tokens list
    const tokenB = tokens.find((t) => {
      const normalizedSymbol = normalizeSymbol(
        t.symbol,
        t.tokenId,
        t.contractId
      );
      // Check if it's VOI (by symbol or ID)
      if (symbolB === "VOI") {
        return (
          normalizedSymbol === "VOI" ||
          t.tokenId === 0 ||
          t.contractId === TOKEN_WVOI1 ||
          t.tokenId === TOKEN_WVOI1
        );
      }
      // For other tokens, match by tokenId or contractId
      return (
        t.tokenId.toString() === selectedPool.tokBId ||
        (t.contractId !== undefined &&
          t.contractId.toString() === selectedPool.tokBId)
      );
    });

    return { tokenA, tokenB };
  }, [selectedPool, tokens]);

  // Helper function to switch between tokens in the pair (toggle functionality)
  const switchTokenInPair = useCallback(() => {
    if (!selectedPool || !inputCurrency) return;

    const { tokenA, tokenB } = getPoolTokens();

    if (!tokenA || !tokenB) return;

    // Normalize both tokens for comparison
    const currentNormalized = normalizeSymbol(
      inputCurrency.symbol,
      inputCurrency.tokenId,
      inputCurrency.contractId
    );
    const tokenANormalized = normalizeSymbol(
      tokenA.symbol,
      tokenA.tokenId,
      tokenA.contractId
    );
    const tokenBNormalized = normalizeSymbol(
      tokenB.symbol,
      tokenB.tokenId,
      tokenB.contractId
    );

    // Determine which token in the pool matches the current inputCurrency
    // Check by normalized symbol, tokenId, and contractId (handling VOI/WVOI)
    const isTokenA =
      tokenANormalized === currentNormalized ||
      tokenA.tokenId === inputCurrency.tokenId ||
      (tokenA.contractId !== undefined &&
        tokenA.contractId === inputCurrency.contractId) ||
      (tokenA.tokenId === 0 && inputCurrency.tokenId === 0) ||
      (tokenA.contractId === TOKEN_WVOI1 &&
        inputCurrency.contractId === TOKEN_WVOI1) ||
      (tokenA.tokenId === TOKEN_WVOI1 && inputCurrency.tokenId === TOKEN_WVOI1);

    // Toggle to the other token (the one that's NOT currently selected)
    const otherToken = isTokenA ? tokenB : tokenA;

    if (otherToken) {
      // Update selectedTokenInPair to match the new selection
      setSelectedTokenInPair(isTokenA ? "B" : "A");
      setInputCurrency(otherToken);
      setInputAmount(""); // Reset amount when switching tokens
    }
  }, [selectedPool, inputCurrency, getPoolTokens]);

  // Effect to set initial input currency when pool is selected
  useEffect(() => {
    if (selectedPool && selectedTokenInPair) {
      const { tokenA, tokenB } = getPoolTokens();
      const initialToken = selectedTokenInPair === "A" ? tokenA : tokenB;

      if (
        initialToken &&
        (!inputCurrency || inputCurrency.tokenId !== initialToken.tokenId)
      ) {
        setInputCurrency(initialToken);
        setInputAmount(""); // Reset amount when switching tokens
      }
    }
  }, [selectedPool, selectedTokenInPair, getPoolTokens, inputCurrency]);

  // Effect to calculate impact and share when values change
  useEffect(() => {
    calculateImpactAndShare();
  }, [calculateImpactAndShare]);

  const filteredPools = useMemo(() => {
    if (!poolSearchQuery.trim()) {
      return availablePools;
    }
    const query = poolSearchQuery.toLowerCase().trim();
    return availablePools.filter(
      (pool) =>
        pool.symbolA?.toLowerCase().includes(query) ||
        pool.symbolB?.toLowerCase().includes(query) ||
        pool.poolId?.toLowerCase().includes(query) ||
        `${pool.symbolA}/${pool.symbolB}`.toLowerCase().includes(query)
    );
  }, [availablePools, poolSearchQuery]);

  const trackZapTransaction = (success: boolean, details: any) => {
    // Integration with analytics platform
    // analytics.track('Zap Transaction', {
    //   success,
    //   inputToken: inputCurrency?.symbol,
    //   inputAmount,
    //   targetPool: `${selectedPool?.symbolA}/${selectedPool?.symbolB}`,
    //   ...details
    // });
  };

  return (
    <GlobalStyles>
      {showConfetti && (
        <ReactConfetti
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 999,
          }}
        />
      )}
      <ZapRoot isDark={isDarkTheme}>
        <ZapHeader>
          <ZapTitle isDark={isDarkTheme}>Zap Liquidity</ZapTitle>
          <ZapSubtitle isDark={isDarkTheme}>
            Instantly add liquidity with a single token
          </ZapSubtitle>
        </ZapHeader>

        {/* Step Indicator */}
        {!showConfirmation && (
          <StepIndicator
            currentStep={currentStep}
            onStepClick={handleStepClick}
            canProceedToStep={(step) =>
              step <= currentStep || validateStep(step - 1)
            }
            isDark={isDarkTheme}
          />
        )}

        {/* Step 1: Select Token */}
        {currentStep === 1 && !showConfirmation && (
          <ContentSection>
            <SectionTitle isDark={isDarkTheme}>
              Select Token to Zap
            </SectionTitle>
            {!activeAccount ? (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <Typography
                  variant="body1"
                  sx={{
                    mb: 2,
                    color: isDarkTheme
                      ? "rgba(255, 255, 255, 0.7)"
                      : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                  }}
                >
                  Please connect your wallet to start zapping
                </Typography>
                <Button variant="contained" color="primary" disabled>
                  Connect Wallet
                </Button>
              </Box>
            ) : (
              <>
                <TokenSelector
                  onCurrencySelect={handleInputSelect}
                  currency={inputCurrency}
                  isDark={isDarkTheme}
                />
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: { xs: "center", sm: "space-between" },
                    alignItems: "stretch",
                    gap: { xs: 1.5, sm: 2 },
                  }}
                >
                  <ActionButton
                    variant="primary"
                    onClick={handleNextStep}
                    disabled={!canProceedToNext}
                    isDark={isDarkTheme}
                    style={{ width: "100%" }}
                  >
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", sm: "inline" } }}
                    >
                      Next: Select Pool →
                    </Box>
                    <Box
                      component="span"
                      sx={{ display: { xs: "inline", sm: "none" } }}
                    >
                      Next →
                    </Box>
                  </ActionButton>
                </Box>
              </>
            )}
          </ContentSection>
        )}

        {/* Step 2: Select Pool */}
        {currentStep === 2 && !showConfirmation && (
          <ContentSection>
            <SectionTitle isDark={isDarkTheme}>Select Target Pool</SectionTitle>
            {inputCurrency && (
              <Typography
                variant="body2"
                sx={{
                  mb: { xs: 1, sm: 1.5 },
                  fontSize: { xs: "0.7rem", sm: "0.8rem" },
                  color: isDarkTheme
                    ? "rgba(255, 255, 255, 0.7)"
                    : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                }}
              >
                {filteredPools.length > 0
                  ? `${filteredPools.length} pool${
                      filteredPools.length > 1 ? "s" : ""
                    } ${
                      poolSearchQuery ? "found" : "available"
                    } for ${normalizeSymbol(
                      inputCurrency.symbol,
                      inputCurrency.tokenId,
                      inputCurrency.contractId
                    )}`
                  : poolSearchQuery
                  ? `No pools found matching "${poolSearchQuery}"`
                  : `No pools found for ${normalizeSymbol(
                      inputCurrency.symbol,
                      inputCurrency.tokenId,
                      inputCurrency.contractId
                    )}`}
              </Typography>
            )}
            {/* Search Input */}
            {availablePools.length > 0 && (
              <TextField
                fullWidth
                placeholder="Search pools by symbol or pool ID..."
                value={poolSearchQuery}
                onChange={(e) => {
                  setPoolSearchQuery(e.target.value);
                  setPage(1); // Reset to first page when searching
                }}
                sx={{
                  mb: { xs: 1, sm: 1.5 },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: { xs: 2, sm: 2.5 },
                    backgroundColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.02)",
                    "& fieldset": {
                      borderColor: isDarkTheme
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                    },
                    "&:hover fieldset": {
                      borderColor: isDarkTheme
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.2)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: isDarkTheme
                        ? "rgba(41, 88, 255, 0.5)"
                        : "#2958ff",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "inherit",
                    fontSize: { xs: "13px", sm: "14px" },
                    padding: { xs: "10px 12px", sm: "12px 14px" },
                    "&::placeholder": {
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.5)"
                        : "rgba(0, 0, 0, 0.5)",
                      opacity: 1,
                      fontSize: { xs: "12px", sm: "14px" },
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{
                          color: isDarkTheme
                            ? "rgba(255, 255, 255, 0.5)"
                            : "rgba(0, 0, 0, 0.5)",
                          fontSize: { xs: "20px", sm: "24px" },
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            )}
            {filteredPools.length > 0 ? (
              <Box
                sx={{
                  mb: { xs: 1, sm: 1.5 },
                  display: "flex",
                  flexDirection: "column",
                  gap: { xs: 0.5, sm: 0.75 },
                  maxHeight: { xs: "320px", sm: "400px" },
                  overflowY: "auto",
                  overflowX: "hidden",
                  width: "100%",
                  boxSizing: "border-box",
                  pr: { xs: 0.5, sm: 1 },
                  // Custom scrollbar styling
                  "&::-webkit-scrollbar": {
                    width: { xs: "6px", sm: "8px" },
                  },
                  "&::-webkit-scrollbar-track": {
                    background: isDarkTheme
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.05)",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: isDarkTheme
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(0, 0, 0, 0.2)",
                    borderRadius: "4px",
                    "&:hover": {
                      background: isDarkTheme
                        ? "rgba(255, 255, 255, 0.3)"
                        : "rgba(0, 0, 0, 0.3)",
                    },
                  },
                }}
              >
                {filteredPools
                  .slice((page - 1) * poolsPerPage, page * poolsPerPage)
                  .map((pool) => {
                    const normalized = normalizePoolPair(pool);
                    return (
                      <PoolCard
                        key={pool.poolId}
                        onClick={() =>
                          handlePoolSelect(
                            pool.poolId,
                            pool.contractId.toString()
                          )
                        }
                        isSelected={selectedPoolId === pool.poolId}
                        isDark={isDarkTheme}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            gap: { xs: 0.75, sm: 1 },
                            minWidth: 0, // Allow flex items to shrink below their content size
                            boxSizing: "border-box",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: { xs: 0.75, sm: 1 },
                              minWidth: 0, // Allow this to shrink
                              flex: "1 1 auto", // Take available space but can shrink
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                position: "relative",
                                flexShrink: 0, // Don't shrink icons
                                marginRight: { xs: 0.5, sm: 0.75 }, // Add space for overlapping icon
                                overflow: "visible", // Ensure overlapping icons are visible
                              }}
                            >
                              <Box
                                sx={{
                                  position: "relative",
                                  zIndex: 1,
                                  display: "flex",
                                }}
                              >
                                {(() => {
                                  const iconIdA = normalized.displayTokAId
                                    ? getIconId(
                                        Number(normalized.displayTokAId)
                                      )
                                    : 0;
                                  // Check if displayIconA is a valid non-empty string
                                  const hasValidIconA =
                                    normalized.displayIconA &&
                                    normalized.displayIconA.trim() !== "";
                                  const iconA = hasValidIconA
                                    ? normalized.displayIconA
                                    : normalized.displayTokAId &&
                                      normalized.displayTokAId !== ""
                                    ? getTokenIconUrl(
                                        normalized.displayTokAId,
                                        normalized.displaySymbolA
                                      )
                                    : `https://asset-verification.nautilus.sh/icons/${iconIdA}.png`;

                                  return (
                                    <img
                                      src={iconA}
                                      alt={normalized.displaySymbolA || "Token"}
                                      style={{
                                        width: width < 600 ? "24px" : "28px",
                                        height: width < 600 ? "24px" : "28px",
                                        borderRadius: "50%",
                                        border: `2px solid ${
                                          isDarkTheme
                                            ? "rgba(255, 255, 255, 0.1)"
                                            : "rgba(0, 0, 0, 0.1)"
                                        }`,
                                        objectFit: "cover",
                                        backgroundColor: isDarkTheme
                                          ? "rgba(255, 255, 255, 0.05)"
                                          : "rgba(0, 0, 0, 0.02)",
                                        display: "block",
                                        flexShrink: 0,
                                      }}
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        // Prevent infinite loop by checking if we're already on fallback
                                        if (
                                          target.src.includes("/0.png") &&
                                          target.dataset.fallbackAttempted
                                        ) {
                                          return; // Already tried fallback, stop
                                        }

                                        // Try fallback to direct tokenId if different from iconId
                                        if (
                                          normalized.displayTokAId &&
                                          normalized.displayTokAId !== "" &&
                                          Number(normalized.displayTokAId) !==
                                            iconIdA &&
                                          !target.dataset.fallbackAttempted
                                        ) {
                                          target.dataset.fallbackAttempted =
                                            "true";
                                          target.src = `https://asset-verification.nautilus.sh/icons/${normalized.displayTokAId}.png`;
                                        } else {
                                          // Final fallback to default VOI icon
                                          target.dataset.fallbackAttempted =
                                            "true";
                                          target.src =
                                            "https://asset-verification.nautilus.sh/icons/0.png";
                                        }
                                      }}
                                    />
                                  );
                                })()}
                              </Box>
                              <Box
                                sx={{
                                  position: "relative",
                                  marginLeft: width < 600 ? "-8px" : "-10px",
                                  zIndex: 2,
                                  display: "flex",
                                }}
                              >
                                {(() => {
                                  const iconIdB = normalized.displayTokBId
                                    ? getIconId(
                                        Number(normalized.displayTokBId)
                                      )
                                    : 0;
                                  // Check if displayIconB is a valid non-empty string
                                  const hasValidIconB =
                                    normalized.displayIconB &&
                                    normalized.displayIconB.trim() !== "";
                                  const iconB = hasValidIconB
                                    ? normalized.displayIconB
                                    : normalized.displayTokBId &&
                                      normalized.displayTokBId !== ""
                                    ? getTokenIconUrl(
                                        normalized.displayTokBId,
                                        normalized.displaySymbolB
                                      )
                                    : `https://asset-verification.nautilus.sh/icons/${iconIdB}.png`;

                                  return (
                                    <img
                                      src={iconB}
                                      alt={normalized.displaySymbolB || "Token"}
                                      style={{
                                        width: width < 600 ? "24px" : "28px",
                                        height: width < 600 ? "24px" : "28px",
                                        borderRadius: "50%",
                                        border: `2px solid ${
                                          isDarkTheme
                                            ? "rgba(255, 255, 255, 0.1)"
                                            : "rgba(0, 0, 0, 0.1)"
                                        }`,
                                        objectFit: "cover",
                                        backgroundColor: isDarkTheme
                                          ? "rgba(255, 255, 255, 0.05)"
                                          : "rgba(0, 0, 0, 0.02)",
                                        display: "block",
                                        flexShrink: 0,
                                      }}
                                      onError={(e) => {
                                        const target = e.currentTarget;
                                        // Prevent infinite loop by checking if we're already on fallback
                                        if (
                                          target.src.includes("/0.png") &&
                                          target.dataset.fallbackAttempted
                                        ) {
                                          return; // Already tried fallback, stop
                                        }

                                        // Try fallback to direct tokenId if different from iconId
                                        if (
                                          normalized.displayTokBId &&
                                          normalized.displayTokBId !== "" &&
                                          Number(normalized.displayTokBId) !==
                                            iconIdB &&
                                          !target.dataset.fallbackAttempted
                                        ) {
                                          target.dataset.fallbackAttempted =
                                            "true";
                                          target.src = `https://asset-verification.nautilus.sh/icons/${normalized.displayTokBId}.png`;
                                        } else {
                                          // Final fallback to default VOI icon
                                          target.dataset.fallbackAttempted =
                                            "true";
                                          target.src =
                                            "https://asset-verification.nautilus.sh/icons/0.png";
                                        }
                                      }}
                                    />
                                  );
                                })()}
                              </Box>
                            </Box>
                            <Typography
                              sx={{
                                color: isDarkTheme
                                  ? "rgba(255, 255, 255, 0.95)"
                                  : "inherit",
                                fontWeight: 600,
                                fontSize: { xs: "12px", sm: "14px" },
                                fontFamily: "monospace",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                minWidth: 0, // Allow text to shrink
                                maxWidth: "100%", // Ensure it respects container bounds
                              }}
                              title={
                                normalized.displaySymbolA &&
                                normalized.displaySymbolB
                                  ? `${normalized.displaySymbolA}/${normalized.displaySymbolB}`
                                  : pool.poolId || "Unknown Pool"
                              }
                            >
                              {normalized.displaySymbolA &&
                              normalized.displaySymbolB
                                ? `${normalized.displaySymbolA}/${normalized.displaySymbolB}`
                                : pool.poolId || "Unknown Pool"}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              textAlign: "right",
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.25,
                              flexShrink: 0, // Don't shrink the right side
                              flexBasis: { xs: "auto", sm: "auto" },
                              minWidth: {
                                xs: "fit-content",
                                sm: "fit-content",
                              },
                              alignItems: { xs: "flex-end", sm: "flex-end" },
                            }}
                          >
                            <Typography
                              sx={{
                                color: isDarkTheme
                                  ? "rgba(255, 255, 255, 0.95)"
                                  : "inherit",
                                fontWeight: 700,
                                fontSize: { xs: "11px", sm: "13px" },
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                gap: 0.4,
                                whiteSpace: "nowrap", // Prevent wrapping
                              }}
                            >
                              {/*<Box
                                component="svg"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 500 446.4"
                                sx={{
                                  width: { xs: "9px", sm: "12px" },
                                  height: { xs: "9px", sm: "12px" },
                                  flexShrink: 0,
                                  display: "inline-block",
                                }}
                              >
                                <path
                                  fill={isDarkTheme ? "#a78bfa" : "#6f2ae2"}
                                  d="M243.7,446.3c-34.1,0-65.5-18.1-82.6-47.6L12.9,143.6C-13.6,97.9,2,39.4,47.6,12.9 C93.3-13.6,151.7,2,178.2,47.6l65.5,112.8l65.5-112.8c26.5-45.6,85-61.2,130.6-34.7c45.6,26.5,61.2,85,34.7,130.6L326.4,398.8 C309.3,428.2,277.8,446.3,243.7,446.3z"
                                />
                              </Box>*/}
                              {pool.tvl && pool.tvl > 0
                                ? `$${pool.tvl.toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                    minimumFractionDigits: 0,
                                  })}`
                                : "—"}
                            </Typography>
                            <Typography
                              sx={{
                                color: isDarkTheme
                                  ? "rgba(76, 175, 80, 0.9)"
                                  : "#4caf50",
                                fontWeight: 600,
                                fontSize: { xs: "10px", sm: "12px" },
                                whiteSpace: "nowrap", // Prevent wrapping
                              }}
                            >
                              APR:{" "}
                              {(() => {
                                const totalApr = calculateTotalApr(pool);
                                return totalApr > 0
                                  ? `${totalApr.toFixed(2)}%`
                                  : "—";
                              })()}
                            </Typography>
                          </Box>
                        </Box>
                      </PoolCard>
                    );
                  })}
              </Box>
            ) : availablePools.length > 0 ? (
              <Typography
                sx={{
                  color: isDarkTheme
                    ? "rgba(255, 255, 255, 0.6)"
                    : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                }}
              >
                No pools match your search
              </Typography>
            ) : (
              <Typography
                sx={{
                  color: isDarkTheme
                    ? "rgba(255, 255, 255, 0.6)"
                    : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                }}
              >
                No pools available for this token
              </Typography>
            )}
            <Box
              sx={{
                mt: 2,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: { xs: "center", sm: "space-between" },
                alignItems: "stretch",
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              <ActionButton
                variant="secondary"
                onClick={handlePrevStep}
                isDark={isDarkTheme}
                style={{ width: "100%" }}
              >
                Back
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleNextStep}
                disabled={!canProceedToNext}
                isDark={isDarkTheme}
                style={{ width: "100%" }}
              >
                <Box
                  component="span"
                  sx={{ display: { xs: "none", sm: "inline" } }}
                >
                  Next: Enter Amount
                </Box>
                <Box
                  component="span"
                  sx={{ display: { xs: "inline", sm: "none" } }}
                >
                  Next →
                </Box>
              </ActionButton>
            </Box>
          </ContentSection>
        )}

        {/* Step 3: Enter Amount */}
        {currentStep === 3 && !showConfirmation && (
          <ContentSection>
            <SectionTitle isDark={isDarkTheme}>Enter Amount</SectionTitle>

            {/* Token Pair Info and Switch */}
            {(() => {
              if (!selectedPool) return null;
              const poolDisplay = getNormalizedPoolDisplay(selectedPool);
              if (!poolDisplay) return null;

              return (
                <Box
                  sx={{
                    mb: 2,
                    p: { xs: 1.5, sm: 2 },
                    border: "1px solid",
                    borderColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.1)",
                    borderRadius: { xs: 2, sm: 3 },
                    bgcolor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.03)"
                      : "rgba(0, 0, 0, 0.02)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDarkTheme
                          ? "rgba(255, 255, 255, 0.7)"
                          : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                      }}
                    >
                      Pool:
                    </Typography>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      {(() => {
                        // Find token by matching contractId or tokenId
                        const tokAIdNum = Number(poolDisplay.tokAId);
                        const tokenA = tokens.find(
                          (t) =>
                            t.contractId === tokAIdNum ||
                            t.tokenId === tokAIdNum ||
                            (tokAIdNum === 0 &&
                              (t.tokenId === 0 ||
                                t.contractId === TOKEN_WVOI1)) ||
                            (tokAIdNum === TOKEN_WVOI1 &&
                              (t.tokenId === 0 || t.contractId === TOKEN_WVOI1))
                        );
                        const contractIdA = tokenA?.contractId || tokAIdNum;

                        const iconA =
                          poolDisplay.iconA ||
                          getTokenIconUrl(contractIdA, poolDisplay.symbolA);
                        return iconA ? (
                          <img
                            src={iconA}
                            alt={poolDisplay.symbolA}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null;
                      })()}
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        sx={{
                          color: isDarkTheme
                            ? "rgba(255, 255, 255, 0.9)"
                            : "inherit",
                          fontFamily: "monospace",
                        }}
                      >
                        {poolDisplay.symbolA}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isDarkTheme
                            ? "rgba(255, 255, 255, 0.7)"
                            : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                        }}
                      >
                        /
                      </Typography>
                      {(() => {
                        // Find token by matching contractId or tokenId
                        const tokBIdNum = Number(poolDisplay.tokBId);
                        const tokenB = tokens.find(
                          (t) =>
                            t.contractId === tokBIdNum ||
                            t.tokenId === tokBIdNum ||
                            (tokBIdNum === 0 &&
                              (t.tokenId === 0 ||
                                t.contractId === TOKEN_WVOI1)) ||
                            (tokBIdNum === TOKEN_WVOI1 &&
                              (t.tokenId === 0 || t.contractId === TOKEN_WVOI1))
                        );
                        const contractIdB = tokenB?.contractId || tokBIdNum;

                        const iconB =
                          poolDisplay.iconB ||
                          getTokenIconUrl(contractIdB, poolDisplay.symbolB);
                        return iconB ? (
                          <img
                            src={iconB}
                            alt={poolDisplay.symbolB}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null;
                      })()}
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        sx={{
                          color: isDarkTheme
                            ? "rgba(255, 255, 255, 0.9)"
                            : "inherit",
                          fontFamily: "monospace",
                        }}
                      >
                        {poolDisplay.symbolB}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={switchTokenInPair}
                    sx={{
                      borderRadius: { xs: 1.5, sm: 2 },
                      fontSize: { xs: "0.7rem", sm: "0.875rem" },
                      minWidth: "auto",
                      px: { xs: 0.75, sm: 1.5 },
                      py: { xs: 0.5, sm: 0.75 },
                      lineHeight: { xs: 1.2, sm: 1.5 },
                      borderColor: isDarkTheme
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.2)",
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.9)"
                        : "inherit",
                      "&:hover": {
                        borderColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.3)"
                          : "rgba(0, 0, 0, 0.3)",
                        bgcolor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(0, 0, 0, 0.05)",
                      },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ display: { xs: "none", sm: "inline" } }}
                    >
                      Switch Token
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        display: { xs: "flex", sm: "none" },
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SwapHorizIcon sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />
                    </Box>
                  </Button>
                </Box>
              );
            })()}

            {/* Simple Token Input (no token selection) */}
            {inputCurrency && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: { xs: 1.5, sm: 2 },
                  p: { xs: 1.5, sm: 2 },
                  border: "1px solid",
                  borderColor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                  borderRadius: { xs: 2, sm: 3 },
                  bgcolor: isDarkTheme
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(255, 255, 255, 0.95)",
                  boxShadow: isDarkTheme
                    ? "0 2px 8px rgba(0,0,0,0.2)"
                    : "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, sm: 2 },
                  }}
                >
                  {/* Token Display (read-only) */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      borderRadius: { xs: 2, sm: 2.5 },
                      bgcolor: isDarkTheme
                        ? "rgba(255, 255, 255, 0.08)"
                        : "rgba(0, 0, 0, 0.05)",
                      minWidth: "120px",
                    }}
                  >
                    {(() => {
                      const iconUrl = getTokenIconUrl(
                        inputCurrency.tokenId,
                        inputCurrency.symbol
                      );
                      return iconUrl ? (
                        <img
                          src={iconUrl}
                          alt={`${inputCurrency.symbol} icon`}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null;
                    })()}
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{
                        color: isDarkTheme
                          ? "rgba(255, 255, 255, 0.9)"
                          : "inherit",
                      }}
                    >
                      {normalizeSymbol(
                        inputCurrency.symbol,
                        inputCurrency.tokenId,
                        inputCurrency.contractId
                      )}
                    </Typography>
                  </Box>

                  {/* Amount Input */}
                  <TextField
                    type="number"
                    value={inputAmount}
                    onChange={(e) => handleInputAmountChange(e.target.value)}
                    placeholder="0.0"
                    variant="outlined"
                    size="small"
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: { xs: 2, sm: 2.5 },
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                        backgroundColor: isDarkTheme
                          ? "rgba(255, 255, 255, 0.03)"
                          : "rgba(255, 255, 255, 0.9)",
                        color: isDarkTheme
                          ? "rgba(255, 255, 255, 0.9)"
                          : "inherit",
                        "& fieldset": {
                          borderColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.1)",
                        },
                        "&:hover": {
                          backgroundColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(255, 255, 255, 1)",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: isDarkTheme
                              ? "rgba(41, 88, 255, 0.5)"
                              : "primary.main",
                          },
                        },
                        "&.Mui-focused": {
                          backgroundColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.08)"
                            : "rgba(255, 255, 255, 1)",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: isDarkTheme
                              ? "rgba(41, 88, 255, 0.7)"
                              : "primary.main",
                            borderWidth: 2,
                          },
                        },
                      },
                      "& .MuiInputBase-input": {
                        color: isDarkTheme
                          ? "rgba(255, 255, 255, 0.9)"
                          : "inherit",
                      },
                    }}
                  />
                </Box>

                {/* Balance Display and Max Button */}
                {(() => {
                  const tokenId = inputCurrency.tokenId ?? 0;
                  const contractId = inputCurrency.contractId ?? tokenId;
                  const isVOI =
                    tokenId === 0 ||
                    contractId === TOKEN_WVOI1 ||
                    tokenId === TOKEN_WVOI1;
                  let balance = null;

                  if (
                    isVOI ||
                    inputCurrency.symbol === "VOI" ||
                    inputCurrency.symbol === "WVOI" ||
                    inputCurrency.symbol === "wVOI"
                  ) {
                    balance = tokenBalances[0];
                  } else {
                    balance = tokenBalances[inputCurrency.tokenId];
                    if (!balance && inputCurrency.contractId !== undefined) {
                      balance = tokenBalances[inputCurrency.contractId];
                    }
                  }

                  const hasBalance = balance && balance !== "0";

                  if (!hasBalance && !balanceLoading) return null;

                  return (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        justifyContent: "space-between",
                        alignItems: { xs: "flex-start", sm: "center" },
                        gap: { xs: 1, sm: 0 },
                        mt: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        {balanceLoading ? (
                          <Box sx={{ width: { xs: "80px", sm: "100px" } }}>
                            <Skeleton variant="text" width="100%" height={20} />
                          </Box>
                        ) : hasBalance ? (
                          <>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                                color: isDarkTheme
                                  ? "rgba(255, 255, 255, 0.7)"
                                  : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                                wordBreak: "break-word",
                              }}
                            >
                              Balance: {balance}{" "}
                              {normalizeSymbol(
                                inputCurrency.symbol,
                                inputCurrency.tokenId,
                                inputCurrency.contractId
                              )}
                            </Typography>
                            {(() => {
                              const balanceNum = parseFloat(
                                balance.replace(/,/g, "")
                              );
                              const usdPrice =
                                dexPrices[inputCurrency.tokenId.toString()] ||
                                0;
                              const usdValue = balanceNum * usdPrice;
                              return usdValue > 0 ? (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: { xs: "0.65rem", sm: "0.75rem" },
                                    color: isDarkTheme
                                      ? "rgba(255, 255, 255, 0.6)"
                                      : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                                  }}
                                >
                                  ≈ $
                                  {usdValue.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                </Typography>
                              ) : null;
                            })()}
                          </>
                        ) : null}
                      </Box>
                      {hasBalance && handleMaxClick && (
                        <Button
                          variant="text"
                          size="small"
                          onClick={handleMaxClick}
                          sx={{
                            textTransform: "none",
                            fontSize: { xs: "0.75rem", sm: "0.875rem" },
                            minWidth: { xs: "48px", sm: "auto" },
                            minHeight: { xs: "36px", sm: "auto" },
                            padding: { xs: "6px 12px", sm: "4px 8px" },
                            color: isDarkTheme
                              ? "rgba(41, 88, 255, 0.9)"
                              : "primary.main",
                            "&:hover": {
                              bgcolor: isDarkTheme
                                ? "rgba(41, 88, 255, 0.1)"
                                : "rgba(41, 88, 255, 0.05)",
                            },
                          }}
                        >
                          Max
                        </Button>
                      )}
                    </Box>
                  );
                })()}

                {balanceError && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="error">
                      Failed to load balance: {balanceError}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Impact and Share Display - Hidden for now */}
            {/* {selectedPool && inputAmount && parseFloat(inputAmount) > 0 && (
              <Box sx={{ 
                mt: 2,
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: { xs: 2, sm: 3 },
                bgcolor: "background.paper",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: "bold", color: "text.primary" }}>
                  Transaction Impact
                </Typography>
                
                {impactLoading ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="40%" height={20} />
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Estimated Pool Share:
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium" color="primary.main">
                          {estimatedShare.toFixed(4)}%
                        </Typography>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: "50%", 
                          bgcolor: estimatedShare > 1 ? "warning.main" : "success.main" 
                        }} />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Price Impact:
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          color={
                            priceImpact > 2 ? "error.main" :
                            priceImpact > 1 ? "warning.main" :
                            "success.main"
                          }
                        >
                          {priceImpact.toFixed(3)}%
                        </Typography>
                        <Box sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: "50%", 
                          bgcolor: 
                            priceImpact > 2 ? "error.main" :
                            priceImpact > 1 ? "warning.main" :
                            "success.main"
                        }} />
                      </Box>
                    </Box>
                    
                    <Box sx={{ 
                      mt: 1,
                      p: { xs: 1, sm: 1.5 },
                      borderRadius: 1,
                      bgcolor: 
                        priceImpact > 2 ? "error.light" :
                        priceImpact > 1 ? "warning.light" :
                        "success.light",
                      border: "1px solid",
                      borderColor: 
                        priceImpact > 2 ? "error.main" :
                        priceImpact > 1 ? "warning.main" :
                        "success.main"
                    }}>
                      <Typography 
                        variant="caption" 
                        color={
                          priceImpact > 2 ? "error.dark" :
                          priceImpact > 1 ? "warning.dark" :
                          "success.dark"
                        }
                        sx={{ fontWeight: "medium" }}
                      >
                        {priceImpact > 2 ? "⚠️ High Impact" :
                         priceImpact > 1 ? "⚡ Moderate Impact" :
                         "✅ Low Impact"}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color={
                          priceImpact > 2 ? "error.dark" :
                          priceImpact > 1 ? "warning.dark" :
                          "success.dark"
                        }
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        {priceImpact > 2 ? "Large transaction may significantly affect pool price" :
                         priceImpact > 1 ? "Transaction will have noticeable price impact" :
                         "Transaction will have minimal price impact"}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )} */}
            <Box
              sx={{
                mt: 2,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                justifyContent: { xs: "center", sm: "space-between" },
                alignItems: "stretch",
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              <ActionButton
                variant="secondary"
                onClick={handlePrevStep}
                isDark={isDarkTheme}
                style={{ width: "100%" }}
              >
                Back
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleZapConfirm}
                disabled={!canProceedToNext || isLoading}
                isDark={isDarkTheme}
                style={{ width: "100%" }}
              >
                {isLoading ? "Processing..." : "Confirm Zap"}
              </ActionButton>
            </Box>
          </ContentSection>
        )}

        {/* Confirmation Page */}
        {showConfirmation && (
          <ContentSection>
            <SectionTitle isDark={isDarkTheme}>
              Confirm Zap Transaction
            </SectionTitle>

            {/* Transaction Summary */}
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                borderRadius: { xs: 2, sm: 3 },
                mb: { xs: 2, sm: 3 },
                bgcolor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(0, 0, 0, 0.02)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  mb: 2,
                  fontWeight: "bold",
                  color: isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "inherit",
                }}
              >
                Transaction Summary
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Input Token */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                    }}
                  >
                    Input Token:
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {(() => {
                      const contractId =
                        inputCurrency?.contractId ||
                        inputCurrency?.tokenId ||
                        0;
                      const iconId = getIconId(contractId);
                      const iconUrl = `https://asset-verification.nautilus.sh/icons/${iconId}.png`;
                      return (
                        <img
                          src={iconUrl}
                          alt={`${inputCurrency?.symbol} icon`}
                          style={{ width: 20, height: 20, borderRadius: "50%" }}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallbackAttempted) {
                              target.dataset.fallbackAttempted = "true";
                              // Try fallback to contractId if different from iconId
                              if (contractId !== iconId) {
                                target.src = `https://asset-verification.nautilus.sh/icons/${contractId}.png`;
                              } else {
                                // Final fallback to default VOI icon
                                target.src =
                                  "https://asset-verification.nautilus.sh/icons/0.png";
                              }
                            }
                          }}
                        />
                      );
                    })()}
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{
                        color: isDarkTheme
                          ? "rgba(255, 255, 255, 0.9)"
                          : "inherit",
                      }}
                    >
                      {inputAmount}{" "}
                      {inputCurrency
                        ? normalizeSymbol(
                            inputCurrency.symbol,
                            inputCurrency.tokenId,
                            inputCurrency.contractId
                          )
                        : ""}
                    </Typography>
                  </Box>
                </Box>

                {/* Target Pool */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                    }}
                  >
                    Target Pool:
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {selectedPool &&
                      (() => {
                        const poolDisplay =
                          getNormalizedPoolDisplay(selectedPool);
                        if (!poolDisplay) {
                          return (
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                              sx={{
                                color: isDarkTheme
                                  ? "rgba(255, 255, 255, 0.9)"
                                  : "inherit",
                                fontFamily: "monospace",
                              }}
                            >
                              {`${selectedPool.symbolA}/${selectedPool.symbolB}`}
                            </Typography>
                          );
                        }

                        // Find tokens by matching contractId or tokenId
                        const tokAIdNum = Number(poolDisplay.tokAId);
                        const tokenA = tokens.find(
                          (t) =>
                            t.contractId === tokAIdNum ||
                            t.tokenId === tokAIdNum ||
                            (tokAIdNum === 0 &&
                              (t.tokenId === 0 ||
                                t.contractId === TOKEN_WVOI1)) ||
                            (tokAIdNum === TOKEN_WVOI1 &&
                              (t.tokenId === 0 || t.contractId === TOKEN_WVOI1))
                        );
                        const contractIdA = tokenA?.contractId || tokAIdNum;

                        const tokBIdNum = Number(poolDisplay.tokBId);
                        const tokenB = tokens.find(
                          (t) =>
                            t.contractId === tokBIdNum ||
                            t.tokenId === tokBIdNum ||
                            (tokBIdNum === 0 &&
                              (t.tokenId === 0 ||
                                t.contractId === TOKEN_WVOI1)) ||
                            (tokBIdNum === TOKEN_WVOI1 &&
                              (t.tokenId === 0 || t.contractId === TOKEN_WVOI1))
                        );
                        const contractIdB = tokenB?.contractId || tokBIdNum;

                        const iconA =
                          poolDisplay.iconA ||
                          getTokenIconUrl(contractIdA, poolDisplay.symbolA);
                        const iconB =
                          poolDisplay.iconB ||
                          getTokenIconUrl(contractIdB, poolDisplay.symbolB);

                        return (
                          <>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                position: "relative",
                              }}
                            >
                              <img
                                src={iconA}
                                alt={poolDisplay.symbolA}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  border: `2px solid ${
                                    isDarkTheme
                                      ? "rgba(255, 255, 255, 0.1)"
                                      : "rgba(0, 0, 0, 0.1)"
                                  }`,
                                  display: "block",
                                }}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (!target.dataset.fallbackAttempted) {
                                    target.dataset.fallbackAttempted = "true";
                                    target.src = `https://asset-verification.nautilus.sh/icons/${contractIdA}.png`;
                                  }
                                }}
                              />
                              <img
                                src={iconB}
                                alt={poolDisplay.symbolB}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  border: `2px solid ${
                                    isDarkTheme
                                      ? "rgba(255, 255, 255, 0.1)"
                                      : "rgba(0, 0, 0, 0.1)"
                                  }`,
                                  marginLeft: -8,
                                  display: "block",
                                  position: "relative",
                                  zIndex: 1,
                                }}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (!target.dataset.fallbackAttempted) {
                                    target.dataset.fallbackAttempted = "true";
                                    target.src = `https://asset-verification.nautilus.sh/icons/${contractIdB}.png`;
                                  }
                                }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                              sx={{
                                color: isDarkTheme
                                  ? "rgba(255, 255, 255, 0.9)"
                                  : "inherit",
                                fontFamily: "monospace",
                              }}
                            >
                              {poolDisplay.pairName}
                            </Typography>
                          </>
                        );
                      })()}
                  </Box>
                </Box>

                {/* Pool TVL */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                    }}
                  >
                    Pool TVL:
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.9)"
                        : "inherit",
                    }}
                  >
                    {selectedPool && (
                      <>
                        {/*<svg
                          className="h-[14px] inline-block mb-4 p-1 w-[14px]"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 500 446.4"
                          style={{
                            verticalAlign: "middle",
                            marginRight: "2px",
                            width: "14px",
                            height: "14px",
                          }}
                        >
                          <path
                            fill={isDarkTheme ? "#8b5cf6" : "#6f2ae2"}
                            d="M243.7,446.3c-34.1,0-65.5-18.1-82.6-47.6L12.9,143.6C-13.6,97.9,2,39.4,47.6,12.9 C93.3-13.6,151.7,2,178.2,47.6l65.5,112.8l65.5-112.8c26.5-45.6,85-61.2,130.6-34.7c45.6,26.5,61.2,85,34.7,130.6L326.4,398.8 C309.3,428.2,277.8,446.3,243.7,446.3z"
                          />
                        </svg>*/}
                        ${selectedPool.tvl.toLocaleString()}
                      </>
                    )}
                  </Typography>
                </Box>

                {/* Pool APR */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.7)"
                        : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                    }}
                  >
                    Pool APR:
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ color: "#4caf50" }}
                  >
                    {selectedPool &&
                      `${calculateTotalApr(selectedPool).toFixed(2)}%`}
                  </Typography>
                </Box>

                {/* Estimated USD Value */}
                {inputCurrency &&
                  (() => {
                    const amountNum = parseFloat(inputAmount);
                    const usdPrice =
                      dexPrices[inputCurrency.tokenId.toString()] || 0;
                    const usdValue = amountNum * usdPrice;
                    return usdValue > 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: isDarkTheme
                              ? "rgba(255, 255, 255, 0.7)"
                              : "var(--Color-Neutral-Element-Secondary, #7e7e9a)",
                          }}
                        >
                          Estimated Value:
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          sx={{
                            color: isDarkTheme
                              ? "rgba(255, 255, 255, 0.9)"
                              : "inherit",
                          }}
                        >
                          ≈ $
                          {usdValue.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </Typography>
                      </Box>
                    ) : null;
                  })()}
              </Box>
            </Box>

            {/* Warning Message */}
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: isDarkTheme ? "rgba(255, 193, 7, 0.5)" : "#ffc107",
                borderRadius: { xs: 2, sm: 3 },
                mb: { xs: 2, sm: 3 },
                bgcolor: isDarkTheme
                  ? "rgba(255, 193, 7, 0.1)"
                  : "rgba(255, 193, 7, 0.1)",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: "medium",
                  color: isDarkTheme ? "rgba(255, 193, 7, 0.9)" : "#f57c00",
                }}
              >
                ⚠️ Important: Transaction may revert if price moves
                significantly
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  display: "block",
                  color: isDarkTheme ? "rgba(255, 193, 7, 0.8)" : "#f57c00",
                }}
              >
                Zap transactions involve swapping tokens and adding liquidity.
                Price movements during transaction processing may cause the
                transaction to fail.
              </Typography>
            </Box>

            {/* Transaction Note */}
            <Box
              sx={{
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: isDarkTheme
                  ? "rgba(33, 150, 243, 0.5)"
                  : "#2196f3",
                borderRadius: { xs: 2, sm: 3 },
                mb: { xs: 2, sm: 3 },
                bgcolor: isDarkTheme
                  ? "rgba(33, 150, 243, 0.1)"
                  : "rgba(33, 150, 243, 0.1)",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: "medium",
                  color: isDarkTheme ? "rgba(33, 150, 243, 0.9)" : "#1976d2",
                }}
              >
                📝 Transaction Note
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  display: "block",
                  color: isDarkTheme ? "rgba(33, 150, 243, 0.8)" : "#1976d2",
                }}
              >
                This zap transaction will swap {inputAmount}{" "}
                {inputCurrency
                  ? normalizeSymbol(
                      inputCurrency.symbol,
                      inputCurrency.tokenId,
                      inputCurrency.contractId
                    )
                  : ""}{" "}
                for pool tokens and add liquidity to the{" "}
                {selectedPool &&
                  (() => {
                    const poolDisplay = getNormalizedPoolDisplay(selectedPool);
                    return poolDisplay
                      ? poolDisplay.pairName
                      : `${selectedPool.symbolA}/${selectedPool.symbolB}`;
                  })()}{" "}
                pool. You will receive LP tokens representing your share of the
                pool.
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <ActionButton
                variant="secondary"
                onClick={handleBackFromConfirmation}
                isDark={isDarkTheme}
                style={{ minWidth: "120px" }}
              >
                Back
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={handleExecuteZap}
                disabled={isLoading}
                isDark={isDarkTheme}
                style={{
                  minWidth: "120px",
                  background: isLoading
                    ? undefined
                    : "linear-gradient(45deg, #6f2ae2, #ffd700)",
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} color="inherit" />
                    Processing...
                  </Box>
                ) : (
                  "Execute Zap"
                )}
              </ActionButton>
            </Box>
          </ContentSection>
        )}

        {/* Show pools pagination if on step 2 */}
        {currentStep === 2 &&
          !showConfirmation &&
          filteredPools.length > poolsPerPage && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: { xs: 1.5, sm: 2 },
                "& .MuiPagination-root": {
                  "& .MuiPaginationItem-root": {
                    borderRadius: { xs: 1.5, sm: 2 },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "inherit",
                    borderColor: isDarkTheme
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(0, 0, 0, 0.2)",
                    "&.Mui-selected": {
                      backgroundColor: isDarkTheme
                        ? "rgba(41, 88, 255, 0.3)"
                        : "primary.main",
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.95)"
                        : "white",
                      borderColor: isDarkTheme
                        ? "rgba(41, 88, 255, 0.5)"
                        : "primary.main",
                      "&:hover": {
                        backgroundColor: isDarkTheme
                          ? "rgba(41, 88, 255, 0.4)"
                          : "primary.dark",
                      },
                    },
                    "&:hover": {
                      backgroundColor: isDarkTheme
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.05)",
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.9)"
                        : "inherit",
                    },
                    "&.Mui-disabled": {
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.3)"
                        : "rgba(0, 0, 0, 0.3)",
                    },
                  },
                  "& .MuiPaginationItem-icon": {
                    color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "inherit",
                    "&.Mui-disabled": {
                      color: isDarkTheme
                        ? "rgba(255, 255, 255, 0.3)"
                        : "rgba(0, 0, 0, 0.3)",
                    },
                  },
                },
              }}
            >
              <Pagination
                count={Math.ceil(filteredPools.length / poolsPerPage)}
                page={page}
                onChange={(event, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}

        <Dialog
          open={isModalOpen}
          onClose={handleCloseModal}
          aria-labelledby="zap-confirmation-title"
          aria-describedby="zap-confirmation-description"
          PaperProps={{
            sx: {
              borderRadius: { xs: 3, sm: 4 },
              maxWidth: { xs: "95%", sm: 480 },
              width: { xs: "95%", sm: "auto" },
            },
          }}
        >
          <DialogTitle>Confirm Zap Transaction</DialogTitle>
          <DialogContent>
            <Typography>
              Input: {inputAmount}{" "}
              {inputCurrency
                ? normalizeSymbol(
                    inputCurrency.symbol,
                    inputCurrency.tokenId,
                    inputCurrency.contractId
                  )
                : ""}
            </Typography>
            {estimatedOutput && (
              <Typography>Estimated Output: {estimatedOutput}</Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Transaction may revert if price moves significantly
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseModal}>Cancel</Button>
            <Button variant="contained" color="primary" onClick={handleZap}>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </ZapRoot>

      <Dialog
        open={isSigningModalOpen}
        sx={{
          "& .MuiDialog-paper": {
            minWidth: { xs: "90%", sm: "400px" },
            borderRadius: { xs: 3, sm: 4 },
            maxWidth: { xs: "95%", sm: 480 },
          },
          "& .MuiBackdrop-root": {
            backdropFilter: "grayscale(1)",
          },
        }}
      >
        <DialogTitle>Almost there!</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              py: 3,
              minWidth: "360px",
              minHeight: "240px",
            }}
          >
            <ZapAnimation />
            <Typography
              align="center"
              sx={{
                minHeight: "3em",
                display: "flex",
                alignItems: "center",
                width: "100%",
                maxWidth: "320px",
              }}
            >
              {loadingMessages[loadingMessage]}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <>
        {showSuccessModal && showConfetti && (
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
          open={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setShowConfetti(false);
          }}
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
                <IconButton
                  onClick={() => {
                    setShowSuccessModal(false);
                    setShowConfetti(false);
                  }}
                  sx={{
                    position: "absolute",
                    right: 16,
                    top: 16,
                    color: isDarkTheme ? "#FFFFFF" : "#161717",
                    zIndex: 1700,
                  }}
                >
                  <CloseIcon sx={{ fontSize: 24 }} />
                </IconButton>

                <ModalTitleContainer>
                  <CheckCircleIcon
                    sx={{
                      fontSize: 80,
                      color: isDarkTheme ? "#FFBE1D" : "#9933FF",
                    }}
                  />
                  <ModalTitle className={isDarkTheme ? "dark" : "light"}>
                    Zap Successful
                  </ModalTitle>
                </ModalTitleContainer>

                {successDetails && (
                  <>
                    <ZapInfoContainer $isDarkTheme={isDarkTheme}>
                      <ZapInfoRow $isDarkTheme={isDarkTheme}>
                        <ZapInfoLabel $isDarkTheme={isDarkTheme}>
                          Amount Zapped:
                        </ZapInfoLabel>
                        <ZapInfoValue $isDarkTheme={isDarkTheme}>
                          {successDetails.inputAmount}{" "}
                          {successDetails.inputToken}
                        </ZapInfoValue>
                      </ZapInfoRow>
                      <ZapInfoRow $isDarkTheme={isDarkTheme}>
                        <ZapInfoLabel $isDarkTheme={isDarkTheme}>
                          Target Pool:
                        </ZapInfoLabel>
                        <ZapInfoValue $isDarkTheme={isDarkTheme}>
                          {successDetails.poolName}
                        </ZapInfoValue>
                      </ZapInfoRow>
                      <ZapInfoRow $isDarkTheme={isDarkTheme}>
                        <ZapInfoLabel $isDarkTheme={isDarkTheme}>
                          Transaction ID:
                        </ZapInfoLabel>
                        <ZapInfoValue
                          $isDarkTheme={isDarkTheme}
                          onClick={() => {
                            navigator.clipboard.writeText(
                              successDetails.transactionId
                            );
                          }}
                          style={{
                            cursor: "pointer",
                            fontFamily: "monospace",
                            fontSize: "14px",
                          }}
                        >
                          {successDetails.transactionId.slice(0, 8)}...
                        </ZapInfoValue>
                      </ZapInfoRow>
                    </ZapInfoContainer>

                    <ButtonContainer
                      onClick={() => {
                        setShowSuccessModal(false);
                        setSuccessDetails(null);
                        setShowConfetti(false);
                        // Reset the form to start fresh
                        setCurrentStep(1);
                        setInputCurrency(null);
                        setTargetPairAddress("");
                        setInputAmount("");
                        setAvailablePools([]);
                        setSelectedPoolId(null);
                        setShowConfirmation(false);
                      }}
                    >
                      <ButtonBody>
                        <ButtonLabel>Start New Zap</ButtonLabel>
                      </ButtonBody>
                    </ButtonContainer>

                    <ExplorerButtonContainer
                      onClick={() => {
                        window.open(
                          `https://block.voi.network/explorer/transaction/${successDetails.transactionId}/arguments`,
                          "_blank"
                        );
                      }}
                    >
                      <ButtonBody>
                        <ButtonLabel>View on Explorer</ButtonLabel>
                      </ButtonBody>
                    </ExplorerButtonContainer>
                  </>
                )}
              </ModalBody>
            </ModalBodyContainer>
          </DialogContent>
        </CustomDialog>
      </>
    </GlobalStyles>
  );
};

export default Zap;
