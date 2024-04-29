import styled from "@emotion/styled";
import React, { FC, useEffect, useState } from "react";
import { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { ARC200TokenI, FarmI, PoolI } from "../../types";
import { Link } from "react-router-dom";
import { tokenSymbol } from "../../utils/dex";
import { getToken, getTokens, updateToken } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import Accordion from "@mui/material/Accordion";
import AccordionActions from "@mui/material/AccordionActions";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BigNumber from "bignumber.js";
import { getAlgorandClients } from "../../wallets";
import { CONTRACT, abi, arc200 } from "ulujs";
import { useWallet } from "@txnlab/use-wallet";
import moment from "moment";
import { toast } from "react-toastify";
import algosdk from "algosdk";
import { Button, ButtonGroup, Stack } from "@mui/material";
import { CTCINFO_STAKR_200 } from "../../constants/dex";
import { TOKEN_WVOI1 } from "../../constants/tokens";

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
`;

const PoolCardRoot = styled.div`
  display: flex;
  padding: var(--Spacing-700, 16px) var(--Spacing-600, 12px);
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Spacing-600, 12px);
  align-self: stretch;
  border-radius: var(--Radius-500, 12px) !important;
  border: 1px solid
    var(--Color-Neutral-Stroke-Primary, rgba(255, 255, 255, 0.2));
  background: var(--Color-Canvas-Transparent-white-900, #070709);
`;

const PoolCardRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-self: stretch;
  width: 100%;
  align-items: center;
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
  gap: var(--Spacing-200, 4px);
`;

const PairInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`;

const PairIds = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
`;

const PairTokens = styled.div`
  display: flex;
  padding-bottom: var(--Spacing-400, 8px);
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid
    var(--Color-Neutral-Stroke-Primary, rgba(255, 255, 255, 0.2));
`;

const PairTokenLabel = styled.div`
  color: var(--Color-Neutral-Element-Primary, #fff);
  leading-trim: both;
  text-edge: cap;
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
        stroke="white"
        stroke-opacity="0.7"
      />
      <path
        d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12Z"
        fill="white"
        fill-opacity="0.01"
      />
      <g clip-path="url(#clip0_390_19487)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M8.61872 3.38128C8.96043 3.72299 8.96043 4.27701 8.61872 4.61872L4.61872 8.61872C4.27701 8.96043 3.72299 8.96043 3.38128 8.61872C3.03957 8.27701 3.03957 7.72299 3.38128 7.38128L7.38128 3.38128C7.72299 3.03957 8.27701 3.03957 8.61872 3.38128ZM14.6187 3.38128C14.9604 3.72299 14.9604 4.27701 14.6187 4.61872L4.61872 14.6187C4.27701 14.9604 3.72299 14.9604 3.38128 14.6187C3.03957 14.277 3.03957 13.723 3.38128 13.3813L13.3813 3.38128C13.723 3.03957 14.277 3.03957 14.6187 3.38128ZM20.6187 3.38128C20.9604 3.72299 20.9604 4.27701 20.6187 4.61872L4.61872 20.6187C4.27701 20.9604 3.72299 20.9604 3.38128 20.6187C3.03957 20.277 3.03957 19.723 3.38128 19.3813L19.3813 3.38128C19.723 3.03957 20.277 3.03957 20.6187 3.38128ZM20.6187 9.38128C20.9604 9.72299 20.9604 10.277 20.6187 10.6187L10.6187 20.6187C10.277 20.9604 9.72299 20.9604 9.38128 20.6187C9.03957 20.277 9.03957 19.723 9.38128 19.3813L19.3813 9.38128C19.723 9.03957 20.277 9.03957 20.6187 9.38128ZM20.6187 15.3813C20.9604 15.723 20.9604 16.277 20.6187 16.6187L16.6187 20.6187C16.277 20.9604 15.723 20.9604 15.3813 20.6187C15.0396 20.277 15.0396 19.723 15.3813 19.3813L19.3813 15.3813C19.723 15.0396 20.277 15.0396 20.6187 15.3813Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_390_19487">
          <rect
            width="16"
            height="16"
            fill="white"
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
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M8.61872 3.38128C8.96043 3.72299 8.96043 4.27701 8.61872 4.61872L4.61872 8.61872C4.27701 8.96043 3.72299 8.96043 3.38128 8.61872C3.03957 8.27701 3.03957 7.72299 3.38128 7.38128L7.38128 3.38128C7.72299 3.03957 8.27701 3.03957 8.61872 3.38128ZM14.6187 3.38128C14.9604 3.72299 14.9604 4.27701 14.6187 4.61872L4.61872 14.6187C4.27701 14.9604 3.72299 14.9604 3.38128 14.6187C3.03957 14.277 3.03957 13.723 3.38128 13.3813L13.3813 3.38128C13.723 3.03957 14.277 3.03957 14.6187 3.38128ZM20.6187 3.38128C20.9604 3.72299 20.9604 4.27701 20.6187 4.61872L4.61872 20.6187C4.27701 20.9604 3.72299 20.9604 3.38128 20.6187C3.03957 20.277 3.03957 19.723 3.38128 19.3813L19.3813 3.38128C19.723 3.03957 20.277 3.03957 20.6187 3.38128ZM20.6187 9.38128C20.9604 9.72299 20.9604 10.277 20.6187 10.6187L10.6187 20.6187C10.277 20.9604 9.72299 20.9604 9.38128 20.6187C9.03957 20.277 9.03957 19.723 9.38128 19.3813L19.3813 9.38128C19.723 9.03957 20.277 9.03957 20.6187 9.38128ZM20.6187 15.3813C20.9604 15.723 20.9604 16.277 20.6187 16.6187L16.6187 20.6187C16.277 20.9604 15.723 20.9604 15.3813 20.6187C15.0396 20.277 15.0396 19.723 15.3813 19.3813L19.3813 15.3813C19.723 15.0396 20.277 15.0396 20.6187 15.3813Z"
        fill="#F6F6F8"
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
        stroke="white"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M8 8V11.3333"
        stroke="white"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M7.99634 5.33398H8.00233"
        stroke="white"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
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
        fill-opacity="0.01"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M12.6187 7.38128C12.9604 7.72299 12.9604 8.27701 12.6187 8.61872L8.61872 12.6187C8.27701 12.9604 7.72299 12.9604 7.38128 12.6187C7.03957 12.277 7.03957 11.723 7.38128 11.3813L11.3813 7.38128C11.723 7.03957 12.277 7.03957 12.6187 7.38128ZM18.6187 7.38128C18.9604 7.72299 18.9604 8.27701 18.6187 8.61872L8.61872 18.6187C8.27701 18.9604 7.72299 18.9604 7.38128 18.6187C7.03957 18.277 7.03957 17.723 7.38128 17.3813L17.3813 7.38128C17.723 7.03957 18.277 7.03957 18.6187 7.38128ZM24.6187 7.38128C24.9604 7.72299 24.9604 8.27701 24.6187 8.61872L8.61872 24.6187C8.27701 24.9604 7.72299 24.9604 7.38128 24.6187C7.03957 24.277 7.03957 23.723 7.38128 23.3813L23.3813 7.38128C23.723 7.03957 24.277 7.03957 24.6187 7.38128ZM24.6187 13.3813C24.9604 13.723 24.9604 14.277 24.6187 14.6187L14.6187 24.6187C14.277 24.9604 13.723 24.9604 13.3813 24.6187C13.0396 24.277 13.0396 23.723 13.3813 23.3813L23.3813 13.3813C23.723 13.0396 24.277 13.0396 24.6187 13.3813ZM24.6187 19.3813C24.9604 19.723 24.9604 20.277 24.6187 20.6187L20.6187 24.6187C20.277 24.9604 19.723 24.9604 19.3813 24.6187C19.0396 24.277 19.0396 23.723 19.3813 23.3813L23.3813 19.3813C23.723 19.0396 24.277 19.0396 24.6187 19.3813Z"
        fill="#F6F6F8"
      />
      <rect x="24" width="32" height="32" rx="16" fill="#FFBE1D" />
      <path
        d="M28 16C28 12.2725 28 10.4087 28.609 8.93853C29.4209 6.97831 30.9783 5.42092 32.9385 4.60896C34.4087 4 36.2725 4 40 4C43.7275 4 45.5913 4 47.0615 4.60896C49.0217 5.42092 50.5791 6.97831 51.391 8.93853C52 10.4087 52 12.2725 52 16C52 19.7275 52 21.5913 51.391 23.0615C50.5791 25.0217 49.0217 26.5791 47.0615 27.391C45.5913 28 43.7275 28 40 28C36.2725 28 34.4087 28 32.9385 27.391C30.9783 26.5791 29.4209 25.0217 28.609 23.0615C28 21.5913 28 19.7275 28 16Z"
        fill="white"
        fill-opacity="0.01"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M36.6187 7.38128C36.9604 7.72299 36.9604 8.27701 36.6187 8.61872L32.6187 12.6187C32.277 12.9604 31.723 12.9604 31.3813 12.6187C31.0396 12.277 31.0396 11.723 31.3813 11.3813L35.3813 7.38128C35.723 7.03957 36.277 7.03957 36.6187 7.38128ZM42.6187 7.38128C42.9604 7.72299 42.9604 8.27701 42.6187 8.61872L32.6187 18.6187C32.277 18.9604 31.723 18.9604 31.3813 18.6187C31.0396 18.277 31.0396 17.723 31.3813 17.3813L41.3813 7.38128C41.723 7.03957 42.277 7.03957 42.6187 7.38128ZM48.6187 7.38128C48.9604 7.72299 48.9604 8.27701 48.6187 8.61872L32.6187 24.6187C32.277 24.9604 31.723 24.9604 31.3813 24.6187C31.0396 24.277 31.0396 23.723 31.3813 23.3813L47.3813 7.38128C47.723 7.03957 48.277 7.03957 48.6187 7.38128ZM48.6187 13.3813C48.9604 13.723 48.9604 14.277 48.6187 14.6187L38.6187 24.6187C38.277 24.9604 37.723 24.9604 37.3813 24.6187C37.0396 24.277 37.0396 23.723 37.3813 23.3813L47.3813 13.3813C47.723 13.0396 48.277 13.0396 48.6187 13.3813ZM48.6187 19.3813C48.9604 19.723 48.9604 20.277 48.6187 20.6187L44.6187 24.6187C44.277 24.9604 43.723 24.9604 43.3813 24.6187C43.0396 24.277 43.0396 23.723 43.3813 23.3813L47.3813 19.3813C47.723 19.0396 48.277 19.0396 48.6187 19.3813Z"
        fill="#F6F6F8"
      />
    </svg>
  );
};

const PairInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`;

const Col2 = styled.div`
  display: flex;
  height: 32px;
  padding: var(--Spacing-400, 8px) 0px;
  align-items: center;
  gap: 10px;
`;

const TVLLabel = styled.div`
  color: var(--Color-Neutral-Element-Primary, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 16.8px */
`;

const VolumeLabel = styled.div`
  color: var(--Color-Neutral-Element-Primary, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 16.8px */
`;

const APRLabel = styled.div`
  color: var(--Color-Neutral-Element-Primary, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 16.8px */
`;

const Col3 = styled.div`
  display: flex;
  padding: 11px 0px var(--Spacing-400, 8px) 0px;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`;

const Col4 = styled.div`
  display: flex;
  padding: var(--Spacing-600, 12px) 0px var(--Spacing-400, 8px) 0px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
`;

const APRLabelContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

const Col5 = styled.div`
  display: flex;
  height: 65px;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Spacing-200, 4px);
`;

const AButton = styled.div`
  cursor: pointer;
`;

const AddButton = styled(AButton)`
  display: flex;
  padding: var(--Spacing-400, 8px) var(--Spacing-600, 12px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: var(--Radius-300, 8px);
  border: 1px solid
    var(--Color-Accent-Secondary-Stroke-Base, rgba(255, 255, 255, 0.7));
  background: var(--Color-Accent-Secondary-Background-Default, #141010);
`;

const ButtonLabelContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
`;

const AddButtonLabel = styled.div`
  color: var(--Color-Neutral-Element-Secondary, #f6f6f8);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 15px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 18px */
`;

const SwapButton = styled(AButton)`
  display: flex;
  padding: var(--Spacing-400, 8px) var(--Spacing-600, 12px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  border-radius: var(--Radius-300, 8px);
  background: var(--Color-Accent-CTA-Background-Default, #2958ff);
`;

const SwapButtonLabel = styled.div`
  color: var(--Color-Brand-White, #fff);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 16.8px */
`;

const spec = {
  name: "",
  desc: "",
  methods: [
    ...abi.arc200.methods,
    // custom()void
    {
      name: "custom",
      args: [],
      returns: { type: "void" },
    },
    // Staker_withdraw(uint64,uint256)(uint256,uint256)
    {
      name: "Staker_withdraw",
      args: [
        { name: "poolId", type: "uint64" },
        { name: "amount", type: "uint256" },
      ],
      returns: { type: "(uint256,uint256)" },
    },
    // Staker_harvest(uint64)((uint256),(uint256))
    {
      name: "Staker_harvest",
      args: [{ name: "poolId", type: "uint64" }],
      returns: { type: "((uint256),(uint256))" },
    },
    // Staker_stake(uint64,uint256)(uint256,uint256
    {
      name: "Staker_stake",
      args: [
        { name: "poolId", type: "uint64" },
        { name: "amount", type: "uint256" },
      ],
      returns: { type: "(uint256,uint256)" },
    },
    //staked: Fun([UInt, Address], UInt256), // poolId, addr -> staked
    {
      name: "staked",
      args: [
        { name: "poolId", type: "uint64" },
        { name: "addr", type: "address" },
      ],
      returns: { type: "uint256" },
    },
    //rewardsAvailable: Fun([UInt, Address], Rewards), // poolId, addr -> rewards
    {
      name: "rewardsAvailable",
      args: [
        { name: "poolId", type: "uint64" },
        { name: "addr", type: "address" },
      ],
      returns: { type: "(uint256)" },
    },
    // Info(uint64)(uint64,((uint64),uint64,(uint256),uint64,uint64),address,uint256,(uint256),uint64,(uint256),(uint256))
    {
      name: "Info",
      args: [{ name: "poolId", type: "uint64" }],
      returns: {
        type: "(uint64,((uint64),uint64,(uint256),uint64,uint64),address,uint256,(uint256),uint64,(uint256),(uint256))",
      },
    },
    // nt200 deposit
    {
      name: "deposit",
      args: [
        {
          name: "amount",
          type: "uint64",
        },
      ],
      returns: {
        type: "uint256",
      },
    },
  ],
  events: [
    {
      name: "Stake",
      args: [
        {
          type: "uint64",
        },
        {
          type: "address",
        },
        {
          type: "uint256",
        },
        {
          type: "(uint256,uint256)",
        },
      ],
    },
  ],
};

interface FarmCardProps {
  farm?: FarmI;
  round: number;
  timestamp: number;
}
const FarmCard: FC<FarmCardProps> = ({ farm, round, timestamp }) => {
  if (!farm) return null;
  const { activeAccount, signTransactions, sendTransactions } = useWallet();
  const [tokenA, setTokenA] = useState<ARC200TokenI>(); // rewards token
  const [tokenB, setTokenB] = useState<ARC200TokenI>(); // stake token
  const [balance, setBalance] = useState<string>();
  const [staked, setStaked] = useState<string>();
  const [rewards, setRewards] = useState<string>();
  const [totalStaked, setTotalStaked] = useState<string>();
  const [poolRewards, setPoolRewards] = useState<string>();
  const [apr, setApr] = useState<string>();
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const dispatch = useDispatch();
  // EFFECT: Fetch stake token balance
  useEffect(() => {
    if (!tokenB || !activeAccount) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    // if wrapped voi use voi balance
    if ([TOKEN_WVOI1].includes(tokenB.tokenId)) {
      algodClient
        .accountInformation(activeAccount.address)
        .do()
        .then((r: any) => {
          const amount = r.amount;
          const minBalance = r["min-balance"];
          const available = amount - minBalance;
          setBalance((available / 10 ** tokenB.decimals).toLocaleString());
        });
    } else {
      // otherwise use arc200 balance
      const ci = new arc200(tokenB.tokenId, algodClient, indexerClient);
      ci.arc200_balanceOf(activeAccount.address).then((arc200_balanceOfR) => {
        if (arc200_balanceOfR.success) {
          const arc200_balanceOf: any = arc200_balanceOfR.returnValue;
          const arc200_balanceOfBn = new BigNumber(arc200_balanceOf).div(
            new BigNumber(10).pow(tokenB.decimals)
          );
          setBalance(arc200_balanceOfBn.toFixed(0));
        }
      });
    }
  }, [tokenB, activeAccount]);
  // EFFECT: Fetch token A if not available
  useEffect(() => {
    if (farm.rewardsToken) {
      farm.rewardsToken.map((token) => {
        getToken(token).then((token) => {
          console.log({ token });
          setTokenA(token);
          dispatch(updateToken(token) as unknown as UnknownAction);
        });
      });
    }
  }, [dispatch]);
  // EFFECT: Fetch token B if not available
  useEffect(() => {
    if (farm.stakeToken) {
      getToken(farm.stakeToken).then((token) => {
        setTokenB(token);
        dispatch(updateToken(token) as unknown as UnknownAction);
      });
    }
  }, [dispatch]);
  // EFFECT
  useEffect(() => {
    if (!tokenA || !tokenB) return;
    const { algodClient, indexerClient } = getAlgorandClients();
    const ci = new CONTRACT(
      CTCINFO_STAKR_200,
      algodClient,
      indexerClient,
      spec,
      {
        addr: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
        sk: new Uint8Array(0),
      }
    );
    ci.Info(farm.poolId).then((res: any) => {
      if (!res.success) return;
      const [
        poolId,
        opts,
        rewarder,
        totalStaked,
        remainingRewards,
        lastRewardsRefreshed,
        lastRewardsPerShare_,
        rewardsPerBlock_,
      ] = res.returnValue;
      console.log({
        poolId,
        opts,
        rewarder,
        totalStaked,
        remainingRewards,
        lastRewardsRefreshed,
        lastRewardsPerShare_,
        rewardsPerBlock_,
      });
      setTotalStaked(
        new BigNumber(totalStaked)
          .dividedBy(10 ** tokenB?.decimals || 0)
          //.toFixed(tokenB?.decimals || 0)
          .toFixed(0)
          .toString()
      );
      setPoolRewards(
        new BigNumber(remainingRewards)
          .dividedBy(10 ** tokenA?.decimals || 0)
          //.toFixed(tokenA?.decimals || 0)
          .toFixed(0)
          .toString()
      );
      // calculate APR Rewards/TVL
      const rewardsPerBlock = new BigNumber(remainingRewards);
      const tvl = new BigNumber(totalStaked);
      const aprBn = rewardsPerBlock.dividedBy(tvl).times(100);
      const apr =
        totalStaked > BigInt(0)
          ? aprBn.isGreaterThan(new BigNumber(1000))
            ? ">1000%"
            : `${aprBn.toFixed(2)}%`
          : "-";
      setApr(apr);
    });
  }, [farm.poolId, tokenB, tokenA]);

  const handleAccordionChange = (
    event: React.SyntheticEvent,
    expanded: boolean
  ) => {
    if (!tokenA || !tokenB) return;
    if (expanded) {
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new CONTRACT(
        CTCINFO_STAKR_200,
        algodClient,
        indexerClient,
        spec,
        {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        }
      );
      Promise.all([
        ci.staked(farm.poolId, activeAccount?.address || ""),
        ci.rewardsAvailable(farm.poolId, activeAccount?.address || ""),
      ]).then((r: any[]) => {
        const [stakedR, rewardsR] = r;
        if (!stakedR.success || !rewardsR.success) return;
        const staked = stakedR.returnValue;
        const stakedBn = new BigNumber(staked).div(
          new BigNumber(10).pow(tokenB.decimals)
        );
        const [rewards] = rewardsR.returnValue;
        const rewardsBn = new BigNumber(rewards).div(
          new BigNumber(10).pow(tokenA.decimals)
        );
        setStaked(stakedBn.toFixed(0));
        setRewards(rewardsBn.toFixed(tokenA.decimals));
      });
    }
  };
  const handleUnstake = async () => {
    if (!activeAccount) return;
    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new CONTRACT(
        CTCINFO_STAKR_200,
        algodClient,
        indexerClient,
        spec,
        {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        }
      );
      const builder = {
        stakr200: new CONTRACT(
          CTCINFO_STAKR_200,
          algodClient,
          indexerClient,
          spec,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };
      const buildN = [
        builder.stakr200.Staker_withdraw(
          farm.poolId,
          BigInt(new BigNumber(1).times(1e6).toFixed(0))
        ),
      ];
      const buildP = (await Promise.all(buildN)).map(({ obj }) => obj);
      ci.setExtraTxns(buildP);
      ci.setEnableGroupResourceSharing(true);
      ci.setFee(3000);
      const customR = await ci.custom();
      if (!customR.success) throw new Error(customR.error);
      await toast.promise(
        signTransactions(
          customR.txns.map(
            (txn: any) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        ).then(sendTransactions),
        {
          pending: "Harvesting...",
          success: "Harvested!",
        }
      );
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    }
  };
  const handleExit = async () => {
    if (!activeAccount || !staked) return;
    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new CONTRACT(
        CTCINFO_STAKR_200,
        algodClient,
        indexerClient,
        spec,
        {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        }
      );
      const builder = {
        stakr200: new CONTRACT(
          CTCINFO_STAKR_200,
          algodClient,
          indexerClient,
          spec,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };
      const buildN = [
        builder.stakr200.Staker_withdraw(
          farm.poolId,
          BigInt(new BigNumber(staked).times(1e6).toFixed(0))
        ),
        builder.stakr200.Staker_harvest(farm.poolId),
      ];
      const buildP = (await Promise.all(buildN)).map(({ obj }) => obj);
      ci.setExtraTxns(buildP);
      ci.setEnableGroupResourceSharing(true);
      ci.setFee(3000);
      const customR = await ci.custom();
      if (!customR.success) throw new Error(customR.error);
      await toast.promise(
        signTransactions(
          customR.txns.map(
            (txn: any) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        ).then(sendTransactions),
        {
          pending: "Harvesting...",
          success: "Harvested!",
        }
      );
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    }
  };
  const handleHarvest = async () => {
    if (!activeAccount) return;
    try {
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new CONTRACT(
        CTCINFO_STAKR_200,
        algodClient,
        indexerClient,
        spec,
        {
          addr: activeAccount?.address || "",
          sk: new Uint8Array(0),
        }
      );
      const builder = {
        stakr200: new CONTRACT(
          CTCINFO_STAKR_200,
          algodClient,
          indexerClient,
          spec,
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          },
          true,
          false,
          true
        ),
      };
      const buildN = [builder.stakr200.Staker_harvest(farm.poolId)];
      const buildP = (await Promise.all(buildN)).map(({ obj }) => obj);
      ci.setExtraTxns(buildP);
      ci.setEnableGroupResourceSharing(true);
      ci.setFee(3000);
      const customR = await ci.custom();
      if (!customR.success) throw new Error(customR.error);
      await toast.promise(
        signTransactions(
          customR.txns.map(
            (txn: any) => new Uint8Array(Buffer.from(txn, "base64"))
          )
        ).then(sendTransactions),
        {
          pending: "Harvesting...",
          success: "Harvested!",
        }
      );
    } catch (e: any) {
      console.log(e);
      toast.error(e.message);
    }
  };
  const handleApprove = async () => {
    if (!activeAccount || !tokenB) return;
    try {
      const amtStr = window.prompt("Enter amount to stake", "0");
      const amt = new BigNumber(amtStr || "0");
      if (amt.isNaN()) throw new Error("Invalid amount");
      const amtAU = amt.times(10 ** tokenB.decimals);
      const { algodClient, indexerClient } = getAlgorandClients();
      const ci = new arc200(tokenB.tokenId, algodClient, indexerClient);
      const arc200_approveR = await ci.arc200_approve(
        algosdk.getApplicationAddress(CTCINFO_STAKR_200),
        BigInt(amtAU.toFixed(0)),
        true,
        false
      );
      if (!arc200_approveR.success) throw new Error(arc200_approveR.error);
      await signTransactions(
        arc200_approveR.txns.map(
          (txn) => new Uint8Array(Buffer.from(txn, "base64"))
        )
      ).then(sendTransactions);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleStake = async () => {
    if (!activeAccount || !tokenB) return;
    try {
      const amtStr = window.prompt("Enter amount to stake", "0");
      const amt = new BigNumber(amtStr || "0");
      if (amt.isNaN()) throw new Error("Invalid amount");
      const amtAU = amt.times(10 ** tokenB.decimals);
      const { algodClient, indexerClient } = getAlgorandClients();
      const ciArc200 = new CONTRACT(
        farm.stakeToken,
        algodClient,
        indexerClient,
        spec,
        {
          addr: activeAccount.address,
          sk: new Uint8Array(0),
        }
      );
      const arc200_allowanceR = await ciArc200.arc200_allowance(
        activeAccount.address,
        algosdk.getApplicationAddress(CTCINFO_STAKR_200)
      );
      if (!arc200_allowanceR.success)
        throw new Error("Failed to get allowance");
      const arc200_allowance = arc200_allowanceR.returnValue;
      const arc200_balanceOfR = await ciArc200.arc200_balanceOf(
        algosdk.getApplicationAddress(CTCINFO_STAKR_200)
      );
      if (!arc200_balanceOfR.success) throw new Error("Failed to get balance");
      const arc200_balanceOf = arc200_balanceOfR.returnValue;
      do {
        // ensure wvoi box
        if (![TOKEN_WVOI1].includes(farm.stakeToken)) {
          break;
        }
        const ciwVOI = new CONTRACT(
          farm.stakeToken,
          algodClient,
          indexerClient,
          {
            name: "",
            desc: "",
            methods: [
              {
                name: "createBalanceBox",
                args: [
                  {
                    type: "address",
                  },
                ],
                returns: {
                  type: "byte",
                },
              },
            ],
            events: [],
          },
          {
            addr: activeAccount.address,
            sk: new Uint8Array(0),
          }
        );
        const createBalanceBoxR = await ciwVOI.createBalanceBox(
          activeAccount.address
        );
        if (!createBalanceBoxR.success) {
          break;
        }
        await toast.promise(
          signTransactions(
            createBalanceBoxR.txns.map(
              (txn: any) => new Uint8Array(Buffer.from(txn, "base64"))
            )
          ).then(sendTransactions),
          {
            pending: "Creating balance box...",
            success: "Balance box created!",
          }
        );
        return;
      } while (0);
      do {
        // try to approve without box payment
        const arc200_approveR = await ciArc200.arc200_approve(
          algosdk.getApplicationAddress(CTCINFO_STAKR_200),
          BigInt(amtAU.toFixed(0))
        );
        if (!arc200_approveR.success) {
          // approve with box payment
          ciArc200.setPaymentAmount(28100);
          const arc200_approveR = await ciArc200.arc200_approve(
            algosdk.getApplicationAddress(CTCINFO_STAKR_200),
            BigInt(amtAU.toFixed(0))
          );
          if (!arc200_approveR.success) throw new Error(arc200_approveR.error);
          await toast.promise(
            signTransactions(
              arc200_approveR.txns.map(
                (txn: any) => new Uint8Array(Buffer.from(txn, "base64"))
              )
            ).then(sendTransactions),
            {
              pending: "Creating allowance box...",
              success: "Allowance balance created!",
            }
          );
          // followed by staking
          const ci = new CONTRACT(
            CTCINFO_STAKR_200,
            algodClient,
            indexerClient,
            spec,
            {
              addr: activeAccount?.address || "",
              sk: new Uint8Array(0),
            }
          );
          ci.setPaymentAmount(50000);
          ci.setFee(3000);
          const Staker_stakeR = await ci.Staker_stake(farm.poolId, 1e6);
          if (!Staker_stakeR.success) throw new Error(Staker_stakeR.error);
          await toast.promise(
            signTransactions(
              Staker_stakeR.txns.map(
                (txn: any) => new Uint8Array(Buffer.from(txn, "base64"))
              )
            ).then(sendTransactions),
            {
              pending: "Staking...",
              success: "Staked!",
            }
          );
          break;
        }
        // use builder
        const builder = {
          arc200: new CONTRACT(
            farm.stakeToken,
            algodClient,
            indexerClient,
            spec,
            {
              addr: activeAccount.address,
              sk: new Uint8Array(0),
            },
            true,
            false,
            true
          ),
          stakr200: new CONTRACT(
            CTCINFO_STAKR_200,
            algodClient,
            indexerClient,
            spec,
            {
              addr: activeAccount.address,
              sk: new Uint8Array(0),
            },
            true,
            false,
            true
          ),
        };
        const buildN = [];
        if ([TOKEN_WVOI1].includes(farm.stakeToken)) {
          buildN.push(builder.arc200.deposit(BigInt(amtAU.toFixed(0))));
        }
        buildN.push(
          builder.arc200.arc200_approve(
            algosdk.getApplicationAddress(CTCINFO_STAKR_200),
            arc200_allowance + BigInt(amtAU.toFixed(0))
          )
        );
        // if pool balance is zero
        buildN.push(
          builder.arc200.arc200_transfer(
            algosdk.getApplicationAddress(CTCINFO_STAKR_200),
            0
          )
        );
        buildN.push(
          builder.stakr200.Staker_stake(farm.poolId, BigInt(amtAU.toFixed(0)))
        );
        const buildP = (await Promise.all(buildN)).map(({ obj }) => obj);

        let customR;
        if ([TOKEN_WVOI1].includes(farm.stakeToken)) {
          const ci = new CONTRACT(
            farm.stakeToken,
            algodClient,
            indexerClient,
            spec,
            {
              addr: activeAccount?.address || "",
              sk: new Uint8Array(0),
            }
          );
          ci.setPaymentAmount(Number(amtAU.toFixed(0)));
          ci.setFee(2000);
          ci.setExtraTxns(buildP);
          ci.setEnableGroupResourceSharing(true);
          ci.setAccounts([algosdk.getApplicationAddress(CTCINFO_STAKR_200)]);
          customR = await ci.custom();
        } else {
          const ci = new CONTRACT(
            CTCINFO_STAKR_200,
            algodClient,
            indexerClient,
            spec,
            {
              addr: activeAccount?.address || "",
              sk: new Uint8Array(0),
            }
          );
          ci.setPaymentAmount(1e6);
          ci.setFee(2000);
          ci.setExtraTxns(buildP);
          ci.setEnableGroupResourceSharing(true);
          ci.setAccounts([algosdk.getApplicationAddress(CTCINFO_STAKR_200)]);
          customR = await ci.custom();
        }
        if (!customR.success) throw new Error(customR.error);
        await toast.promise(
          signTransactions(
            customR.txns.map(
              (txn: any) => new Uint8Array(Buffer.from(txn, "base64"))
            )
          ).then(sendTransactions),
          {
            pending: "Staking...",
            success: "Staked!",
          }
        );
      } while (0);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const symbolA = tokenA ? tokenSymbol(tokenA, true) : "...";
  const symbolB = tokenB ? tokenSymbol(tokenB, true) : "...";
  const renderFarmInfo = (
    <PoolCardRow>
      <Col1>
        <Col1Row1>
          <PairIconPlaceholder />
          <PairInfoContainer>
            <PairInfo>
              <PairTokens>
                <PairTokenLabel>{symbolB}</PairTokenLabel>
                <CryptoIconPlaceholder />
                <ArrowForwardIcon />
                <PairTokenLabel>{symbolA}</PairTokenLabel>
                <CryptoIconPlaceholder />
              </PairTokens>
            </PairInfo>
            <PairIds>
              {/*<Field>
                <FieldLabel>ID:</FieldLabel>
                <FieldValue>{farm.stakeToken}</FieldValue>
              </Field>
              <Field>
                <FieldLabel>ID:</FieldLabel>
                <FieldValue>{farm.rewardsToken}</FieldValue>
              </Field>*/}
              <Field>
                <FieldLabel>
                  {timestamp > farm.end ? "Ended" : "Ends"}
                </FieldLabel>
                {timestamp <= farm.end ? (
                  <FieldValue>{moment.unix(farm.end).fromNow()}</FieldValue>
                ) : null}
              </Field>
            </PairIds>
          </PairInfoContainer>
        </Col1Row1>
      </Col1>
      <Col2>
        <TVLLabel>{poolRewards}</TVLLabel>
      </Col2>
      <Col3>
        <VolumeLabel>{apr}</VolumeLabel>
      </Col3>
      <Col4>
        <APRLabelContainer>
          <APRLabel>{totalStaked}</APRLabel>
        </APRLabelContainer>
      </Col4>
      <Col5>&nbsp;</Col5>
    </PoolCardRow>
  );
  const isLoading = !tokenA || !tokenB;
  return (
    <PoolCardRoot className={isDarkTheme ? "dark" : "light"}>
      {activeAccount ? (
        <Accordion
          sx={{ background: "transparent", width: "100%" }}
          onChange={handleAccordionChange}
        >
          <AccordionSummary
            sx={{ color: "#fff" }}
            expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            {renderFarmInfo}
          </AccordionSummary>
          <AccordionDetails>
            <div
              style={{
                color: "#fff",
                display: "flex",
                flexDirection: "row",
                gap: "48px",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div>
                <div>Balance:</div>
                <div>{balance ? balance.toString() : "Loading..."}</div>
              </div>
              <div>
                <div>Staked:</div>
                <div>{staked ? staked.toString() : "Loading..."}</div>
              </div>
              <div>
                <div>Rewards:</div>
                <div>{rewards ? rewards.toString() : "Loading..."}</div>
              </div>
            </div>
          </AccordionDetails>
          <AccordionActions>
            <ButtonGroup size="small">
              {false ? farm?.poolId : null}
              {false ? <Button onClick={handleApprove}>Approve</Button> : null}
              <Button onClick={handleStake}>Stake</Button>
              <Button onClick={handleUnstake}>Unstake</Button>
              <Button onClick={handleHarvest}>Claim</Button>
              <Button onClick={handleExit}>Exit</Button>
            </ButtonGroup>
          </AccordionActions>
        </Accordion>
      ) : (
        renderFarmInfo
      )}
    </PoolCardRoot>
  );
};

export default FarmCard;
