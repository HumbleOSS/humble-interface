import * as React from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import axios from "axios";
import NFTSalesTable from "../NFTSalesTable";
import moment from "moment";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

interface NFTTabsProps {
  nft: any;
  loading: boolean;
}

const NFTTabs: React.FC<NFTTabsProps> = ({ nft, loading }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  /* Tabs */
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const [sales, setSales] = React.useState<any>(null);
  React.useEffect(() => {
    axios
      .get("https://mainnet-idx.nftnavigator.xyz/nft-indexer/v1/mp/sales", {
        params: {
          collectionId: nft.contractId,
          tokenId: nft.tokenId,
        },
      })
      .then(({ data }) => {
        setSales(data.sales.reverse());
      });
  }, [nft]);

  return !loading ? (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          sx={{
            color: "717579",
            "& .MuiTabs-root": {},
            "& .MuiTabs-indicator": {
              color: "#93F",
              backgroundColor: "#93F",
            },
            "& .Mui-selected": {
              color: "#93F",
              textAlign: "center",
              leadingTrim: "both",
              textEdge: "cap",
              fontFamily: "Nohemi",
              //fontSize: "24px",
              fontStyle: "normal",
              fontWeight: "700",
              lineHeight: "20px",
            },
          }}
          textColor="inherit"
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab
            sx={{
              color: "717579",
            }}
            label="History"
            {...a11yProps(0)}
          />
          {/*<Tab label="Information" {...a11yProps(1)} />
          <Tab label="Attributes" {...a11yProps(2)} />*/}
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        {sales && sales.length > 0 ? (
          <NFTSalesTable
            sales={
              sales?.map((sale: any) => ({
                event: "Sale",
                price: `${(sale.price / 1e6).toLocaleString()} ${
                  String(sale.currency) === "0" ? "VOI" : "VIA"
                }`,
                seller: ((addr) => `${addr.slice(0, 4)}...${addr.slice(-4)}`)(
                  sale.seller
                ),
                buyer: ((addr) => `${addr.slice(0, 4)}...${addr.slice(-4)}`)(
                  sale.buyer
                ),
                date: moment.unix(sale.timestamp).format("LLL"),
              })) || []
            }
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: isDarkTheme ? "#fff" : "#000",
              textAlign: "left",
              paddingTop: "20px",
            }}
          >
            No sales found
          </Typography>
        )}
      </CustomTabPanel>
      {/*<CustomTabPanel value={value} index={1}>
        Information
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        Attributes
        </CustomTabPanel>*/}
    </Box>
  ) : null;
};

export default NFTTabs;
