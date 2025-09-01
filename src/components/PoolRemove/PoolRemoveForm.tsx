import React from "react";
import styled from "@emotion/styled";
import { CircularProgress } from "@mui/material";
import { PoolI, ARC200TokenI } from "../../types";
import { usePercentageInput } from "../../hooks/usePercentageInput";
import { usePoolRemove } from "../../hooks/usePoolRemove";

const SwapHeadingContainer = styled.div`
  width: 100%;
`;

const SwapHeading = styled.div`
  color: var(--Color-Neutral-Element-Primary, #0c0c10);
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%;
  &.dark {
    color: var(--Color-Neutral-Element-Primary, #fff);
  }
`;

const PercentageButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  margin-bottom: 16px;

  @media screen and (max-width: 599px) {
    gap: 4px;
  }
`;

const PercentageButton = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--Color-Neutral-Stroke-Primary-Static-Contrast, #7e7e9a);
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex: 1;
  white-space: nowrap;
  font-size: 14px;

  @media screen and (max-width: 599px) {
    padding: 8px;
  }

  &:hover {
    background: var(--Color-Accent-CTA-Background-Default, #2958ff);
    border-color: var(--Color-Accent-CTA-Background-Default, #2958ff);
  }

  &.active {
    background: var(--Color-Accent-CTA-Background-Default, #2958ff);
    border-color: var(--Color-Accent-CTA-Background-Default, #2958ff);
  }
`;

const InputContainer = styled.div`
  position: relative;
  width: 100%;
  margin-top: 8px;
`;

const CustomInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  padding-right: 32px;
  border-radius: 8px;
  border: 1px solid var(--Color-Neutral-Stroke-Primary-Static-Contrast, #7e7e9a);
  background: transparent;
  color: inherit;
  font-size: 14px;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type="number"] {
    -moz-appearance: textfield;
  }
`;

const InputAdornment = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: inherit;
  font-size: 14px;
  pointer-events: none;
`;

const AmountDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 14px;
`;

const TokenIcon = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
`;

const Button = styled.div`
  display: flex;
  padding: var(--Spacing-700, 16px) var(--Spacing-800, 24px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: var(--Radius-750, 20px);
  background: var(--Color-Accent-Disabled-Soft, #d8d8e1);
  cursor: pointer;
  margin-top: 16px;
  
  &.active {
    border-radius: var(--Radius-700, 16px);
    background: var(--Color-Accent-CTA-Background-Default, #2958ff);
    color: white;
  }
`;

interface PoolRemoveFormProps {
  pool: PoolI;
  token: ARC200TokenI;
  token2: ARC200TokenI;
  percentageInput: ReturnType<typeof usePercentageInput>;
  poolRemoveHook: ReturnType<typeof usePoolRemove>;
  getTokenIconUrl: (tokenId: number) => string;
  formatTokenAmount: (amount: number, decimals: number, symbol: string) => string;
  onRemoveLiquidity: () => void;
  isDarkTheme: boolean;
}

const PoolRemoveForm: React.FC<PoolRemoveFormProps> = ({
  pool,
  token,
  token2,
  percentageInput,
  poolRemoveHook,
  getTokenIconUrl,
  formatTokenAmount,
  onRemoveLiquidity,
  isDarkTheme,
}) => {
  const percentagePresets = [25, 50, 75, 100];

  const handlePercentageClick = (percentage: number) => {
    percentageInput.setPercentage(percentage);
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const number = parseFloat(value);
    if (value === "" || (number >= 0 && number <= 100)) {
      percentageInput.setPercentage(number);
    }
  };

  const buttonLabel = "Remove Liquidity";

  return (
    <>
      <SwapHeadingContainer>
        <SwapHeading className={isDarkTheme ? "dark" : "light"}>
          Remove Liquidity
        </SwapHeading>
      </SwapHeadingContainer>

      <PercentageButtonGroup>
        {percentagePresets.map((percentage) => (
          <PercentageButton
            key={percentage}
            className={
              percentageInput.value === percentage.toString() ? "active" : ""
            }
            onClick={() => handlePercentageClick(percentage)}
          >
            {percentage}%
          </PercentageButton>
        ))}
      </PercentageButtonGroup>

      <InputContainer>
        <CustomInput
          type="number"
          value={percentageInput.value}
          onChange={handleCustomInputChange}
          placeholder="0"
          min="0"
          max="100"
          step="0.01"
        />
        <InputAdornment>%</InputAdornment>
      </InputContainer>

      <div>
        <div>You will receive:</div>
        <AmountDisplay>
          <TokenIcon
            src={getTokenIconUrl(token.tokenId)}
            alt={token.symbol}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-token-icon.png";
            }}
          />
          {poolRemoveHook.expectedOutcome
            ? `${formatTokenAmount(
                Number(poolRemoveHook.expectedOutcome[0]),
                token.decimals,
                token.symbol
              )}`
            : "-"}
        </AmountDisplay>
        <AmountDisplay>
          <TokenIcon
            src={getTokenIconUrl(token2.tokenId)}
            alt={token2.symbol}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-token-icon.png";
            }}
          />
          {poolRemoveHook.expectedOutcome
            ? `${formatTokenAmount(
                Number(poolRemoveHook.expectedOutcome[1]),
                token2.decimals,
                token2.symbol
              )}`
            : "-"}
        </AmountDisplay>
      </div>

      <Button className="active" onClick={onRemoveLiquidity}>
        {!poolRemoveHook.isLoading ? (
          buttonLabel
        ) : (
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <CircularProgress color="inherit" size={20} />
            Remove liquidity in progress
          </div>
        )}
      </Button>
    </>
  );
};

export default PoolRemoveForm; 