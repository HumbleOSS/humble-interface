import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Modal,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Autocomplete,
} from "@mui/material";
import BigNumber from "bignumber.js";

// Add interface for token data
interface TokenBalance {
  accountId: string;
  contractId: number;
  tokenId: string | null;
  balance: string;
  symbol: string;
  decimals: number | null;
  verified: number | null;
}

// Update Currency type
type Currency = {
  contractId: number;
  tokenId: string | null;
  balance: string;
  symbol: string;
  decimals: number | null;
  verified: number | null;
};

interface CurrencyInputPanelProps {
  value: string;
  onUserInput: (value: string) => void;
  onCurrencySelect: (currency: Currency) => void;
  currency: Currency | null;
  id: string;
}

const getTokenIconUrl = (contractId) => {
  return `https://asset-verification.nautilus.sh/icons/${contractId}.png`;
};

const CurrencyInputPanel: React.FC<CurrencyInputPanelProps> = ({
  value,
  onUserInput,
  onCurrencySelect,
  currency,
  id,
  onValidationChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpenModal = async () => {
    try {
      const response = await fetch(
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?accountId=G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ"
      );
      const data = await response.json();
      setTokens(
        data.balances
          .filter(
            (token) =>
              token.balance !== "0" && token.verified === 1 && !token.tokenId
          )
          .map((token) => ({
            ...token,
            balance: new BigNumber(token.balance)
              .dividedBy(10 ** token.decimals)
              .toFixed(token.decimals),
          }))
          .sort((a, b) => a.contractId - b.contractId)
      );
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
    }
  };

  const handleSelectToken = (token: TokenBalance) => {
    onCurrencySelect({
      contractId: token.contractId,
      balance: token.balance,
      symbol: token.symbol,
      decimals: token.decimals,
      verified: token.verified,
    });
    setIsModalOpen(false);
  };

  const getTokenIconUrl = (contractId: string) => {
    return `https://asset-verification.nautilus.sh/icons/${contractId}.png`;
  };

  const filteredTokens = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.contractId.toString().includes(searchQuery.toLowerCase())
  );

  const validateInput = (value: string): string => {
    if (!value) return "";

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      return "Please enter a valid number";
    }

    if (numValue <= 0) {
      return "Amount must be greater than 0";
    }

    if (currency && parseFloat(currency.balance) < numValue) {
      return `Insufficient balance. Maximum available: ${currency.balance}`;
    }

    return "";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const error = validateInput(newValue);

    setErrorMessage(error);
    onValidationChange?.(error === "", error);
    onUserInput(newValue);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          '& .MuiOutlinedInput-root': {
            paddingLeft: '120px',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            zIndex: 0,
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Button
            variant="text"
            onClick={handleOpenModal}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '56px',
              minWidth: '120px',
              zIndex: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '4px 0 0 4px',
              backgroundColor: 'background.paper',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              display: 'flex',
              gap: 1,
              alignItems: 'center',
            }}
          >
            {currency && currency.verified === 1 && (
              <Avatar
                src={getTokenIconUrl(currency.contractId.toString())}
                alt={currency.symbol}
                sx={{ width: 24, height: 24 }}
              />
            )}
            {currency ? currency.symbol : "Select Token"}
          </Button>
          <TextField
            fullWidth
            id={id}
            value={value}
            onChange={handleInputChange}
            type="number"
            error={!!errorMessage}
            helperText={errorMessage}
            InputProps={{
              inputProps: {
                style: {
                  textAlign: "right",
                  paddingRight: "10px",
                },
              },
              sx: {
                // Remove increment/decrement arrows
                "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                  {
                    "-webkit-appearance": "none",
                    margin: 0,
                  },
                "& input[type=number]": {
                  "-moz-appearance": "textfield",
                },
              },
            }}
          />
        </Box>
      </Box>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aria-labelledby="token-selection-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            maxHeight: "80vh",
            minHeight: "400px",
            overflow: "hidden",
            minWidth: 400,
          }}
        >
          <TextField
            label="Search Name or Paste Id"
            variant="outlined"
            fullWidth
            sx={{ mb: 2 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <List sx={{ maxHeight: "400px", overflow: "auto" }}>
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token) => (
                <ListItem
                  key={token.contractId}
                  button
                  onClick={() => handleSelectToken(token)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  {token.verified === 1 && (
                    <Avatar
                      src={getTokenIconUrl(token.contractId.toString())}
                      alt={token.symbol}
                      sx={{ width: 32, height: 32 }}
                    />
                  )}
                  <ListItemText
                    primary={token.symbol || `Token ${token.contractId}`}
                    secondary={`Balance: ${token.balance}`}
                  />
                </ListItem>
              ))
            ) : (
              <ListItem>
                <ListItemText primary="No tokens found" />
              </ListItem>
            )}
          </List>
        </Box>
      </Modal>
    </>
  );
};

export default CurrencyInputPanel;
