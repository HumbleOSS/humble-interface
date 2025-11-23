import * as React from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { ARC200TokenI } from "../../types";
import {
  getTokensWithTickers,
  selectTokens,
  selectTickers,
} from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { tokenSymbol } from "../../utils/dex";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import { useWallet } from "@txnlab/use-wallet-react";
import { getAlgorandClients } from "../../wallets";
import axios from "axios";
import { ADS } from "../../config/ads";
import {
  TOKEN_VOI,
  TOKEN_AUSDC,
  TOKEN_AUSDT,
  TOKEN_AWBTC,
  TOKEN_AETH,
  TOKEN_WVOI1,
} from "../../constants/tokens";
import Skeleton from "@mui/material/Skeleton";

const Wrapper = styled.div`
  width: 86%;
  @media screen and (min-width: 640px) {
    width: fit-content;
  }
`;

const TokenButton = styled.div`
  display: flex;
  padding: var(--Spacing-400, 8px) var(--Spacing-600, 12px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  width: 100%;
  border-radius: var(--Radius-600, 13px);
  &.light {
    background: var(--Color-Accent-Primary-Background-Default, #41137e);
  }
  &.dark {
    background: var(
      --Color-Accent-Primary-Background-Hover,
      rgba(255, 255, 255, 0.8)
    );
  }
`;

const TokenButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
  cursor: pointer;
`;

const TokenButtonLabel = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 16.8px */
  min-width: 63px;
  text-align: center;
  &.light {
    color: var(--Color-Neutral-Element-Inverse, #fff);
  }
  &.dark {
    color: var(--Color-Neutral-Element-Inverse, #000);
  }
`;

const StyledMenuItem = styled.div`
  display: flex;
  padding: 8px 12px;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  border-radius: var(--Radius-600, 13px);
  border: 1px solid var(--Color-Neutral-Stroke-Primary, #d8d8e1);
  background: var(--Color-Neutral-Background-Base, #fff);
  cursor: pointer;

  &:hover {
    background: var(--Color-Neutral-Background-Hover, #f5f5f7);
  }
`;

const MenuContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  width: 100%;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: 16px;
  background: transparent;
  overflow: hidden;
`;

const IconButton = styled.div`
  display: flex;
  width: 32px;
  height: 32px;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: transparent;
`;

const ContentBody = styled.div`
  display: flex;
  align-items: flex-start;
  flex: 1 0 0;
  width: 100%;
`;

const ContentText = styled.div`
  color: var(--Color-Neutral-Element-Primary, #0c0c10);
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 19.2px */
`;

const options = [
  "None",
  "Atria",
  "Callisto",
  "Dione",
  "Ganymede",
  "Hangouts Call",
  "Luna",
  "Oberon",
  "Phobos",
  "Pyxis",
  "Sedna",
  "Titania",
  "Triton",
  "Umbriel",
];

const ITEM_HEIGHT = 48;

const ArrowDownwardIcon = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M16 10L12 14L8 10"
        stroke={isDarkTheme ? "#000" : "#fff"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid ${(props) => (props.theme.isDarkTheme ? "#333" : "#d8d8e1")};
  border-radius: 10px;
  background: ${(props) => (props.theme.isDarkTheme ? "#1a1a1a" : "#f8f8f9")};
`;

const ControlsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

const ControlLabel = styled.label`
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-weight: 500;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid ${(props) => (props.theme.isDarkTheme ? "#333" : "#d8d8e1")};
  border-radius: 8px;
  background: transparent;
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--Color-Accent-Primary-Background-Default, #41137e);
  }
`;

const Button = styled.button`
  padding: 8px 16px;
  border: 1px solid ${(props) => (props.theme.isDarkTheme ? "#333" : "#d8d8e1")};
  border-radius: 8px;
  background: ${(props) => (props.theme.isDarkTheme ? "#333" : "#f0f0f0")};
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.theme.isDarkTheme ? "#444" : "#e0e0e0")};
  }

  &.primary {
    background: var(--Color-Accent-Primary-Background-Default, #41137e);
    color: #fff;
    border-color: var(--Color-Accent-Primary-Background-Default, #41137e);

    &:hover {
      background: var(--Color-Accent-Primary-Background-Hover, #5a1ba8);
    }
  }
`;

interface LongMenuProps {
  onSelect: (token: ARC200TokenI) => void;
  options?: ARC200TokenI[];
  token?: ARC200TokenI;
}

const ModalBox = styled(Box)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 95%;
  max-width: 480px;
  background-color: ${(props) =>
    props.theme.isDarkTheme ? "#0a0a0a" : "#fff"};
  border: 1px solid
    ${(props) => (props.theme.isDarkTheme ? "#262626" : "#e5e7eb")};
  border-radius: 20px;
  padding: 0;
  max-height: 90vh;
  height: min(600px, 90vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: ${(props) =>
    props.theme.isDarkTheme
      ? "0 24px 64px rgba(0, 0, 0, 0.7)"
      : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"};
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px 8px;
  background: ${(props) =>
    props.theme.isDarkTheme ? "#0f0f0f" : "transparent"};
`;

const ModalHeading = styled.h2`
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#666")};
  font-size: 18px;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.theme.isDarkTheme ? "#333" : "#f3f4f6")};
    color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#6b7280")};
  font-family: "Plus Jakarta Sans";
  font-size: 13px;
  font-weight: 500;
`;

const SectionIcon = styled.div`
  font-size: 14px;
`;

const TokenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 16px;
`;

const TokenItem = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;

  &:hover {
    background: ${(props) => (props.theme.isDarkTheme ? "#171719" : "#f9fafb")};
  }
`;

const ModalContent = styled.div`
  padding: 0 20px 20px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  background: ${(props) => (props.theme.isDarkTheme ? "#0f0f0f" : "#fff")};
`;

const SearchContainer = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  margin-bottom: 12px;
  width: 100%;
  box-sizing: border-box;
  padding-top: 4px;
  padding-bottom: 6px;
  background: ${(props) => (props.theme.isDarkTheme ? "#0f0f0f" : "#fff")};
`;

const SearchInput = styled.input`
  width: calc(100% - 4px);
  padding: 12px 40px 12px 40px;
  border: 1px solid
    ${(props) => (props.theme.isDarkTheme ? "#2c2c2c" : "#e5e7eb")};
  border-radius: 12px;
  background: ${(props) => (props.theme.isDarkTheme ? "#1e1e1e" : "#f9fafb")};
  color: ${(props) => (props.theme.isDarkTheme ? "#f5f5f5" : "#111")};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: ${(props) => (props.theme.isDarkTheme ? "#8a8a8a" : "#9ca3af")};
  }

  &:focus {
    outline: none;
    border-color: ${(props) => (props.theme.isDarkTheme ? "#444" : "#cbd5e1")};
    background: ${(props) => (props.theme.isDarkTheme ? "#222" : "#f1f5f9")};
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#9ca3af")};
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ClearSearchButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#6b7280")};
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;

  &:hover {
    background: ${(props) => (props.theme.isDarkTheme ? "#333" : "#e5e7eb")};
  }
`;

const Collapsible = styled.div<{ open: boolean }>`
  overflow: hidden;
  transition: max-height 240ms ease, opacity 200ms ease;
  max-height: ${(props) => (props.open ? "500px" : "0px")};
  opacity: ${(props) => (props.open ? 1 : 0)};
  pointer-events: ${(props) => (props.open ? "auto" : "none")};
`;

const QuickButtonsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const QuickButtonsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
`;

const QuickButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid
    ${(props) => (props.theme.isDarkTheme ? "#242427" : "#e5e7eb")};
  border-radius: 8px;
  background: ${(props) => (props.theme.isDarkTheme ? "#161618" : "#f9fafb")};
  color: ${(props) => (props.theme.isDarkTheme ? "#f5f5f5" : "#111")};
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  width: 100%;

  &:hover {
    background: ${(props) => (props.theme.isDarkTheme ? "#1e1e21" : "#f3f4f6")};
    border-color: ${(props) =>
      props.theme.isDarkTheme ? "#2a2a2d" : "#d1d5db"};
  }

  &:active {
    transform: scale(0.98);
  }
`;

const AdContainer = styled.div`
  position: relative;
  flex: 1 1 50%;
  padding: 0;
  background: ${(props) => (props.theme.isDarkTheme ? "#111" : "#f9fafb")};
  border-radius: 12px;
  border: 1px solid ${(props) => (props.theme.isDarkTheme ? "#333" : "#e5e7eb")};
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);

  &::after {
    content: "";
    position: absolute;
    top: -30%;
    left: -30%;
    width: 160%;
    height: 60%;
    background: ${(props) =>
      props.theme.isDarkTheme
        ? `linear-gradient(to bottom, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0))`
        : `linear-gradient(to bottom, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0))`};
    transform: rotate(-8deg);
    pointer-events: none;
  }
`;

const AdImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  display: block;
`;

const AdLink = styled.a`
  display: block;
  width: 100%;
  height: 100%;
`;

const AdBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: ${(props) => (props.theme.isDarkTheme ? "#eaeaea" : "#111")};
  background: ${(props) =>
    props.theme.isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)"};
  border: 1px solid
    ${(props) =>
      props.theme.isDarkTheme ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)"};
  box-shadow: ${(props) =>
    props.theme.isDarkTheme
      ? "0 1px 3px rgba(0,0,0,0.6)"
      : "0 1px 2px rgba(0,0,0,0.06)"};
  backdrop-filter: blur(4px);
`;

const QuickButtonIcon = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${(props) => (props.theme.isDarkTheme ? "#444" : "#e5e7eb")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#6b7280")};
`;

const BalanceText = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#666")};
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
  font-weight: 500;
  text-align: right;
  min-width: 60px;
`;

const BalanceValueText = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#666" : "#888")};
  font-family: "Plus Jakarta Sans";
  font-size: 10px;
  font-weight: 400;
  text-align: right;
  margin-top: 1px;
  opacity: 0.8;
`;

const TokenRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const TokenInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const TokenIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
`;

const TokenDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const TokenName = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TokenSymbol = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#6b7280")};
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
`;

const TokenBalance = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`;

const BalanceAmount = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
`;

const BalanceValue = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#6b7280")};
  font-family: "Plus Jakarta Sans";
  font-size: 11px;
`;

const TokenPriceText = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#666")};
  font-family: "Plus Jakarta Sans";
  font-size: 11px;
  font-weight: 400;
  text-align: right;
  margin-top: 2px;
`;

const LiquidityText = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#666")};
  font-family: "Plus Jakarta Sans";
  font-size: 11px;
  font-weight: 400;
  text-align: right;
  margin-top: 2px;
`;

const TickerIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4caf50;
  margin-left: 4px;
  font-size: 8px;
  color: white;
  font-weight: bold;
`;

const LiquidityIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #2196f3;
  margin-left: 4px;
  font-size: 8px;
  color: white;
  font-weight: bold;
`;

const LiquidityRiskIndicator = styled.div<{
  risk: "low" | "medium" | "high" | "extreme";
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-left: 4px;
  font-size: 8px;
  color: white;
  font-weight: bold;
  background: ${(props) => {
    switch (props.risk) {
      case "low":
        return "#4caf50"; // Green
      case "medium":
        return "#ff9800"; // Orange
      case "high":
        return "#ff5722"; // Red-Orange
      case "extreme":
        return "#d32f2f"; // Deep Red
      default:
        return "#757575"; // Gray
    }
  }};
`;

const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-family: "Plus Jakarta Sans";
    white-space: pre-line;
    text-align: left;
    max-width: 180px;
    min-width: 180px;
    line-height: 1.35;
    z-index: 1000;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    word-wrap: break-word;
  }

  &:hover::before {
    content: "";
    position: absolute;
    bottom: calc(125% - 2px);
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    pointer-events: none;
  }
`;

const RefreshButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${(props) => (props.theme.isDarkTheme ? "#333" : "#d8d8e1")};
  border-radius: 6px;
  background: transparent;
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${(props) => (props.theme.isDarkTheme ? "#333" : "#f0f0f0")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BalanceHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const BalanceHeaderText = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#666")};
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
  font-weight: 500;
`;

const ErrorText = styled.div`
  color: #ff4444;
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(255, 68, 68, 0.3);
`;

const TotalValueText = styled.div`
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
  padding: 8px;
  background: ${(props) =>
    props.theme.isDarkTheme
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.03)"};
  border-radius: 8px;
  border: 1px solid
    ${(props) =>
      props.theme.isDarkTheme
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)"};
`;

// Quick button configuration based on token contract IDs
// Note: These IDs are contractIds, not tokenIds (for tokens with mappings like aUSDC)
const QUICK_BUTTONS = [
  {
    contractId: TOKEN_VOI, // VOI uses 0 as both contractId and tokenId
    symbol: "VOI",
    icon: "V",
    label: "VOI",
  },
  {
    contractId: 47138068, // WAD
    symbol: "WAD",
    icon: "W",
    label: "WAD",
  },
  {
    contractId: TOKEN_AUSDC, // aUSDC: contractId=395614, tokenId=302190
    symbol: "USDC",
    icon: "U",
    label: "USDC",
  },
  {
    contractId: 420069, // UNIT
    symbol: "UNIT",
    icon: "U",
    label: "UNIT",
  },
  {
    contractId: 413153, // aAlgo: contractId=413153, tokenId=302189
    symbol: "ALGO",
    icon: "A",
    label: "ALGO",
  },
];

const ToggleContainer = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  padding: 4px;
  background: ${(props) => (props.theme.isDarkTheme ? "#1a1a1a" : "#f3f4f6")};
  border-radius: 8px;
  border: 1px solid ${(props) => (props.theme.isDarkTheme ? "#333" : "#e5e7eb")};
`;

const ToggleButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: ${(props) =>
    props.active
      ? props.theme.isDarkTheme
        ? "#41137e"
        : "#41137e"
      : "transparent"};
  color: ${(props) =>
    props.active ? "#fff" : props.theme.isDarkTheme ? "#888" : "#6b7280"};
  font-family: "Plus Jakarta Sans";
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) =>
      props.active
        ? props.theme.isDarkTheme
          ? "#5a1ba8"
          : "#5a1ba8"
        : props.theme.isDarkTheme
        ? "#333"
        : "#e5e7eb"};
  }
`;

const TokenSelect: React.FC<LongMenuProps> = ({ token, options, onSelect }) => {
  const { activeAccount } = useWallet();
  console.log("token", token);
  console.log("options", options);
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const dispatch = useDispatch();
  const tokens: ARC200TokenI[] = useSelector(selectTokens);
  console.log("selecttokens", tokens);
  
  // Debug: Check if aUSDC is in the tokens from Redux store
  const ausdcInRedux = tokens.find(
    (t) => t.contractId === 395614 || t.tokenId === 302190 || t.symbol === "aUSDC" || t.name === "aUSDC"
  );
  if (ausdcInRedux) {
    console.log("aUSDC found in Redux store tokens:", ausdcInRedux);
  } else {
    console.log("aUSDC NOT found in Redux store. Total tokens:", tokens.length);
    console.log("Sample tokens from Redux:", tokens.slice(0, 5).map(t => ({ 
      symbol: t.symbol, 
      contractId: t.contractId, 
      tokenId: t.tokenId,
      name: t.name 
    })));
  }
  
  const tickers = useSelector(selectTickers);

  console.log("tickers", tickers);

  React.useEffect(() => {
    dispatch(getTokensWithTickers() as unknown as UnknownAction);
  }, [dispatch]);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const [adIndex, setAdIndex] = React.useState<number>(0);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortBy, setSortBy] = React.useState<
    | "name"
    | "marketCap"
    | "volume"
    | "price"
    | "currentPrice"
    | "balance"
    | "balanceValue"
    | "liquidity"
  >("balanceValue");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [useLiquidityAdjustment, setUseLiquidityAdjustment] =
    React.useState<boolean>(true);
  const [tokenBalances, setTokenBalances] = React.useState<
    Record<number, string>
  >({});
  const [displayCategory, setDisplayCategory] = React.useState<
    "yourTokens" | "byVolume"
  >("yourTokens");

  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    React.useState<string>("");
  React.useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearchTerm(searchTerm), 200);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // State for DEX prices
  const [dexPrices, setDexPrices] = React.useState<Record<string, number>>({});
  const [usdcPrice, setUsdcPrice] = React.useState<number>(1); // Default USDC to $1

  // Helper function to get token USD price from DEX data
  const getTokenUsdPrice = React.useCallback(
    (token: ARC200TokenI): number => {
      if (token.tokenId === undefined) return 0;
      // DEX prices are stored by contractId (or tokenId if no mapping)
      // Try contractId first, then fall back to tokenId
      const priceKey = token.contractId?.toString() ?? token.tokenId.toString();
      return dexPrices[priceKey] || dexPrices[token.tokenId.toString()] || 0;
    },
    [dexPrices]
  );

  // Helper function to calculate liquidity-adjusted balance value
  const getLiquidityAdjustedValue = React.useCallback(
    (token: ARC200TokenI, rawUsdValue: number): number => {
      if (!token.ticker?.liquidity_in_usd || rawUsdValue === 0) {
        return rawUsdValue;
      }

      const liquidityUsd = parseFloat(token.ticker.liquidity_in_usd);
      if (isNaN(liquidityUsd) || liquidityUsd <= 0) {
        return rawUsdValue;
      }

      // Calculate what percentage of total liquidity this balance represents
      const liquidityRatio = rawUsdValue / liquidityUsd;

      // Apply progressive discount based on liquidity impact
      let adjustmentFactor = 1;

      if (liquidityRatio > 0.5) {
        // Holdings > 50% of liquidity: Heavy discount (25-50% of face value)
        adjustmentFactor = Math.max(0.25, 1 - (liquidityRatio - 0.5) * 1.5);
      } else if (liquidityRatio > 0.2) {
        // Holdings 20-50% of liquidity: Moderate discount (60-85% of face value)
        adjustmentFactor = Math.max(0.6, 1 - (liquidityRatio - 0.2) * 0.83);
      } else if (liquidityRatio > 0.1) {
        // Holdings 10-20% of liquidity: Light discount (85-95% of face value)
        adjustmentFactor = Math.max(0.85, 1 - (liquidityRatio - 0.1) * 1.0);
      } else if (liquidityRatio > 0.05) {
        // Holdings 5-10% of liquidity: Very light discount (95-98% of face value)
        adjustmentFactor = Math.max(0.95, 1 - (liquidityRatio - 0.05) * 0.6);
      }
      // Holdings < 5% of liquidity: No discount (full face value)

      return rawUsdValue * adjustmentFactor;
    },
    []
  );

  // Helper function to get liquidity risk indicator
  const getLiquidityRisk = React.useCallback(
    (
      token: ARC200TokenI,
      rawUsdValue: number
    ): "low" | "medium" | "high" | "extreme" => {
      if (!token.ticker?.liquidity_in_usd || rawUsdValue === 0) {
        return "low";
      }

      const liquidityUsd = parseFloat(token.ticker.liquidity_in_usd);
      if (isNaN(liquidityUsd) || liquidityUsd <= 0) {
        return "high";
      }

      const liquidityRatio = rawUsdValue / liquidityUsd;

      if (liquidityRatio > 0.5) return "extreme";
      if (liquidityRatio > 0.2) return "high";
      if (liquidityRatio > 0.1) return "medium";
      return "low";
    },
    []
  );

  // Helper function to calculate balance value in USD using DEX prices
  const getBalanceValue = React.useCallback(
    (
      token: ARC200TokenI,
      adjusted: boolean = useLiquidityAdjustment
    ): number => {
      if (token.tokenId === undefined) return 0;
      // Use contractId for balance lookup since balances are stored by contractId
      const balanceKey = token.contractId ?? token.tokenId;
      const balance = tokenBalances[balanceKey];
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

      const rawValue = balanceNum * usdPrice;

      // Apply liquidity adjustment if enabled
      if (adjusted) {
        return getLiquidityAdjustedValue(token, rawValue);
      }

      return rawValue;
    },
    [
      tokenBalances,
      getTokenUsdPrice,
      useLiquidityAdjustment,
      getLiquidityAdjustedValue,
    ]
  );

  const filteredAndSortedTokens = React.useMemo(() => {
    // Merge options and tokens to ensure all tokens are available
    // If options is provided, merge it with tokens to avoid missing tokens
    const allTokens = options && options.length > 0 
      ? [...new Map([...tokens, ...options]
          .filter(t => t != null && (t.contractId != null || t.tokenId != null))
          .map(t => [t.contractId ?? t.tokenId, t])).values()]
      : tokens.filter(t => t != null);
    
    // Filter out tokens without tokenId first, as they can't be used
    let filtered = allTokens.filter((t) => t != null && t.tokenId !== undefined);
    
    // Debug: Check for aUSDC
    const ausdcToken = filtered.find(
      (t) => t.contractId === 395614 || t.tokenId === 302190 || t.symbol === "aUSDC" || t.name === "aUSDC"
    );
    if (ausdcToken) {
      console.log("aUSDC token found in filtered list:", ausdcToken);
    } else {
      console.log("aUSDC token NOT found. Total tokens:", filtered.length);
      console.log("options length:", options?.length || 0);
      console.log("tokens length:", tokens.length);
      console.log("allTokens length:", allTokens.length);
      console.log("Sample tokens:", filtered.slice(0, 5).map(t => ({ symbol: t.symbol, contractId: t.contractId, tokenId: t.tokenId })));
    }
    filtered = filtered.filter((t) => {
      if (!debouncedSearchTerm) return true;
      const searchLower = debouncedSearchTerm.toLowerCase();
      // Search by symbol, name, or tokenId
      const symbolMatch = tokenSymbol(t).toLowerCase().includes(searchLower);
      const nameMatch = (t.name || "").toLowerCase().includes(searchLower);
      const tokenIdMatch = (t.tokenId?.toString() || "").includes(
        debouncedSearchTerm
      );
      const contractIdMatch = (t.contractId?.toString() || "").includes(
        debouncedSearchTerm
      );
      return symbolMatch || nameMatch || tokenIdMatch || contractIdMatch;
    });

    // Sort tokens: tokens with balances first, then by selected criteria
    filtered.sort((a, b) => {
      // First, sort by balance (tokens with balances come first)
      // Use contractId for balance lookup since balances are stored by contractId
      const aBalanceKey = a.contractId ?? a.tokenId;
      const bBalanceKey = b.contractId ?? b.tokenId;
      const aBalance =
        aBalanceKey !== undefined ? tokenBalances[aBalanceKey] : undefined;
      const bBalance =
        bBalanceKey !== undefined ? tokenBalances[bBalanceKey] : undefined;
      const aHasBalance =
        aBalance &&
        aBalance !== "0" &&
        !isNaN(parseFloat(aBalance.replace(/,/g, "")));
      const bHasBalance =
        bBalance &&
        bBalance !== "0" &&
        !isNaN(parseFloat(bBalance.replace(/,/g, "")));

      if (aHasBalance && !bHasBalance) return -1;
      if (!aHasBalance && bHasBalance) return 1;

      // If both have the same balance status, sort by selected criteria
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "name":
          aValue = tokenSymbol(a).toLowerCase();
          bValue = tokenSymbol(b).toLowerCase();
          break;
        case "marketCap":
          // Use tokenId as a fallback since marketCap is not available
          aValue = a.tokenId || 0;
          bValue = b.tokenId || 0;
          break;
        case "volume":
          // Use decimals as a fallback since volume24h is not available
          aValue = a.decimals || 0;
          bValue = b.decimals || 0;
          break;
        case "price":
          // Sort by latest price with fallback to 0 if undefined
          aValue =
            typeof a.change_24?.latest_price === "number" &&
            !isNaN(a.change_24.latest_price)
              ? a.change_24.latest_price
              : 0;
          bValue =
            typeof b.change_24?.latest_price === "number" &&
            !isNaN(b.change_24.latest_price)
              ? b.change_24.latest_price
              : 0;
          break;
        case "currentPrice":
          // Sort by token USD price from DEX data
          aValue = getTokenUsdPrice(a);
          bValue = getTokenUsdPrice(b);
          break;
        case "balance":
          // Sort by balance value
          const aBalanceNum = aBalance
            ? parseFloat(aBalance.replace(/,/g, ""))
            : 0;
          const bBalanceNum = bBalance
            ? parseFloat(bBalance.replace(/,/g, ""))
            : 0;
          aValue = aBalanceNum;
          bValue = bBalanceNum;
          break;
        case "balanceValue":
          // Sort by USD value of balance (balance × price)
          aValue = getBalanceValue(a);
          bValue = getBalanceValue(b);
          break;
        case "liquidity":
          // Sort by liquidity in USD from ticker data
          const aLiquidity = a.ticker?.liquidity_in_usd
            ? parseFloat(a.ticker.liquidity_in_usd)
            : 0;
          const bLiquidity = b.ticker?.liquidity_in_usd
            ? parseFloat(b.ticker.liquidity_in_usd)
            : 0;
          aValue = isNaN(aLiquidity) ? 0 : aLiquidity;
          bValue = isNaN(bLiquidity) ? 0 : bLiquidity;
          break;
        default:
          aValue = tokenSymbol(a).toLowerCase();
          bValue = tokenSymbol(b).toLowerCase();
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [
    options,
    tokens,
    searchTerm,
    sortBy,
    sortOrder,
    tokenBalances,
    getBalanceValue,
    getTokenUsdPrice,
  ]);

  const userTokens = React.useMemo(() => {
    // Merge options and tokens to ensure all tokens are available
    const allTokens = options && options.length > 0 
      ? [...new Map([...tokens, ...options]
          .filter(t => t != null && (t.contractId != null || t.tokenId != null))
          .map(t => [t.contractId ?? t.tokenId, t])).values()]
      : tokens.filter(t => t != null);
    const source = allTokens.filter((t) => t != null && t.tokenId !== undefined);
    const withBalance = source.filter((t) => {
      // Use contractId for balance lookup since balances are stored by contractId
      const balanceKey = t.contractId ?? t.tokenId!;
      const bal = tokenBalances[balanceKey];
      const num = bal ? parseFloat(bal.replace(/,/g, "")) : 0;
      return !!num && !isNaN(num) && num > 0;
    });

    withBalance.sort((a, b) => getBalanceValue(b) - getBalanceValue(a));
    return withBalance;
  }, [options, tokens, tokenBalances, getBalanceValue]);

  const tokensByVolume = React.useMemo(() => {
    // Merge options and tokens to ensure all tokens are available
    const source = options && options.length > 0 
      ? [...new Map([...tokens, ...options]
          .filter(t => t != null && (t.contractId != null || t.tokenId != null))
          .map(t => [t.contractId ?? t.tokenId, t])).values()]
      : tokens.filter(t => t != null);
    const scored = source.map((t) => {
      let volUsd = 0;
      if (t.ticker) {
        const baseVol = parseFloat(t.ticker.base_volume || "0");
        const targetVol = parseFloat(t.ticker.target_volume || "0");
        const tokenIdStr = String(t.tokenId);
        const isBase = t.ticker.base_currency_id === tokenIdStr;
        const tokenVol = isBase ? baseVol : targetVol;
        const usdPrice = getTokenUsdPrice(t) || 0;
        volUsd = (isNaN(tokenVol) ? 0 : tokenVol) * usdPrice;
      }
      return { token: t, volUsd };
    });

    scored.sort((a, b) => b.volUsd - a.volUsd);
    return scored.map((s) => s.token);
  }, [options, tokens, getTokenUsdPrice]);

  // State for balance loading and errors
  const [balanceLoading, setBalanceLoading] = React.useState(false);
  const [balanceError, setBalanceError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  // Fetch DEX prices for USD calculations
  const fetchDexPrices = React.useCallback(async () => {
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

        // Find USDC (aUSDC - contractId: 395614) price in VOI
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
  const fetchBalances = React.useCallback(async () => {
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
        response.data.balances.forEach((balanceItem: any) => {
          const contractId = balanceItem.contractId;
          const balance = balanceItem.balance || "0";
          const decimals = balanceItem.decimals || 0;

          // Convert balance to human readable format
          if (balance !== "0") {
            const balanceNumber = parseFloat(balance) / Math.pow(10, decimals);
            balances[contractId] = balanceNumber.toLocaleString(undefined, {
              maximumFractionDigits: Math.min(6, decimals),
              minimumFractionDigits: 0,
            });
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

  // Initial balance fetch and periodic refresh
  React.useEffect(() => {
    fetchBalances();

    // Set up periodic refresh every 3 minutes when modal is open
    if (open) {
      const interval = setInterval(fetchBalances, 500_000);
      return () => clearInterval(interval);
    }
  }, [activeAccount, fetchBalances, open]);

  // Fetch DEX prices on component mount and periodically
  React.useEffect(() => {
    fetchDexPrices();

    // Refresh DEX prices every 60 seconds when modal is open
    if (open) {
      const interval = setInterval(fetchDexPrices, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchDexPrices, open]);

  // Pick an ad whenever the modal opens
  React.useEffect(() => {
    if (open && ADS.length > 0) {
      setAdIndex(Math.floor(Math.random() * ADS.length));
    }
  }, [open]);

  const handleSortOrderToggle = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Calculate total portfolio value
  const getTotalPortfolioValue = (): number => {
    if (!activeAccount || balanceLoading) return 0;
    
    // Merge options and tokens to ensure all tokens are available
    const allTokens = options && options.length > 0 
      ? [...new Map([...tokens, ...options]
          .filter(t => t != null && (t.contractId != null || t.tokenId != null))
          .map(t => [t.contractId ?? t.tokenId, t])).values()]
      : tokens.filter(t => t != null);

    return allTokens.reduce((total, token) => {
      return total + getBalanceValue(token, useLiquidityAdjustment);
    }, 0);
  };

  return (
    <Wrapper>
      <TokenButton
        className={isDarkTheme ? "dark" : "light"}
        onClick={handleClick}
      >
        <TokenButtonGroup>
          <TokenButtonLabel className={isDarkTheme ? "dark" : "light"}>
            {tokenSymbol(token)}
          </TokenButtonLabel>
          <ArrowDownwardIcon />
        </TokenButtonGroup>
      </TokenButton>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="token-select-modal"
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(6px)",
          },
        }}
      >
        <ModalBox>
          <ModalHeader>
            <ModalHeading>Select a token</ModalHeading>
            <CloseButton onClick={handleClose}>×</CloseButton>
          </ModalHeader>

          <ModalContent>
            <SearchContainer>
              <SearchIcon>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </SearchIcon>
              <SearchInput
                placeholder="Search tokens"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {searchTerm && (
                <ClearSearchButton onClick={() => setSearchTerm("")}>
                  ×
                </ClearSearchButton>
              )}
            </SearchContainer>

            {debouncedSearchTerm && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  margin: "4px 0 12px 0",
                  color: isDarkTheme ? "#888" : "#6b7280",
                  fontSize: "12px",
                }}
              >
                <span>Results</span>
                <span>{filteredAndSortedTokens.length}</span>
              </div>
            )}

            <Collapsible open={!debouncedSearchTerm}>
              <QuickButtonsContainer>
                <QuickButtonsGrid>
                  {QUICK_BUTTONS.slice(0, 4).map(
                    (button: {
                      contractId: number;
                      icon: string;
                      label: string;
                    }) => (
                      <QuickButton
                        key={button.contractId}
                        onClick={() => {
                          // Find by contractId (for tokens with mappings like aUSDC),
                          // with fallback to tokenId for backwards compatibility
                          const selected =
                            tokens.find(
                              (t) =>
                                t.contractId === button.contractId ||
                                t.tokenId === button.contractId
                            ) || tokens[0];
                          onSelect(selected);
                          handleClose();
                        }}
                      >
                        <QuickButtonIcon>{button.icon}</QuickButtonIcon>
                        {button.label}
                      </QuickButton>
                    )
                  )}
                </QuickButtonsGrid>
              </QuickButtonsContainer>

              {activeAccount && (
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "16px",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      flex: "1 1 50%",
                      padding: "12px 16px",
                      background: isDarkTheme ? "#2a2a2a" : "#f8fafc",
                      borderRadius: "12px",
                      border: `1px solid ${isDarkTheme ? "#333" : "#e5e7eb"}`,
                      fontSize: "14px",
                      color: isDarkTheme ? "#fff" : "#000",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "600",
                          fontSize: "13px",
                          color: isDarkTheme ? "#888" : "#6b7280",
                        }}
                      >
                        Portfolio Value
                      </span>
                      {balanceLoading ? (
                        <Skeleton variant="text" height={28} width="60%" />
                      ) : (
                        <span
                          style={{
                            fontSize: "18px",
                            fontWeight: "700",
                            color: isDarkTheme ? "#fff" : "#000",
                          }}
                        >
                          {(() => {
                            // Merge options and tokens to ensure all tokens are available
                            const allTokens = options && options.length > 0 
                              ? [...new Map([...tokens, ...options]
                                  .filter(t => t != null && (t.contractId != null || t.tokenId != null))
                                  .map(t => [t.contractId ?? t.tokenId, t])).values()]
                              : tokens.filter(t => t != null);
                            const rawTotal = allTokens.reduce(
                              (total, token) =>
                                total + getBalanceValue(token, false),
                              0
                            );
                            const adjustedTotal = allTokens.reduce(
                              (total, token) =>
                                total + getBalanceValue(token, true),
                              0
                            );

                            if (
                              useLiquidityAdjustment &&
                              Math.abs(rawTotal - adjustedTotal) > 1
                            ) {
                              return `$${adjustedTotal.toLocaleString(
                                undefined,
                                { maximumFractionDigits: 2 }
                              )}`;
                            } else {
                              return `$${rawTotal.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}`;
                            }
                          })()}
                        </span>
                      )}
                    </div>
                    {balanceLoading ? (
                      <div style={{ marginTop: "8px" }}>
                        <Skeleton variant="text" height={12} width="40%" />
                        <Skeleton variant="text" height={10} width="30%" />
                      </div>
                    ) : (
                      (() => {
                        // Merge options and tokens to ensure all tokens are available
                        const allTokens = options && options.length > 0 
                          ? [...new Map([...tokens, ...options]
                              .filter(t => t != null && (t.contractId != null || t.tokenId != null))
                              .map(t => [t.contractId ?? t.tokenId, t])).values()]
                          : tokens.filter(t => t != null);
                        const rawTotal = allTokens.reduce(
                          (total, token) =>
                            total + getBalanceValue(token, false),
                          0
                        );
                        const adjustedTotal = allTokens.reduce(
                          (total, token) =>
                            total + getBalanceValue(token, true),
                          0
                        );
                        const tokenCount = allTokens.filter(
                          (token) => {
                            // Use contractId for balance lookup since balances are stored by contractId
                            const balanceKey = token.contractId ?? token.tokenId;
                            const balance = tokenBalances[balanceKey];
                            return (
                              balance &&
                              balance !== "0" &&
                              !isNaN(parseFloat(balance.replace(/,/g, "")))
                            );
                          }
                        ).length;

                        return (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "2px",
                              fontSize: "11px",
                              color: isDarkTheme ? "#888" : "#6b7280",
                            }}
                          >
                            <span>
                              {tokenCount} token{tokenCount !== 1 ? "s" : ""} •
                              {useLiquidityAdjustment &&
                              Math.abs(rawTotal - adjustedTotal) > 1 ? (
                                <span style={{ color: "#f59e0b" }}>
                                  {" "}
                                  Liquidity adjusted
                                </span>
                              ) : (
                                <span> Market value</span>
                              )}
                            </span>
                            {useLiquidityAdjustment &&
                              Math.abs(rawTotal - adjustedTotal) > 1 && (
                                <span
                                  style={{ color: "#6b7280", fontSize: "10px" }}
                                >
                                  Raw: $
                                  {rawTotal.toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                              )}
                          </div>
                        );
                      })()
                    )}
                  </div>

                  <AdContainer>
                    {balanceLoading ? (
                      <Skeleton
                        variant="rectangular"
                        width="100%"
                        height="100%"
                      />
                    ) : (
                      (() => {
                        const ad = ADS[adIndex] || ADS[0];
                        const image = <AdImage src={ad.src} alt={ad.alt} />;
                        return ad?.href ? (
                          <AdLink
                            href={ad.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {image}
                            <AdBadge>Sponsored</AdBadge>
                          </AdLink>
                        ) : (
                          <>
                            {image}
                            <AdBadge>Sponsored</AdBadge>
                          </>
                        );
                      })()
                    )}
                  </AdContainer>
                </div>
              )}

              {/* Display Category Toggle */}
              {activeAccount && (
                <ToggleContainer>
                  <ToggleButton
                    active={displayCategory === "yourTokens"}
                    onClick={() => setDisplayCategory("yourTokens")}
                  >
                    Your Tokens ({userTokens.length})
                  </ToggleButton>
                  <ToggleButton
                    active={displayCategory === "byVolume"}
                    onClick={() => setDisplayCategory("byVolume")}
                  >
                    By Volume ({tokensByVolume.length})
                  </ToggleButton>
                </ToggleContainer>
              )}
            </Collapsible>

            {balanceError && (
              <ErrorText>
                Failed to load balances: {balanceError}
                <RefreshButton
                  onClick={() => {
                    setRetryCount(0);
                    setBalanceError(null);
                    fetchBalances();
                  }}
                  style={{ marginLeft: "8px", padding: "4px 8px" }}
                >
                  Retry
                </RefreshButton>
              </ErrorText>
            )}

            {debouncedSearchTerm ? (
              <TokenList>
                {filteredAndSortedTokens.map((t, i) => (
                  <TokenItem
                    key={`${tokenSymbol(t)}-${i}`}
                    onClick={() => {
                      onSelect(t);
                      handleClose();
                    }}
                  >
                    <TokenInfo>
                      <TokenIcon>
                        <img
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                          }}
                          src={`https://asset-verification.nautilus.sh/icons/${
                            t?.contractId === 390001 ? 0 : (t?.contractId ?? t?.tokenId ?? 0)
                          }.png`}
                          alt={`${tokenSymbol(t)} icon`}
                          onError={(e) => {
                            // Fallback to tokenId if contractId icon doesn't exist
                            const target = e.currentTarget;
                            if (t?.tokenId && t?.tokenId !== (t?.contractId ?? 0)) {
                              target.src = `https://asset-verification.nautilus.sh/icons/${t.tokenId}.png`;
                            } else {
                              target.src = "https://asset-verification.nautilus.sh/icons/0.png";
                            }
                          }}
                        />
                      </TokenIcon>
                      <TokenDetails>
                        <TokenName>
                          {tokenSymbol(t)}
                          {getTokenUsdPrice(t) > 0 && (
                            <TooltipContainer data-tooltip="Has DEX price data">
                              <TickerIndicator>$</TickerIndicator>
                            </TooltipContainer>
                          )}
                          {t.ticker?.liquidity_in_usd &&
                            parseFloat(t.ticker.liquidity_in_usd) > 0 && (
                              <TooltipContainer
                                data-tooltip={`Liquidity: $${parseFloat(
                                  t.ticker.liquidity_in_usd
                                ).toLocaleString()}`}
                              >
                                <LiquidityIndicator>L</LiquidityIndicator>
                              </TooltipContainer>
                            )}
                          {(() => {
                            const rawValue = getBalanceValue(t, false);
                            const risk = getLiquidityRisk(t, rawValue);
                            const liquidityUsd = t.ticker?.liquidity_in_usd
                              ? parseFloat(t.ticker.liquidity_in_usd)
                              : 0;
                            const liquidityRatio =
                              liquidityUsd > 0
                                ? (rawValue / liquidityUsd) * 100
                                : 0;

                            return (
                              activeAccount &&
                              rawValue > 0 &&
                              risk !== "low" && (
                                <TooltipContainer
                                  data-tooltip={`Liquidity Risk: ${risk.toUpperCase()}\nYour holdings: ${liquidityRatio.toFixed(
                                    1
                                  )}% of total liquidity\nAdjusted value accounts for market impact`}
                                >
                                  <LiquidityRiskIndicator risk={risk}>
                                    !
                                  </LiquidityRiskIndicator>
                                </TooltipContainer>
                              )
                            );
                          })()}
                        </TokenName>
                        <TokenSymbol>
                          {(() => {
                            const usdPrice = getTokenUsdPrice(t);
                            return usdPrice > 0
                              ? `$${usdPrice.toFixed(6)}`
                              : "No price data";
                          })()}
                        </TokenSymbol>
                      </TokenDetails>
                    </TokenInfo>

                    {activeAccount && (
                      <TokenBalance>
                        <BalanceAmount>
                          {balanceLoading
                            ? "..."
                            : tokenBalances[t.contractId ?? t.tokenId] || "0"}
                        </BalanceAmount>
                        {!balanceLoading &&
                          tokenBalances[t.contractId ?? t.tokenId] &&
                          tokenBalances[t.contractId ?? t.tokenId] !== "0" && (
                            <BalanceValue>
                              {(() => {
                                const rawValue = getBalanceValue(t, false);
                                const adjustedValue = getBalanceValue(t, true);
                                const risk = getLiquidityRisk(t, rawValue);
                                const liquidityUsd = t.ticker?.liquidity_in_usd
                                  ? parseFloat(t.ticker.liquidity_in_usd)
                                  : 0;
                                const liquidityRatio =
                                  liquidityUsd > 0
                                    ? (rawValue / liquidityUsd) * 100
                                    : 0;

                                if (rawValue === 0) return "";

                                if (
                                  useLiquidityAdjustment &&
                                  Math.abs(rawValue - adjustedValue) > 0.01
                                ) {
                                  return (
                                    <TooltipContainer
                                      data-tooltip={`Liquidity-adjusted value\nRaw market value: $${rawValue.toLocaleString()}\nYour holdings: ${liquidityRatio.toFixed(
                                        1
                                      )}% of liquidity\nRisk level: ${risk.toUpperCase()}`}
                                    >
                                      <span>
                                        $
                                        {adjustedValue.toLocaleString(
                                          undefined,
                                          {
                                            maximumFractionDigits: 2,
                                            minimumFractionDigits: 0,
                                          }
                                        )}
                                        <span
                                          style={{
                                            opacity: 0.6,
                                            fontSize: "9px",
                                          }}
                                        >
                                          {" "}
                                          ($
                                          {rawValue.toLocaleString(undefined, {
                                            maximumFractionDigits: 0,
                                          })}
                                          )
                                        </span>
                                      </span>
                                    </TooltipContainer>
                                  );
                                } else {
                                  return (
                                    <TooltipContainer
                                      data-tooltip={`Market value based on current DEX prices\nLiquidity: $${liquidityUsd.toLocaleString()}\nYour holdings: ${liquidityRatio.toFixed(
                                        1
                                      )}% of liquidity`}
                                    >
                                      <span>
                                        $
                                        {rawValue.toLocaleString(undefined, {
                                          maximumFractionDigits: 2,
                                          minimumFractionDigits: 0,
                                        })}
                                      </span>
                                    </TooltipContainer>
                                  );
                                }
                              })()}
                            </BalanceValue>
                          )}
                      </TokenBalance>
                    )}
                  </TokenItem>
                ))}
              </TokenList>
            ) : (
              <>
                {activeAccount &&
                  displayCategory === "yourTokens" &&
                  userTokens.length > 0 && (
                    <>
                      <SectionHeader>
                        <SectionIcon>👤</SectionIcon>
                        Your tokens ({userTokens.length})
                      </SectionHeader>
                      <TokenList>
                        {userTokens.map((t, i) => (
                          <TokenItem
                            key={`${tokenSymbol(t)}-mine-${i}`}
                            onClick={() => {
                              onSelect(t);
                              handleClose();
                            }}
                          >
                            <TokenInfo>
                              <TokenIcon>
                                <img
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                  }}
                                  src={`https://asset-verification.nautilus.sh/icons/${
                                    t?.contractId === 390001 ? 0 : (t?.contractId ?? t?.tokenId ?? 0)
                                  }.png`}
                                  alt={`${tokenSymbol(t)} icon`}
                                  onError={(e) => {
                                    // Fallback to tokenId if contractId icon doesn't exist
                                    const target = e.currentTarget;
                                    if (t?.tokenId && t?.tokenId !== (t?.contractId ?? 0)) {
                                      target.src = `https://asset-verification.nautilus.sh/icons/${t.tokenId}.png`;
                                    } else {
                                      target.src = "https://asset-verification.nautilus.sh/icons/0.png";
                                    }
                                  }}
                                />
                              </TokenIcon>
                              <TokenDetails>
                                <TokenName>
                                  {tokenSymbol(t)}
                                  {getTokenUsdPrice(t) > 0 && (
                                    <TooltipContainer data-tooltip="Has DEX price data">
                                      <TickerIndicator>$</TickerIndicator>
                                    </TooltipContainer>
                                  )}
                                  {t.ticker?.liquidity_in_usd &&
                                    parseFloat(t.ticker.liquidity_in_usd) >
                                      0 && (
                                      <TooltipContainer
                                        data-tooltip={`Liquidity: $${parseFloat(
                                          t.ticker.liquidity_in_usd
                                        ).toLocaleString()}`}
                                      >
                                        <LiquidityIndicator>
                                          L
                                        </LiquidityIndicator>
                                      </TooltipContainer>
                                    )}
                                </TokenName>
                                <TokenSymbol>
                                  {(() => {
                                    const usdPrice = getTokenUsdPrice(t);
                                    return usdPrice > 0
                                      ? `$${usdPrice.toFixed(6)}`
                                      : "No price data";
                                  })()}
                                </TokenSymbol>
                              </TokenDetails>
                            </TokenInfo>
                            <TokenBalance>
                              <BalanceAmount>
                                {tokenBalances[t.contractId ?? t.tokenId] || "0"}
                              </BalanceAmount>
                              <BalanceValue>
                                {(() => {
                                  const rawValue = getBalanceValue(t, false);
                                  const adjustedValue = getBalanceValue(
                                    t,
                                    true
                                  );
                                  if (rawValue === 0) return "";

                                  if (
                                    useLiquidityAdjustment &&
                                    Math.abs(rawValue - adjustedValue) > 0.01
                                  ) {
                                    return (
                                      <span>
                                        $
                                        {adjustedValue.toLocaleString(
                                          undefined,
                                          {
                                            maximumFractionDigits: 2,
                                            minimumFractionDigits: 0,
                                          }
                                        )}
                                        <span
                                          style={{
                                            opacity: 0.6,
                                            fontSize: "9px",
                                          }}
                                        >
                                          {" "}
                                          ($
                                          {rawValue.toLocaleString(undefined, {
                                            maximumFractionDigits: 0,
                                          })}
                                          )
                                        </span>
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <span>
                                        $
                                        {rawValue.toLocaleString(undefined, {
                                          maximumFractionDigits: 2,
                                          minimumFractionDigits: 0,
                                        })}
                                      </span>
                                    );
                                  }
                                })()}
                              </BalanceValue>
                            </TokenBalance>
                          </TokenItem>
                        ))}
                      </TokenList>
                    </>
                  )}

                {displayCategory === "byVolume" && (
                  <>
                    <SectionHeader>
                      <SectionIcon>📈</SectionIcon>
                      Tokens by 24h volume ({tokensByVolume.length})
                    </SectionHeader>
                    <TokenList>
                      {tokensByVolume.map((t, i) => (
                        <TokenItem
                          key={`${tokenSymbol(t)}-vol-${i}`}
                          onClick={() => {
                            onSelect(t);
                            handleClose();
                          }}
                        >
                          <TokenInfo>
                            <TokenIcon>
                              <img
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "50%",
                                }}
                                src={`https://asset-verification.nautilus.sh/icons/${
                                  t?.contractId === 390001 ? 0 : (t?.contractId ?? t?.tokenId ?? 0)
                                }.png`}
                                alt={`${tokenSymbol(t)} icon`}
                                onError={(e) => {
                                  // Fallback to tokenId if contractId icon doesn't exist
                                  const target = e.currentTarget;
                                  if (t?.tokenId && t?.tokenId !== (t?.contractId ?? 0)) {
                                    target.src = `https://asset-verification.nautilus.sh/icons/${t.tokenId}.png`;
                                  } else {
                                    target.src = "https://asset-verification.nautilus.sh/icons/0.png";
                                  }
                                }}
                              />
                            </TokenIcon>
                            <TokenDetails>
                              <TokenName>
                                {tokenSymbol(t)}
                                {getTokenUsdPrice(t) > 0 && (
                                  <TooltipContainer data-tooltip="Has DEX price data">
                                    <TickerIndicator>$</TickerIndicator>
                                  </TooltipContainer>
                                )}
                                {t.ticker?.liquidity_in_usd &&
                                  parseFloat(t.ticker.liquidity_in_usd) > 0 && (
                                    <TooltipContainer
                                      data-tooltip={`Liquidity: $${parseFloat(
                                        t.ticker.liquidity_in_usd
                                      ).toLocaleString()}`}
                                    >
                                      <LiquidityIndicator>L</LiquidityIndicator>
                                    </TooltipContainer>
                                  )}
                              </TokenName>
                              <TokenSymbol>
                                {(() => {
                                  const usdPrice = getTokenUsdPrice(t);
                                  return usdPrice > 0
                                    ? `$${usdPrice.toFixed(6)}`
                                    : "No price data";
                                })()}
                              </TokenSymbol>
                            </TokenDetails>
                          </TokenInfo>
                          {activeAccount && (
                            <TokenBalance>
                              <BalanceAmount>
                                {balanceLoading
                                  ? "..."
                                  : tokenBalances[t.contractId ?? t.tokenId] || "0"}
                              </BalanceAmount>
                              {(() => {
                                const rawValue = getBalanceValue(t, false);
                                if (rawValue === 0) return null;
                                return (
                                  <BalanceValue>
                                    $
                                    {rawValue.toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                      minimumFractionDigits: 0,
                                    })}
                                  </BalanceValue>
                                );
                              })()}
                            </TokenBalance>
                          )}
                        </TokenItem>
                      ))}
                    </TokenList>
                  </>
                )}
              </>
            )}
          </ModalContent>
        </ModalBox>
      </Modal>
    </Wrapper>
  );
};

export default TokenSelect;
