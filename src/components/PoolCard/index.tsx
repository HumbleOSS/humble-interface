import styled, { keyframes } from "styled-components";
import React, { FC } from "react";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import { IndexerPoolI } from "../../types";
import { Link } from "react-router-dom";
import { Box, ButtonGroup, Fade, Stack, Tooltip } from "@mui/material";
import { stringToColorCode } from "../../utils/string";
import algosdk from "algosdk";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { TOKEN_WVOI1 } from "../../constants/tokens";
import useDefiRewards from "@/hooks/useDefiRewards";
import { toast } from "react-toastify";

const BLOCK_REWARD_ADJUSTMENT = 17.05 / 2; // block rewards for VOI pairs
const formatter = new Intl.NumberFormat("en", { notation: "compact" });
const formatUSD = (value: number) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
`;

const PoolCardRoot = styled(Box)`
  display: flex;
  padding: var(--Spacing-700, 16px) var(--Spacing-600, 12px);
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Spacing-600, 12px);
  align-self: stretch;
  border-radius: var(--Radius-500, 12px);
  border: 1px solid
    var(--Color-Neutral-Stroke-Primary, rgba(255, 255, 255, 0.2));
  &.light {
    background: #fff;
  }
  /*
  background: var(--Color-Canvas-Transparent-white-900, #070709);
  */
`;

const PoolCardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  align-self: stretch;
  flex-direction: column;
  @media screen and (min-width: 600px) {
    flex-direction: row;
    align-items: center;
  }
`;

const Col1 = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
`;

const Col1Row1 = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  gap: var(--Spacing-200, 10px);
  border-bottom: 1px solid #ffffff5c;
  @media screen and (min-width: 600px) {
    width: fit-content;
    justify-content: start;
    border-bottom: none;
  }
`;
const LabelWrapper = styled.div`
  align-items: center;
  gap: 2px;
  display: flex;
  @media screen and (min-width: 600px) {
    display: none;
  }
`;
const Label = styled.div`
  font-family: "Plus Jakarta Sans";
  /* color: var(--Color-Neutral-Element-Primary, #fff); */
  font-size: 13px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 15.6px */
`;

const PairInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`;

const PairIds = styled(Box)`
  display: flex;
  align-items: flex-start;
  gap: 6px;
`;

const PairTokens = styled.div`
  display: flex;
  padding-bottom: 8px;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
`;

const PairTokenLabel = styled.div`
  /* color: var(--Color-Neutral-Element-Primary, #fff); */
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 15px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 18px */
  text-transform: uppercase;
`;

const Field = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 4px;
`;

const FieldLabel = styled.div`
  color: var(--Color-Neutral-Element-Secondary, #f6f6f8);
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 19.2px */
`;

const FieldValue = styled.div`
  color: var(--Color-Neutral-Element-Primary, #fff);
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 19.2px */
`;

const CryptoIconPlaceholder = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 8C0 3.58172 3.58172 0 8 0H16C20.4183 0 24 3.58172 24 8V16C24 20.4183 20.4183 24 16 24H8C3.58172 24 0 20.4183 0 16V8Z"
        fill="#141010"
      />
      <path
        d="M0.5 8C0.5 3.85786 3.85786 0.5 8 0.5H16C20.1421 0.5 23.5 3.85786 23.5 8V16C23.5 20.1421 20.1421 23.5 16 23.5H8C3.85786 23.5 0.5 20.1421 0.5 16V8Z"
        stroke="currentColor"
        stroke-opacity="0.7"
      />
      <path
        d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12Z"
        fill="currentColor"
        fillOpacity="0.01"
      />
      <g clipPath="url(#clip0_390_19487)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.61872 3.38128C8.96043 3.72299 8.96043 4.27701 8.61872 4.61872L4.61872 8.61872C4.27701 8.96043 3.72299 8.96043 3.38128 8.61872C3.03957 8.27701 3.03957 7.72299 3.38128 7.38128L7.38128 3.38128C7.72299 3.03957 8.27701 3.03957 8.61872 3.38128ZM14.6187 3.38128C14.9604 3.72299 14.9604 4.27701 14.6187 4.61872L4.61872 14.6187C4.27701 14.9604 3.72299 14.9604 3.38128 14.6187C3.03957 14.277 3.03957 13.723 3.38128 13.3813L13.3813 3.38128C13.723 3.03957 14.277 3.03957 14.6187 3.38128ZM20.6187 3.38128C20.9604 3.72299 20.9604 4.27701 20.6187 4.61872L4.61872 20.6187C4.27701 20.9604 3.72299 20.9604 3.38128 20.6187C3.03957 20.277 3.03957 19.723 3.38128 19.3813L19.3813 3.38128C19.723 3.03957 20.277 3.03957 20.6187 3.38128ZM20.6187 9.38128C20.9604 9.72299 20.9604 10.277 20.6187 10.6187L10.6187 20.6187C10.277 20.9604 9.72299 20.9604 9.38128 20.6187C9.03957 20.277 9.03957 19.723 9.38128 19.3813L19.3813 9.38128C19.723 9.0396 20.277 9.0396 20.6187 9.38128ZM20.6187 15.3813C20.9604 15.723 20.9604 16.277 20.6187 16.6187L16.6187 20.6187C16.277 20.9604 15.723 20.9604 15.3813 20.6187C15.0396 20.277 15.0396 19.723 15.3813 19.3813L19.3813 15.3813C19.723 15.0396 20.277 15.0396 20.6187 15.3813Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_390_19487">
          <rect
            width="16"
            height="16"
            fill="currentColor"
            transform="translate(4 4)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

const PlaceHolderIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.61872 3.38128C8.96043 3.72299 8.96043 4.27701 8.61872 4.61872L4.61872 8.61872C4.27701 8.96043 3.72299 8.96043 3.38128 8.61872C3.03957 8.27701 3.03957 7.72299 3.38128 7.38128L7.38128 3.38128C7.72299 3.03957 8.27701 3.03957 8.61872 3.38128ZM14.6187 3.38128C14.9604 3.72299 14.9604 4.27701 14.6187 4.61872L4.61872 14.6187C4.27701 14.9604 3.72299 14.9604 3.38128 14.6187C3.03957 14.277 3.03957 13.723 3.38128 13.3813L13.3813 3.38128C13.723 3.03957 14.277 3.03957 14.6187 3.38128ZM20.6187 3.38128C20.9604 3.72299 20.9604 4.27701 20.6187 4.61872L4.61872 20.6187C4.27701 20.9604 3.72299 20.9604 3.38128 20.6187C3.03957 20.277 3.03957 19.723 3.38128 19.3813L19.3813 3.38128C19.723 3.03957 20.277 3.03957 20.6187 3.38128ZM20.6187 9.38128C20.9604 9.72299 20.9604 10.277 20.6187 10.6187L10.6187 20.6187C10.277 20.9604 9.72299 20.9604 9.38128 20.6187C9.03957 20.277 9.03957 19.723 9.38128 19.3813L19.3813 9.38128C19.723 9.0396 20.277 9.0396 20.6187 9.38128ZM20.6187 15.3813C20.9604 15.723 20.9604 16.277 20.6187 16.6187L16.6187 20.6187C16.277 20.9604 15.723 20.9604 15.3813 20.6187C15.0396 20.277 15.0396 19.723 15.3813 19.3813L19.3813 15.3813C19.723 15.0396 20.277 15.0396 20.6187 15.3813Z"
        fill="currentColor"
      />
    </svg>
  );
};

const InfoCircleIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M7.99992 14.6673C11.6666 14.6673 14.6666 11.6673 14.6666 8.00065C14.6666 4.33398 11.6666 1.33398 7.99992 1.33398C4.33325 1.33398 1.33325 4.33398 1.33325 8.00065C1.33325 11.6673 4.33325 14.6673 7.99992 14.6673Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8V11.3333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.99634 5.33398H8.00233"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const PairIconPlaceholder = () => {
  return (
    <svg
      width="56"
      height="32"
      viewBox="0 0 56 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="16" fill="#FF6438" />
      <path
        d="M4 16C4 12.2725 4 10.4087 4.60896 8.93853C5.42092 6.97831 6.97831 5.42092 8.93853 4.60896C10.4087 4 12.2725 4 16 4C19.7275 4 21.5913 4 23.0615 4.60896C25.0217 5.42092 26.5791 6.97831 27.391 8.93853C28 10.4087 28 12.2725 28 16C28 19.7275 28 21.5913 27.391 23.0615C26.5791 25.0217 25.0217 26.5791 23.0615 27.391C21.5913 28 19.7275 28 16 28C12.2725 28 10.4087 28 8.93853 27.391C6.97831 26.5791 5.42092 25.0217 4.60896 23.0615C4 21.5913 4 19.7275 4 16Z"
        fill="white"
        fillOpacity="0.01"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.6187 7.38128C12.9604 7.72299 12.9604 8.27701 12.6187 8.61872L8.61872 12.6187C8.27701 12.9604 7.72299 12.9604 7.38128 12.6187C7.03957 12.277 7.03957 11.723 7.38128 11.3813L11.3813 7.38128C11.723 7.03957 12.277 7.03957 12.6187 7.38128ZM18.6187 7.38128C18.9604 7.72299 18.9604 8.27701 18.6187 8.61872L8.61872 18.6187C8.27701 18.9604 7.72299 18.9604 7.38128 18.6187C7.03957 18.277 7.03957 17.723 7.38128 17.3813L17.3813 7.38128C17.723 7.03957 18.277 7.03957 18.6187 7.38128ZM24.6187 7.38128C24.9604 7.72299 24.9604 8.27701 24.6187 8.61872L8.61872 24.6187C8.27701 24.9604 7.72299 24.9604 7.38128 24.6187C7.03957 24.277 7.03957 23.723 7.38128 23.3813L23.3813 7.38128C23.723 7.03957 24.277 7.03957 24.6187 7.38128ZM24.6187 13.3813C24.9604 13.723 24.9604 14.277 24.6187 14.6187L14.6187 24.6187C14.277 24.9604 13.723 24.9604 13.3813 24.6187C13.0396 24.277 13.0396 23.723 13.3813 23.3813L23.3813 13.3813C23.723 13.0396 24.277 13.0396 24.6187 13.3813ZM24.6187 19.3813C24.9604 19.723 24.9604 20.277 24.6187 20.6187L20.6187 24.6187C20.277 24.9604 19.723 24.9604 19.3813 24.6187C19.0396 24.277 19.0396 23.723 19.3813 23.3813L23.3813 19.3813C23.723 19.0396 24.277 19.0396 24.6187 19.3813Z"
        fill="#F6F6F8"
      />
      <rect x="24" width="32" height="32" rx="16" fill="#FFBE1D" />
      <path
        d="M28 16C28 12.2725 28 10.4087 28.609 8.93853C29.4209 6.97831 30.9783 5.42092 32.9385 4.60896C34.4087 4 36.2725 4 40 4C43.7275 4 45.5913 4 47.0615 4.60896C49.0217 5.42092 50.5791 6.97831 51.391 8.93853C52 10.4087 52 12.2725 52 16C52 19.7275 52 21.5913 51.391 23.0615C50.5791 25.0217 49.0217 26.5791 47.0615 27.391C45.5913 28 43.7275 28 40 28C36.2725 28 34.4087 28 32.9385 27.391C30.9783 26.5791 29.4209 25.0217 28.609 23.0615C28 21.5913 28 19.7275 28 16Z"
        fill="white"
        fillOpacity="0.01"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M36.6187 7.38128C36.9604 7.72299 36.9604 8.27701 36.6187 8.61872L32.6187 12.6187C32.277 12.9604 31.723 12.9604 31.3813 12.6187C31.0396 12.277 31.0396 11.723 31.3813 11.3813L35.3813 7.38128C35.723 7.03957 36.277 7.03957 36.6187 7.38128ZM42.6187 7.38128C42.9604 7.72299 42.9604 8.27701 42.6187 8.61872L32.6187 18.6187C32.277 18.9604 31.723 18.9604 31.3813 18.6187C31.0396 18.277 31.0396 17.723 31.3813 17.3813L41.3813 7.38128C41.723 7.03957 42.277 7.03957 42.6187 7.38128ZM48.6187 7.38128C48.9604 7.72299 48.9604 8.27701 48.6187 8.61872L32.6187 24.6187C32.277 24.9604 31.723 24.9604 31.3813 24.6187C31.0396 24.277 31.0396 23.723 31.3813 23.3813L47.3813 7.38128C47.723 7.03957 48.277 7.03957 48.6187 7.38128ZM48.6187 13.3813C48.9604 13.723 48.9604 14.277 48.6187 14.6187L38.6187 24.6187C38.277 24.9604 37.723 24.9604 37.3813 24.6187C37.0396 24.277 37.0396 23.723 37.3813 23.3813L47.3813 13.3813C47.723 13.0396 48.277 13.0396 48.6187 13.3813ZM48.6187 19.3813C48.9604 19.723 48.9604 20.277 48.6187 20.6187L44.6187 24.6187C44.277 24.9604 43.723 24.9604 43.3813 24.6187C43.0396 24.277 43.0396 23.723 43.3813 23.3813L47.3813 19.3813C47.723 19.0396 48.277 19.0396 48.6187 19.3813Z"
        fill="#F6F6F8"
      />
    </svg>
  );
};

const PairInfoContainer = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  @media screen and (min-width: 600px) {
    align-items: flex-start;
  }
`;

const Col2 = styled(Box)`
  display: flex;
  height: 32px;
  padding: var(--Spacing-400, 8px) 0px;
  align-items: baseline;
  gap: 10px;
`;

const TVLLabel = styled.div`
  /* color: var(--Color-Neutral-Element-Primary, #fff); */
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 16.8px */
`;

const VolumeLabel = styled.div`
  /* color: var(--Color-Neutral-Element-Primary, #fff); */
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 16.8px */
`;

const APRLabel = styled.div`
  /* color: var(--Color-Neutral-Element-Primary, #fff); */
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 16.8px */
`;

const fireAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.10); }
  100% { transform: scale(1); }
`;

const APRBoostLabel = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: #ff6b00;
  background-color: rgba(255, 107, 0, 0.1);
  border: 1px solid #ff6b00;
  border-radius: 12px;
  padding: 2px 6px;
  margin-left: 4px;
  text-shadow: 0 0 2px #ffa500;
  animation: ${fireAnimation} 2s ease-in-out infinite;
  display: inline-block;
`;

const BlueFlameAPRLabel = styled.div`
  font-size: 12px;
  font-weight: 100;
  color: #007bff;
  background-color: rgba(0, 123, 255, 0.1);
  border: 1px solid #007bff;
  border-radius: 12px;
  padding: 2px 6px;
  margin-left: 4px;
  text-shadow: 0 0 4px #00c8ff;
  animation: ${fireAnimation} 2s ease-in-out infinite;
  display: inline-block;
`;

const Col3 = styled(Box)<{ isDarkTheme: boolean }>`
  display: flex;
  padding: 11px 0px var(--Spacing-400, 8px) 0px;
  align-items: baseline;
  gap: 8px;
  justify-content: space-between;
  width: 100%;
  border-bottom: 1px solid
    ${({ isDarkTheme }) => (isDarkTheme ? "#ffffff5c" : "#D8D8E1")};

  @media screen and (min-width: 600px) {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: fit-content;
    border-bottom: none;
    padding: 0px;
  }
`;

const Col4 = styled(Box)<{ isDarkTheme: boolean }>`
  display: flex;
  padding: var(--Spacing-600, 12px) 0px var(--Spacing-400, 8px) 0px;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  border-bottom: 1px solid
    ${({ isDarkTheme }) => (isDarkTheme ? "#ffffff5c" : "#D8D8E1")};

  @media screen and (min-width: 600px) {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: fit-content;
    border-bottom: none;
    padding: 0px;
  }
`;

const APRLabelContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: help;
  width: 100%;
  
  @media screen and (min-width: 600px) {
    justify-content: center;
  }
`;

const Col5 = styled(Box)`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  padding-top: var(--Spacing-400, 1rem);

  @media screen and (min-width: 600px) {
    padding: 0px;
    width: fit-content;
  }
`;

const Button = styled.div`
  cursor: pointer;
`;

const IconButton = styled(Button)<{ variant?: "add" | "remove" }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--Radius-300, 8px);
  border: 1px solid
    ${(props) =>
      props.variant === "add"
        ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
        : "var(--Color-Accent-Secondary-Stroke-Base, rgba(255, 255, 255, 0.7))"};
  background: ${(props) =>
    props.variant === "add"
      ? "var(--Color-Accent-CTA-Background-Default, #2958ff)"
      : "var(--Color-Accent-Secondary-Background-Default, #141010)"};
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }
  
  svg {
    color: ${(props) =>
      props.variant === "add"
        ? "var(--Color-Brand-White, #fff)"
        : "var(--Color-Neutral-Element-Secondary, #f6f6f8)"};
    font-size: 18px;
  }
`;

const PairIconContainer = styled.div`
  display: flex;
  align-items: flex-start;
  margin-left: -8px;
`;

const PairIcon = styled.div`
  display: flex;
  gap: 10px;
  border-radius: 50px;
  width: 32px;
  height: 32px;
`;

const PairIconLeft = styled(PairIcon)``;

const PairIconRight = styled(PairIcon)`
  position: relative;
  right: 8px;
`;

const PairIconImage = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
`;

interface CryptoIconPlaceholderProps {
  color?: string;
}
export const CryptoIconPlaceholder2: FC<CryptoIconPlaceholderProps> = ({
  color,
}) => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="16" fill={color || "#FFBE1D"} />
      <path
        d="M4 16C4 12.2725 4 10.4087 4.60896 8.93853C5.42092 6.97831 6.97831 5.42092 8.93853 4.60896C10.4087 4 12.2725 4 16 4C19.7275 4 21.5913 4 23.0615 4.60896C25.0217 5.42092 26.5791 6.97831 27.391 8.93853C28 10.4087 28 12.2725 28 16C28 19.7275 28 21.5913 27.391 23.0615C26.5791 25.0217 25.0217 26.5791 23.0615 27.391C21.5913 28 19.7275 28 16 28C12.2725 28 10.4087 28 8.93853 27.391C6.97831 26.5791 5.42092 25.0217 4.60896 23.0615C4 21.5913 4 19.7275 4 16Z"
        fill="white"
        fillOpacity="0.01"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.6187 7.38128C12.9604 7.72299 12.9604 8.27701 12.6187 8.61872L8.61872 12.6187C8.27701 12.9604 7.72299 12.9604 7.38128 12.6187C7.03957 12.277 7.03957 11.723 7.38128 11.3813L11.3813 7.38128C11.723 7.03957 12.277 7.03957 12.6187 7.38128ZM18.6187 7.38128C18.9604 7.72299 18.9604 8.27701 18.6187 8.61872L8.61872 18.6187C8.27701 18.9604 7.72299 18.9604 7.38128 18.6187C7.03957 18.277 7.03957 17.723 7.38128 17.3813L17.3813 7.38128C17.723 7.03957 18.277 7.03957 18.6187 7.38128ZM24.6187 7.38128C24.9604 7.72299 24.9604 8.27701 24.6187 8.61872L8.61872 24.6187C8.27701 24.9604 7.72299 24.9604 7.38128 24.6187C7.03957 24.277 7.03957 23.723 7.38128 23.3813L23.3813 7.38128C23.723 7.03957 24.277 7.03957 24.6187 7.38128ZM24.6187 13.3813C24.9604 13.723 24.9604 14.277 24.6187 14.6187L14.6187 24.6187C14.277 24.9604 13.723 24.9604 13.3813 24.6187C13.0396 24.277 13.0396 23.723 13.3813 23.3813L23.3813 13.3813C23.723 13.0396 24.277 13.0396 24.6187 13.3813ZM24.6187 19.3813C24.9604 19.723 24.9604 20.277 24.6187 20.6187L20.6187 24.6187C20.277 24.9604 19.723 24.9604 19.3813 24.6187C19.0396 24.277 19.0396 23.723 19.3813 23.3813L23.3813 19.3813C23.723 19.0396 24.277 19.0396 24.6187 19.3813Z"
        fill="#F6F6F8"
      />
    </svg>
  );
};

interface PoolCardProps {
  pool: IndexerPoolI;
  tokens?: any[];
  balance?: string;
  tvl?: string;
}
const PoolCard: FC<PoolCardProps> = ({ pool, balance, tokens }) => {
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const rewards = useDefiRewards();
  const reward = rewards.find((r) => r.poolId === pool.contractId) || {
    aprBoost: 0,
    blockReward: 0,
    additionalAprBoost: 0,
  };
  if ([pool.tokAId, pool.tokBId].map(Number).includes(TOKEN_WVOI1)) {
    reward.blockReward = BLOCK_REWARD_ADJUSTMENT;
  }
  // Find tokens by matching contractId or tokenId
  // Handle VOI (0) -> wVOI (390001) mapping
  const findToken = (tokenIdStr: string) => {
    const id = Number(tokenIdStr);
    
    // First try to find by contractId matching the tokenId string
    let token = tokens?.find((t) => `${t.contractId}` === tokenIdStr);
    
    // If not found, try matching tokenId
    if (!token) {
      token = tokens?.find((t) => `${t.tokenId}` === tokenIdStr);
    }
    
    // Handle VOI (0) -> wVOI (390001) mapping
    // If tokenId is 0 or 390001, try to find VOI token
    if (!token && (id === 0 || id === TOKEN_WVOI1)) {
      // Try to find by tokenId 0
      token = tokens?.find((t) => t.tokenId === 0);
      // If not found, try contractId 390001
      if (!token) {
        token = tokens?.find((t) => t.contractId === TOKEN_WVOI1);
      }
      // If still not found, try tokenId 390001
      if (!token) {
        token = tokens?.find((t) => t.tokenId === TOKEN_WVOI1);
      }
    }
    
    return token;
  };
  
  const tokA = findToken(pool.tokAId);
  const tokB = findToken(pool.tokBId);
  const isWVOIf = (token: any) => {
    if (!token) return false;
    const tokenId = token.tokenId || 0;
    const contractId = token.contractId || tokenId;
    // Handle both VOI (0) and wVOI (390001)
    return tokenId === 0 || contractId === TOKEN_WVOI1 || tokenId === TOKEN_WVOI1;
  };
  const tokAIcon = isWVOIf(tokA) ? (
    <PairIconImage
      src={`https://asset-verification.nautilus.sh/icons/0.png`}
      alt={`VOI icon`}
    />
  ) : !!tokA?.verified ? (
    <PairIconImage
      src={`https://asset-verification.nautilus.sh/icons/${tokA?.contractId === 390001 ? 0 : tokA?.contractId}.png`}
      alt={`${tokA?.symbol} icon`}
    />
  ) : (
    <CryptoIconPlaceholder2
      color={stringToColorCode(
        algosdk.getApplicationAddress(tokA?.contractId || 0)
      )}
    />
  );
  const tokBIcon = isWVOIf(tokB) ? (
    <PairIconImage
      src={`https://asset-verification.nautilus.sh/icons/0.png`}
      alt={`VOI icon`}
    />
  ) : !!tokB?.verified ? (
    <PairIconImage
      src={`https://asset-verification.nautilus.sh/icons/${tokB?.contractId === 390001 ? 0 : tokB?.contractId}.png`}
      alt={`${tokB?.symbol} icon`}
    />
  ) : (
    <CryptoIconPlaceholder2
      color={stringToColorCode(
        algosdk.getApplicationAddress(tokB?.contractId || 0)
      )}
    />
  );
  const tokABadge = isWVOIf(tokA) ? (
    <Tooltip title="Verified by Nautilus" placement="top-end" arrow>
      <VerifiedUserIcon fontSize="small" style={{ color: "gold" }} />
    </Tooltip>
  ) : !!tokA?.verified ? (
    <Tooltip title="Verified by Nautilus" placement="top-end" arrow>
      <VerifiedUserIcon fontSize="small" />
    </Tooltip>
  ) : (
    ""
  );
  const tokBBadge = isWVOIf(tokB) ? (
    <Tooltip title="Verified by Nautilus" placement="top-end" arrow>
      <VerifiedUserIcon fontSize="small" style={{ color: "gold" }} />
    </Tooltip>
  ) : !!tokB?.verified ? (
    <Tooltip title="Verified by Nautilus" placement="top-end" arrow>
      <VerifiedUserIcon fontSize="small" />
    </Tooltip>
  ) : (
    ""
  );
  const displayTokAId =
    `${pool.tokAId}` === `${TOKEN_WVOI1}` ? "0" : `${pool.tokAId}`;
  const displayTokBId =
    `${pool.tokBId}` === `${TOKEN_WVOI1}` ? "0" : `${pool.tokBId}`;
  console.log({ pool, balance, tokens, tokA, tokB });

  const aprTooltipContent = () => {
    const baseApr = Number(pool?.apr || 0);
    const totalApr =
      baseApr +
      (reward?.aprBoost || 0) +
      (reward?.blockReward || 0) +
      (reward?.additionalAprBoost || 0);

    return (
      <div>
        <p>Total APR: {totalApr.toFixed(2)}%</p>
        <p>Base Swap APR: {baseApr.toFixed(2)}%</p>
        {reward.aprBoost > 0 && (
          <p>DeFi Boost: {reward.aprBoost.toFixed(2)}%</p>
        )}
        {reward.blockReward > 0 && (
          <p>Block Rewards: {reward.blockReward.toFixed(2)}%</p>
        )}
        {reward.additionalAprBoost > 0 && (
          <p>Additional APR Boost: {reward.additionalAprBoost.toFixed(2)}%</p>
        )}
      </div>
    );
  };

  const calculateTotalApr = () => {
    const baseApr = Number(pool?.apr || 0);
    return (
      baseApr +
      (reward?.aprBoost || 0) +
      (reward?.blockReward || 0) +
      (reward?.additionalAprBoost || 0)
    );
  };

  return (
    <Fade in={true} timeout={1500}>
      <PoolCardRoot className={isDarkTheme ? "dark" : "light"}>
        <PoolCardRow>
          <>
            <Col1Row1>
              <PairIconContainer>
                <PairIconLeft>{tokAIcon}</PairIconLeft>
                <PairIconRight>{tokBIcon}</PairIconRight>
              </PairIconContainer>
              {/*<PairIconPlaceholder />*/}
              <PairInfoContainer>
                <PairInfo>
                  <PairTokens>
                    <PairTokenLabel>
                      {(() => {
                        // Display "VOI" for both tokenId 0 and 390001 (wVOI)
                        if (!tokA) return `ID: ${pool.tokAId}`;
                        const id = tokA.tokenId || tokA.contractId || 0;
                        if (id === 0 || id === TOKEN_WVOI1) return "VOI";
                        return tokA.symbol || `ID: ${pool.tokAId}`;
                      })()}
                    </PairTokenLabel>
                    {tokABadge}
                    {/*<CryptoIconPlaceholder />*/}
                    <PairTokenLabel>/
                      {(() => {
                        // Display "VOI" for both tokenId 0 and 390001 (wVOI)
                        if (!tokB) return ` ID: ${pool.tokBId}`;
                        const id = tokB.tokenId || tokB.contractId || 0;
                        if (id === 0 || id === TOKEN_WVOI1) return " VOI";
                        return ` ${tokB.symbol || `ID: ${pool.tokBId}`}`;
                      })()}
                    </PairTokenLabel>
                    {tokBBadge}
                    {/*<CryptoIconPlaceholder />*/}
                  </PairTokens>
                </PairInfo>
                {!balance ? (
                  <PairIds>
                    <Field>
                      <FieldLabel>ID:</FieldLabel>
                      <FieldValue>{displayTokAId}</FieldValue>
                    </Field>
                    <Field>
                      <FieldLabel>ID:</FieldLabel>
                      <FieldValue>{displayTokBId}</FieldValue>
                    </Field>
                  </PairIds>
                ) : null}
              </PairInfoContainer>
            </Col1Row1>
          </>
          {balance ? (
            <>
              <Col2 sx={{ display: { xs: "none", md: "block" } }}>
                <TVLLabel>&nbsp;</TVLLabel>
              </Col2>
              <Col3
                isDarkTheme={isDarkTheme}
                sx={{ display: { xs: "none", md: "block" } }}
              >
                <VolumeLabel>&nbsp;</VolumeLabel>
              </Col3>
              <Col4
                isDarkTheme={isDarkTheme}
                sx={{ display: { xs: "none", md: "block" } }}
              >
                {/* Position value hidden */}
              </Col4>
              <Col5>
                <StyledLink to={`/pool/remove?poolId=${pool.contractId}`}>
                  <IconButton variant="remove">
                    <RemoveIcon />
                  </IconButton>
                </StyledLink>
                <StyledLink to={`/pool/add?poolId=${pool.contractId}`}>
                  <IconButton variant="add">
                    <AddIcon />
                  </IconButton>
                </StyledLink>
              </Col5>
            </>
          ) : (
            <>
              <Col3 isDarkTheme={isDarkTheme}>
                <LabelWrapper>
                  <Label>Tvl</Label>
                  <InfoCircleIcon />
                </LabelWrapper>
                <TVLLabel>
                  {pool.tvl 
                    ? typeof pool.tvl === 'number' 
                      ? `$${formatter.format(pool.tvl)}` 
                      : `$${pool.tvl}`
                    : "$0"}
                </TVLLabel>
              </Col3>
              <Col3 isDarkTheme={isDarkTheme}>
                <LabelWrapper>
                  <Label>Volume</Label>
                  <InfoCircleIcon />
                </LabelWrapper>
                <VolumeLabel>
                  {pool?.vol 
                    ? typeof pool.vol === 'number' 
                      ? `$${formatter.format(pool.vol)}` 
                      : `$${pool.vol}`
                    : "$0"}
                </VolumeLabel>
              </Col3>
              <Col4 isDarkTheme={isDarkTheme}>
                <LabelWrapper>
                  <Label>APR</Label>
                  <InfoCircleIcon />
                </LabelWrapper>
                <Tooltip title={aprTooltipContent()} arrow placement="top">
                  <APRLabelContainer>
                    {calculateTotalApr() >= 30 ? (
                      <BlueFlameAPRLabel>
                        {calculateTotalApr().toFixed(2)}%
                      </BlueFlameAPRLabel>
                    ) : calculateTotalApr() >= 10 ? (
                      <APRBoostLabel>
                        {calculateTotalApr().toFixed(2)}%
                      </APRBoostLabel>
                    ) : (
                      <APRLabel>{calculateTotalApr().toFixed(2)}%</APRLabel>
                    )}
                  </APRLabelContainer>
                </Tooltip>
              </Col4>
              <Col5>
                <StyledLink to={`/swap?poolId=${pool.contractId}`}>
                  <IconButton variant="remove">
                    <RemoveIcon />
                  </IconButton>
                </StyledLink>
                <StyledLink to={`/pool/add?poolId=${pool.contractId}`}>
                  <IconButton variant="add">
                    <AddIcon />
                  </IconButton>
                </StyledLink>
              </Col5>
            </>
          )}
        </PoolCardRow>
      </PoolCardRoot>
    </Fade>
  );
};

export default PoolCard;
