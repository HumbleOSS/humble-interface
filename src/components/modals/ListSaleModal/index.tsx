import React, { useState } from "react";
import {
  Modal,
  Button,
  TextField,
  CircularProgress,
  Stack,
  InputLabel,
  Box,
  Grid,
} from "@mui/material";
import PaymentCurrencyRadio from "../../PaymentCurrencyRadio";

interface ListSaleModalProps {
  open: boolean;
  loading: boolean;
  handleClose: () => void;
  onSave: (address: string, amount: string) => Promise<void>;
  title?: string;
  buttonText?: string;
  //image: string;
  //royalties: number;
  nft: any;
}

const ListSaleModal: React.FC<ListSaleModalProps> = ({
  open,
  loading,
  handleClose,
  onSave,
  //image,
  //royalties,
  nft,
  title = "Enter Address",
  buttonText = "Send",
}) => {
  /* Price */
  const [price, setPrice] = useState("");

  /* Payment currency */

  const [currency, setCurrency] = useState<string>("VOI");

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
  };

  /* Modal */

  const handleSave = async () => {
    await onSave(price, currency);
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="address-modal-title"
      aria-describedby="address-modal-description"
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          padding: "40px",
          minHeight: "300px",
          minWidth: "400px",
          width: "50vw",
          borderRadius: "25px",
        }}
      >
        <h2 id="address-modal-title">{title}</h2>
        {!loading ? (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <img
                  src={nft?.metadata?.image || ""}
                  alt="NFT"
                  style={{ width: "100%", borderRadius: "25px" }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    p: 1,
                  }}
                >
                  <InputLabel htmlFor="price">Price</InputLabel>
                  <TextField
                    id="price"
                    label="Price"
                    variant="outlined"
                    value={price}
                    fullWidth
                    margin="normal"
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <Box sx={{ mt: 2 }}>
                    <PaymentCurrencyRadio
                      selectedValue={currency}
                      onCurrencyChange={handleCurrencyChange}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid xs={12}>
                <Box
                  sx={{
                    p: 1,
                  }}
                >
                  <InputLabel htmlFor="royalties">You Recieve</InputLabel>
                  <TextField
                    id="proceeds"
                    label="Proceeds"
                    variant="outlined"
                    value={(
                      ((100 - ((nft?.royalties?.royaltyPercent || 0) + 2.5)) *
                        Number(price)) /
                      100
                    ).toLocaleString()}
                    fullWidth
                    margin="normal"
                    disabled
                  />
                </Box>
              </Grid>
            </Grid>
            <Stack sx={{ mt: 3 }} gap={2}>
              <Button
                size="large"
                fullWidth
                variant="contained"
                onClick={handleSave}
              >
                {buttonText}
              </Button>
              <Button
                size="large"
                fullWidth
                variant="outlined"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </Stack>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              padding: "20px",
            }}
          >
            <CircularProgress size={200} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ListSaleModal;
