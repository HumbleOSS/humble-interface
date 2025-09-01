import React from "react";
import styled from "@emotion/styled";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

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

interface PoolRemoveDialogProps {
  open: boolean;
  onClose: () => void;
  txnResult?: {
    tokAAmount: number;
    tokBAmount: number;
    tokASymbol: string;
    tokBSymbol: string;
  };
  isDarkTheme: boolean;
}

const PoolRemoveDialog: React.FC<PoolRemoveDialogProps> = ({
  open,
  onClose,
  txnResult,
  isDarkTheme,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          backgroundColor: isDarkTheme ? "#070709" : "#fff",
          color: isDarkTheme ? "#fff" : "#0c0c10",
          border: isDarkTheme ? "1px solid #41137e" : "1px solid #7e7e9a",
          borderRadius: "24px",
          padding: "16px",
        },
      }}
      BackdropProps={{
        style: {
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(8px)",
        },
      }}
    >
      <DialogTitle>Liquidity Removed Successfully</DialogTitle>
      <DialogContent>
        <div style={{ marginBottom: "16px" }}>
          You have received:
          <div style={{ marginTop: "8px" }}>
            {txnResult?.tokAAmount.toFixed(6)} {txnResult?.tokASymbol}
          </div>
          <div style={{ marginTop: "8px" }}>
            {txnResult?.tokBAmount.toFixed(6)} {txnResult?.tokBSymbol}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <PercentageButton
          onClick={onClose}
          style={{
            minWidth: "100px",
            background: "var(--Color-Accent-CTA-Background-Default, #2958ff)",
            color: "#fff",
            border: "none",
          }}
        >
          Close
        </PercentageButton>
      </DialogActions>
    </Dialog>
  );
};

export default PoolRemoveDialog; 