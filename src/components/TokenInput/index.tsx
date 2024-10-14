import styled from "@emotion/styled";
import React, { FC } from "react";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import TokenSelect from "../TokenSelect";
import { ARC200TokenI, PoolI } from "../../types";
import { tokenSymbol } from "../../utils/dex";
import { prepareString } from "../../utils/string";
import { Fade, Grow, Stack, Tooltip } from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";

const MaxButton = styled.div`
  display: flex;
  padding: 6px;
  justify-content: center;
  align-items: flex-end;
  gap: 10px;
  border-radius: 5px;
  &.light {
    background: var(--Color-Brand-Background-Primary-100, #d4a0ff);
  }
  &.dark {
    background: var(--Color-Brand-Background-Primary-100, #f1eafc);
  }
`;

const MaxButtonLabel = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 14.4px */
  cursor: pointer;
  color: var(--Color-Brand-Pure-Black, #000);
`;

const SwapTokenContainer = styled.div`
  display: flex;
  padding: var(--Spacing-800, 24px) var(--Spacing-900, 32px);
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Spacing-700, 16px);
  border-radius: var(--Radius-800, 24px);
  &.light {
    background: var(--Color-Brand-Background-Primary-30, #f1eafc);
  }
  &.dark {
    background: var(--Color-Brand-Background-Primary-30, #291C47);
  }
  @media screen and (min-width:600px) {
  align-self: stretch;
    
  }
`;

const SwapTokenLabel = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  /* Body/Title 1 */
  font-family: "IBM Plex Sans Condensed";
  font-size: 15px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 18px */
  &.light {
    color: var(--Color-Neutral-Element-Primary, #0c0c10);
  }
  &.dark {
    color: var(--Color-Neutral-Element-Primary, #fff);
  }
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  align-self: stretch;
`;

const Row1 = styled(Row)`
  padding-bottom: 6px;
  &.light {
    border-bottom: 1px solid var(--Color-Neutral-Stroke-Primary, #d8d8e1);
  }
  &.dark {
    border-bottom: 1px solid
      var(--Color-Neutral-Stroke-Primary, rgba(255, 255, 255, 0.2));
  }
  @media screen and (max-width: 600px) {
    flex-direction: column;
    gap: 8px;
  }
`;

const Row2 = styled(Row)`
  align-items: center;
`;

const TokenContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;

`;

const TokenRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;

`;

const TokenLogo = styled.div`
  display: flex;
  padding: 4px;
  align-items: center;
  gap: 10px;
  border-radius: 50px;
  background: var(--Color-Brand-Amber, #ffbe1d);
`;

const Logo = styled.div`
  display: flex;
  width: 24px;
  height: 24px;
  justify-content: center;
  align-items: center;
  border-radius: var(--Radius-300, 8px);
    --Color-Neutral-Background-Transparent,
    rgba(255, 255, 255, 0)
  );
`;

const TokenButtonContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;

`;

const TokenButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;


`;

const TokenLabel = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  /* Body/Small */
  font-family: "IBM Plex Sans Condensed";
  font-size: 10px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 12px */
  width: 100%;

  &.light {
    color: var(--Brand-Black, #000);
  }
  &.dark {
    color: var(--Color-Neutral-Element-Primary, #fff);
  }
`;

const TokenIdContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const TokenIdLabel = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  /* Body/P medium */
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 14.4px */
  &.light {
    color: var(--Brand-Black, #000);
  }
  &.dark {
    color: var(--Color-Neutral-Element-Primary, #fff);
  }
`;

const TokenInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`;

const TokenInput = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Spacing-400, 8px);
  width: 318px;
  @media screen and (max-width: 400px) {
    width: 280px;
  }
`;

const TokenInputContainer = styled.div`
  display: flex;
  padding: 13px var(--Spacing-600, 12px);
  align-items: center;
  gap: var(--Spacing-400, 8px);
  align-self: stretch;
  border-radius: var(--Radius-300, 8px);
  background: var(
    --Color-Comp-Input-Background-Default,
    rgba(255, 255, 255, 0)
  );
  &.light {
    border: 1.5px solid
      var(--Color-Neutral-Stroke-Primary-Static-Contrast, #7e7e9a);
  }
  &.dark {
    border: 1.5px solid
      var(
        --Color-Neutral-Stroke-Primary-Static-Contrast,
        rgba(255, 255, 255, 0.5)
      );
  }
  & input {
    color: var(--Color-Neutral-Element-Secondary, #f6f6f8);
  }
  &.has-value.dark {
    border: 2px solid var(--Color-Neutral-Stroke-Black, #fff);
  }
  &.has-value.light {
    border: 2px solid var(--Color-Neutral-Stroke-Black, #141010);
  }
  &.has-value {
    background: var(--Color-Neutral-Background-Base-Static-Contrast, #fff);
    & input {
      color: var(--Color-Neutral-Element-Secondary-Static-Contrast, #565e6e);
    }
  }
`;

const Input = styled.input`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  flex: 1 0 0;
  overflow: hidden;
  text-align: right;
  font-feature-settings: "clig" off, "liga" off;
  text-overflow: ellipsis;
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 21.6px */
  width: 100%;
  &.light {
    color: var(--Color-Neutral-Element-Secondary, #56566e);
    &::placeholder {
      color: var(--Color-Neutral-Element-Secondary, #56566e);
    }
  }
  &.dark {
    color: var(--Color-Neutral-Element-Secondary, #f6f6f8);
    &::placeholder {
      color: var(--Color-Neutral-Element-Secondary, #f6f6f8);
    }
  }
`;

const InputValueHelperText = styled.div`
  text-align: right;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 15px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 18px */
  &.light {
    color: var(--Color-Neutral-Element-Secondary, #56566e);
  }
  &.dark {
    color: var(--Color-Neutral-Element-Secondary, #f6f6f8);
  }
`;

const BalanceContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 4px;
`;

const BalanceLabel = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 120%; /* 14.4px */
  &.light {
    color: var(--Color-Neutral-Element-Secondary, #56566e);
  }
  &.dark {
    color: var(--Color-Neutral-Element-Secondary, #f6f6f8);
  }
`;

const BalanceValue = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 14.4px */
  &.light {
    color: var(--Color-Neutral-Element-Primary, #0c0c10);
  }
  &.dark {
    color: var(--Color-Neutral-Element-Primary, #fff);
  }
`;

const WalletIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M8.66663 7.43335H4.66663"
        stroke="#ffffff"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M1.33337 7.43331V4.35331C1.33337 2.99331 2.43338 1.89331 3.79338 1.89331H7.54004C8.90004 1.89331 10 2.73998 10 4.09998"
        stroke="#ffffff"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M11.6534 8.13318C11.32 8.45318 11.16 8.9465 11.2934 9.45317C11.46 10.0732 12.0734 10.4665 12.7134 10.4665H13.3334V11.4332C13.3334 12.9065 12.14 14.0999 10.6667 14.0999H4.00004C2.52671 14.0999 1.33337 12.9065 1.33337 11.4332V6.76652C1.33337 5.29319 2.52671 4.09985 4.00004 4.09985H10.6667C12.1334 4.09985 13.3334 5.29985 13.3334 6.76652V7.73315H12.6134C12.24 7.73315 11.9 7.87985 11.6534 8.13318Z"
        stroke="#ffffff"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M14.6666 8.41341V9.78674C14.6666 10.1601 14.3599 10.4668 13.9799 10.4668H12.6933C11.9733 10.4668 11.3133 9.94009 11.2533 9.22009C11.2133 8.80009 11.3733 8.40676 11.6533 8.13342C11.8999 7.88009 12.2399 7.7334 12.6133 7.7334H13.9799C14.3599 7.7334 14.6666 8.04008 14.6666 8.41341Z"
        stroke="#ffffff"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

const TokenIcon = styled.img`
  height: 32px;
  width: 32px;
  border-radius: 50%;
`;

interface SwapProps {
  poolId?: number;
  tokenId?: number;
  label: string;
  amount: string;
  setAmount: (amount: string) => void;
  token?: ARC200TokenI;
  token2?: ARC200TokenI;
  setToken: (token: ARC200TokenI) => void;
  options?: ARC200TokenI[];
  balance?: string;
  onFocus: () => void;
  showInput?: boolean;
  displayId?: number;
  tokInfo?: any;
}
const Swap: FC<SwapProps> = ({
  label,
  amount,
  setAmount,
  token,
  token2,
  setToken,
  options,
  balance,
  onFocus,
  showInput = true,
  displayId,
  tokInfo,
}) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const handleMaxClick = () => {
    if (balance) {
      setAmount(balance);
    }
  };
  const isWVOI = tokInfo?.tokenId === "0";
  const badge = isWVOI ? (
    <Tooltip title="Trusted by Nautilus" placement="right" arrow>
      <VerifiedUserIcon fontSize="small" sx={{ color: "gold " }} />
    </Tooltip>
  ) : tokInfo?.verified || 0 > 0 ? (
    <Tooltip title="Verified by Nautilus" placement="right" arrow>
      <VerifiedUserIcon fontSize="small" />
    </Tooltip>
  ) : null;
  let icon = null;
  if (isWVOI) {
    icon = (
      <Tooltip title="Voi" placement="top" arrow>
        <TokenIcon
          src={`https://asset-verification.nautilus.sh/icons/0.png`}
          alt={`VOI icon`}
        />
      </Tooltip>
    );
  } else if (tokInfo?.verified > 0) {
    icon = (
      <Tooltip title={tokInfo?.name} placement="top" arrow>
        <TokenIcon
          src={`https://asset-verification.nautilus.sh/icons/${tokInfo?.contractId}.png`}
          alt={`${tokInfo?.symbol} icon`}
        />
      </Tooltip>
    );
  } else {
    icon = (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="16" fill="#FFBE1D" />
        <path
          d="M4 16C4 12.2725 4 10.4087 4.60896 8.93853C5.42092 6.97831 6.97831 5.42092 8.93853 4.60896C10.4087 4 12.2725 4 16 4C19.7275 4 21.5913 4 23.0615 4.60896C25.0217 5.42092 26.5791 6.97831 27.391 8.93853C28 10.4087 28 12.2725 28 16C28 19.7275 28 21.5913 27.391 23.0615C26.5791 25.0217 25.0217 26.5791 23.0615 27.391C21.5913 28 19.7275 28 16 28C12.2725 28 10.4087 28 8.93853 27.391C6.97831 26.5791 5.42092 25.0217 4.60896 23.0615C4 21.5913 4 19.7275 4 16Z"
          fill="white"
          fill-opacity="0.01"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M12.6187 7.38128C12.9604 7.72299 12.9604 8.27701 12.6187 8.61872L8.61872 12.6187C8.27701 12.9604 7.72299 12.9604 7.38128 12.6187C7.03957 12.277 7.03957 11.723 7.38128 11.3813L11.3813 7.38128C11.723 7.03957 12.277 7.03957 12.6187 7.38128ZM18.6187 7.38128C18.9604 7.72299 18.9604 8.27701 18.6187 8.61872L8.61872 18.6187C8.27701 18.9604 7.72299 18.9604 7.38128 18.6187C7.03957 18.277 7.03957 17.723 7.38128 17.3813L17.3813 7.38128C17.723 7.03957 18.277 7.03957 18.6187 7.38128ZM24.6187 7.38128C24.9604 7.72299 24.9604 8.27701 24.6187 8.61872L8.61872 24.6187C8.27701 24.9604 7.72299 24.9604 7.38128 24.6187C7.03957 24.277 7.03957 23.723 7.38128 23.3813L23.3813 7.38128C23.723 7.03957 24.277 7.03957 24.6187 7.38128ZM24.6187 13.3813C24.9604 13.723 24.9604 14.277 24.6187 14.6187L14.6187 24.6187C14.277 24.9604 13.723 24.9604 13.3813 24.6187C13.0396 24.277 13.0396 23.723 13.3813 23.3813L23.3813 13.3813C23.723 13.0396 24.277 13.0396 24.6187 13.3813ZM24.6187 19.3813C24.9604 19.723 24.9604 20.277 24.6187 20.6187L20.6187 24.6187C20.277 24.9604 19.723 24.9604 19.3813 24.6187C19.0396 24.277 19.0396 23.723 19.3813 23.3813L23.3813 19.3813C23.723 19.0396 24.277 19.0396 24.6187 19.3813Z"
          fill="#56566E"
        />
      </svg>
    );
  }

  return (
    <SwapTokenContainer className={isDarkTheme ? "dark" : "light"}>
      <SwapTokenLabel className={isDarkTheme ? "dark" : "light"}>
        {label}
      </SwapTokenLabel>
      <Row1 className={isDarkTheme ? "dark" : "light"}>
        <TokenContainer>
          <TokenRow>
            {icon}
            <TokenButtonContainer>
              <TokenButtonWrapper>
                <TokenSelect
                  token={token}
                  options={options}
                  onSelect={setToken}
                />
                <Stack sx={{ alignItems: "end" }} direction="row" spacing={1}>
                  <Stack>
                    <TokenLabel className={isDarkTheme ? "dark" : "light"}>
                      {tokenSymbol(token)}
                    </TokenLabel>
                    <TokenIdContainer>
                      <TokenIdLabel>
                        ID: {displayId || token?.tokenId || 0}
                      </TokenIdLabel>
                    </TokenIdContainer>
                  </Stack>
                  <div>{badge}</div>
                </Stack>
              </TokenButtonWrapper>
            </TokenButtonContainer>
          </TokenRow>
        </TokenContainer>
        <Fade in={showInput} timeout={500}>
          <TokenInputGroup>
            <TokenInput>
              <TokenInputContainer
                className={[
                  isDarkTheme ? "dark" : "light",
                  amount !== "" ? "has-value" : "has-placeholder",
                ].join(" ")}
              >
                <Input
                  className={isDarkTheme ? "dark" : "light"}
                  placeholder="0.00"
                  onKeyDown={() => onFocus()}
                  onChange={(e) => {
                    setAmount(e.target.value);
                  }}
                  value={amount}
                />
              </TokenInputContainer>
            </TokenInput>
            <InputValueHelperText className={isDarkTheme ? "dark" : "light"}>
              ~ 0 VOI
            </InputValueHelperText>
          </TokenInputGroup>
        </Fade>
      </Row1>
      <Row2>
        <BalanceContainer>
          <WalletIcon />
          <BalanceLabel className={isDarkTheme ? "dark" : "light"}>
            Your balance:
          </BalanceLabel>
          <BalanceValue>
            {balance || ""} {tokenSymbol(token)}
          </BalanceValue>
        </BalanceContainer>
        <Fade in={showInput} timeout={500}>
          <MaxButton
            onClick={() => {
              onFocus();
              handleMaxClick();
            }}
            className={isDarkTheme ? "dark" : "light"}
          >
            <MaxButtonLabel>Max</MaxButtonLabel>
          </MaxButton>
        </Fade>
      </Row2>
    </SwapTokenContainer>
  );
};

export default Swap;
