import React, { FC, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, Divider, Modal, Stack } from "@mui/material";
import mstyled from "@emotion/styled";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { useWallet } from "@txnlab/use-wallet-react";
import { CONNECTOR_ALGO_ARC200 } from "../../../constants/tokens";
import { getAlgorandClients } from "../../../wallets";
import algosdk from "algosdk";
import { CONTRACT } from "ulujs";
import { ZERO_ADDRESS } from "../../../constants/avm";
import { toast } from "react-toastify";
import { fetchToken, getToken } from "../../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import BigNumber from "bignumber.js";
import { ARC200TokenI } from "../../../types";

const CustomDialog = mstyled(Dialog)(({ theme }) => {
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return {
    "& .MuiDialog-paper": {
      borderRadius: "24px",
      //boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.1)",
      overflow: "hidden",
      //border: "1px solid #B8B8CC",
      /* dark */
      border:
        "1px solid var(--Color-Neutral-Stroke-Primary, rgba(255, 255, 255, 0.80))",
      boxShadow: "0px 4px 10px 0px rgba(255, 255, 255, 0.20)",
    },
    "& .MuiDialogContent-root": {
      /*
      padding: "var(--Spacing-1200, 64px) var(--Spacing-1300, 128px)",
      */
      width: "323px",
      overflow: "hidden",
    },
  };
});

const ModalBodyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 32px;
`;

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--Spacing-900, 32px);
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

const TextInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Spacing-400, 8px);
  align-self: stretch;
  width: 100%;
  min-width: 300px;
`;

const TextInputLabel = styled.div`
  align-self: stretch;
  color: var(--Color-Neutral-Element-Primary, #fff);
  font-feature-settings: "clig" off, "liga" off;

  /* Heading/Display 3 */
  font-family: "Plus Jakarta Sans";
  font-size: 13px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 15.6px */
`;

const TextInput = styled.div`
  display: flex;
  padding: var(--Spacing-700, 16px) var(--Spacing-600, 12px);
  align-items: center;
  gap: var(--Spacing-400, 8px);
  align-self: stretch;
  border-radius: var(--Radius-300, 8px);
  border: 1.5px solid
    var(
      --Color-Neutral-Stroke-Primary-Static-Contrast,
      rgba(255, 255, 255, 0.5)
    );
  background: var(
    --Color-Comp-Input-Background-Default,
    rgba(255, 255, 255, 0)
  );
`;

const TextPlaceholder = styled.div`
  display: flex;
  align-items: center;
  flex: 1 0 0;
`;

const PlaceholderText = styled.input`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  flex: 1 0 0;
  overflow: hidden;
  color: var(--Color-Neutral-Element-Secondary, #f6f6f8);
  font-feature-settings: "clig" off, "liga" off;
  text-overflow: ellipsis;
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 16.8px */
`;

const Button = styled.div`
  cursor: pointer;
`;

const AddTokenButton = styled(Button)`
  display: flex;
  padding: var(--Spacing-600, 12px) var(--Spacing-700, 16px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex: 1 0 0;
  align-self: stretch;
  border-radius: var(--Radius-700, 16px);
  background: var(--Color-Accent-CTA-Background-Default, #2958ff);
  &.disabled {
    background: var(--Color-Accent-CTA-Background-Default, grey);
  }
`;

const CancelButton = styled(Button)`
  display: flex;
  padding: var(--Spacing-600, 12px) var(--Spacing-700, 16px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: var(--Radius-700, 16px);
  border: 1px solid
    var(--Color-Accent-Secondary-Stroke-Base, rgba(255, 255, 255, 0.7));
  background: var(--Color-Accent-Secondary-Background-Default, #141010);
`;

const ButtonInner = styled.div`
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
  font-size: 18px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 21.6px */
`;

const XIcon = () => {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.5 21.75L3.5 3.75"
        stroke="white"
        stroke-width="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.5001 3.75L3.5 21.7501"
        stroke="white"
        stroke-width="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface TokenIconProps {
  theme: "light" | "dark";
}
const TokenIcon: FC<TokenIconProps> = ({ theme }) => {
  return theme === "light" ? (
    <svg
      width="28"
      height="29"
      viewBox="0 0 28 29"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.748047"
        width="27"
        height="27"
        rx="13.5"
        stroke="black"
      />
      <path
        d="M14 9.24805L18.1667 6.74805L22.3334 9.24805V19.248L18.1667 21.748L9.83337 16.748V11.748L18.1667 16.748V11.748L14 9.24805Z"
        stroke="black"
        stroke-width="1.25"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 9.24805L9.83335 6.74805L5.66669 9.24805V19.248L9.83335 21.748L13.75 19.1397"
        stroke="black"
        stroke-width="1.25"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      width="20"
      height="21"
      viewBox="0 0 20 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.99992 5.24805L14.1666 2.74805L18.3333 5.24805V15.248L14.1666 17.748L5.83325 12.748V7.74805L14.1666 12.748V7.74805L9.99992 5.24805Z"
        stroke="white"
        stroke-width="1.25"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.0001 5.24805L5.83341 2.74805L1.66675 5.24805V15.248L5.83341 17.748L9.75008 15.1397"
        stroke="white"
        stroke-width="1.25"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

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
      <g clip-path="url(#clip0_392_56109)">
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
      <g clip-path="url(#clip0_392_57147)">
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
        //fill="#0C0C10"
        fill="#fff"
      />
      <path
        d="M45.9853 2.09147C39.6195 7.5687 31.5202 10.6155 23.1227 10.6919C14.7252 10.7683 6.57182 7.86936 0.107422 2.50885L1.4473 0.893042C7.53 5.93703 15.202 8.66479 23.1036 8.5929C31.0053 8.52102 38.6263 5.65413 44.6162 0.500309L45.9853 2.09147Z"
        //fill="#141010"
        fill="#fff"
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
}

const SwapSuccessfulModal: React.FC<SwapSuccessfulModalProps> = ({
  open,
  handleClose,
}) => {
  const navigate = useNavigate();
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const { activeAccount, signTransactions, 
    //sendTransactions 
  } = useWallet();
  const [tokenId, setTokenId] = useState("");
  const [token, setToken] = useState<ARC200TokenI>();
  const isValid = useMemo(() => {
    if (!tokenId || isNaN(Number(tokenId))) return false;
    return true;
  }, [tokenId]);
  useEffect(() => {
    if (!isValid) return;
  }, [isValid, tokenId]);
  const handleAddButtonClick = async () => {
    if (!activeAccount || !isValid || !token) return;
    await toast.promise(getToken(Number(tokenId)), {
      pending: "Adding token",
      success: "Token added!",
    });
    handleClose();
  };
  const handleLookupButtonClick = async () => {
    if (!activeAccount || !isValid) return;
    try {
      const token = await fetchToken(Number(tokenId));
      setToken(token);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  return (
    <CustomDialog open={open} onClose={handleClose}>
      <DialogContent
        sx={{
          background: isDarkTheme ? "#000" : "#fff",
        }}
      >
        {/* <ModalPattern theme={isDarkTheme ? "dark" : "light"} /> */}
        <ModalBodyContainer>
          <ModalBody>
            <ModalTitleContainer>
              <SmileIcon />
              <ModalTitle className={isDarkTheme ? "dark" : "light"}>
                Add token
              </ModalTitle>
            </ModalTitleContainer>
            <TextInputContainer>
              <TextInputLabel>Token Id</TextInputLabel>
              <TextInput
                onChange={(e: any) => {
                  setTokenId(e.target.value);
                }}
              >
                <TextPlaceholder>
                  <PlaceholderText placeholder="6778021" value={tokenId} />
                </TextPlaceholder>
              </TextInput>
            </TextInputContainer>
            {/*<TextInputContainer>
              <TextInputLabel>Name ({name.length}/32)</TextInputLabel>
              <TextInput
                onChange={(e: any) => {
                  const newName = e.target.value;
                  if (newName.length > 32) return;
                  setName(e.target.value);
                }}
              >
                <TextPlaceholder>
                  <PlaceholderText
                    placeholder="Real Worl Asset Token"
                    value={name}
                  />
                </TextPlaceholder>
              </TextInput>
            </TextInputContainer>
            <TextInputContainer>
              <TextInputLabel>Symbol ({symbol.length}/8)</TextInputLabel>
              <TextInput
                onChange={(e: any) => {
                  const newSymbol = e.target.value;
                  if (newSymbol.length > 8) return;
                  setSymbol(e.target.value);
                }}
              >
                <TextPlaceholder>
                  <PlaceholderText placeholder="RWA" value={symbol} />
                </TextPlaceholder>
              </TextInput>
            </TextInputContainer>
            <TextInputContainer>
              <TextInputLabel>Decimals</TextInputLabel>
              <TextInput
                onChange={(e: any) => {
                  const newValue = e.target.value;
                  if (Number(newValue) > 256) return;
                  setDecimals(newValue);
                }}
              >
                <TextPlaceholder>
                  <PlaceholderText
                    type="number"
                    placeholder="6"
                    value={decimals}
                  />
                </TextPlaceholder>
              </TextInput>
            </TextInputContainer>
            <TextInputContainer>
              <TextInputLabel>Total Supply</TextInputLabel>
              <TextInput
                onChange={(e: any) => {
                  const newValue = e.target.value;
                  setTotalSupply(newValue);
                }}
              >
                <TextPlaceholder>
                  <PlaceholderText
                    type="number"
                    placeholder="10,000,000,000"
                    value={totalSupply}
                  />
                </TextPlaceholder>
              </TextInput>
              </TextInputContainer>*/}
            {!token ? (
              <AddTokenButton
                onClick={() => {
                  if (!isValid) return;
                  handleLookupButtonClick();
                }}
                className={!isValid ? "disabled" : ""}
              >
                <ButtonInner>
                  <ButtonLabel>Lookup token</ButtonLabel>
                </ButtonInner>
              </AddTokenButton>
            ) : (
              <>
                <Stack sx={{ color: "white", width: "100%" }} gap={2}>
                  {[
                    {
                      label: "Asset name",
                      value: token.name,
                    },
                    {
                      label: "Asset symbol",
                      value: token.symbol,
                    },
                    {
                      label: "Decimals",
                      value: token.decimals,
                    },
                    {
                      label: "Total supply",
                      value: new BigNumber(token.totalSupply.toString())
                        .div(new BigNumber(10).pow(token.decimals))
                        .toFormat(0),
                    },
                  ].map((el) => (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>{el.label}:</div>
                      <div>{el.value}</div>
                    </div>
                  ))}
                </Stack>
                <AddTokenButton
                  onClick={() => {
                    if (!isValid) return;
                    handleAddButtonClick();
                  }}
                  className={!isValid ? "disabled" : ""}
                >
                  <ButtonInner>
                    <ButtonLabel>Add token</ButtonLabel>
                  </ButtonInner>
                </AddTokenButton>
              </>
            )}
            <CancelButton
              onClick={() => {
                handleClose();
              }}
            >
              <ButtonInner>
                <ButtonLabel>Cancel</ButtonLabel>
                <XIcon />
              </ButtonInner>
            </CancelButton>
          </ModalBody>
        </ModalBodyContainer>
      </DialogContent>
    </CustomDialog>
  );
};

export default SwapSuccessfulModal;
