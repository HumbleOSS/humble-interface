import React, { useMemo } from "react";
import { styled as mstyled } from "@mui/system";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import styled from "styled-components";
import { Box } from "@mui/material";
import { CollectionI, RankingI, Sale, SaleI, Token } from "../../types";
import { compactAddress } from "../../utils/mp";
import moment from "moment";
import { Link } from "react-router-dom";

const StyledImage = styled(Box)`
  width: 53px;
  height: 53px;
  flex-shrink: 0;
  border-radius: 8px;
  background-size: cover;
`;

const StyledTableCell = mstyled(TableCell)(({ theme }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return {
    borderBottom: "none",
    padding: theme.spacing(1),
    color: isDarkTheme ? "#fff" : "#000",
    alignItems: "center",
    textAlign: "center",
    "& a": {
      textDecoration: "none",
      color: "inherit",
    },
  };
});

const StyledTableHeading = mstyled(StyledTableCell)(({ theme }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return {
    color: isDarkTheme ? "#fff" : "#000",
    textAlign: "center",
    fontFamily: "Nohemi",
    fontSize: "20px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "24px",
  };
});

const StyledTableRow = mstyled(TableRow)(({ theme }) => {
  return {
    borderBottom: "1px solid #3B3B3B",
  };
});

interface Props {
  sales: Sale[];
  tokens: Token[];
  collections: CollectionI[];
  limit?: number;
}

// transactionId: string;
// mpContractId: number;
// mpListingId: number;
// tokenId: number;
// seller: string;
// buyer: string;
// currency: number;
// price: number;
// round: number;
// timestamp: number;
// collectionId: number;

const NFTCollectionTable: React.FC<Props> = ({
  sales,
  tokens,
  collections,
  limit = 0,
}) => {
  const sortedSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(
        (sale: SaleI) =>
          sale.buyer !== sale.seller &&
          sale.price > 1e6 &&
          !(
            (sale.seller ===
              "GFFT7TUFCGDN4I6VUWVQKDB5JOI733U3JLP2YOVERQWMWL5IEZVU2D7U5A" &&
              sale.buyer ===
                "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ") ||
            (sale.seller ===
              "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ" &&
              sale.buyer ===
                "GFFT7TUFCGDN4I6VUWVQKDB5JOI733U3JLP2YOVERQWMWL5IEZVU2D7U5A")
          )
      )
      .slice(0, limit > 0 ? limit : sales.length);
  }, [sales]);
  return (
    <TableContainer>
      <Table aria-label="rankings table">
        <TableHead>
          <StyledTableRow hover={true}>
            <StyledTableCell
              sx={{ display: { xs: "none", md: "table-cell" } }}
            ></StyledTableCell>
            <StyledTableCell></StyledTableCell>
            <StyledTableHeading>Token</StyledTableHeading>
            <StyledTableHeading>Seller</StyledTableHeading>
            <StyledTableHeading>Buyer</StyledTableHeading>
            <StyledTableHeading>Price</StyledTableHeading>
          </StyledTableRow>
        </TableHead>
        <TableBody>
          {sortedSales.map((sale, index) => {
            const token =
              tokens.find(
                (token) =>
                  token.tokenId === sale.tokenId &&
                  token.contractId === sale.collectionId
              ) || ({} as Token);
            const collection =
              collections.find(
                (collection) => collection.contractId === sale.collectionId
              ) || ({} as CollectionI);
            return (
              <StyledTableRow hover={true} key={index}>
                <StyledTableCell
                  sx={{ display: { xs: "none", md: "table-cell" } }}
                >
                  {moment.unix(sale.timestamp).fromNow()}
                </StyledTableCell>
                <StyledTableCell>
                  <Link
                    to={`/collection/${collection.contractId}/token/${token.tokenId}`}
                  >
                    <StyledImage
                      sx={{
                        backgroundImage: `url(${token?.metadata?.image || ""})`,
                      }}
                    />
                  </Link>
                </StyledTableCell>
                <StyledTableCell>
                  <Link
                    to={`/collection/${collection.contractId}/token/${token.tokenId}`}
                  >
                    {token?.metadata?.name || ""}
                  </Link>
                </StyledTableCell>
                <StyledTableCell>
                  <Link to={`/account/${sale.seller}`}>
                    {compactAddress(sale.seller)}
                  </Link>
                </StyledTableCell>
                <StyledTableCell>
                  <Link to={`/account/${sale.buyer}`}>
                    {compactAddress(sale.buyer)}
                  </Link>
                </StyledTableCell>
                <StyledTableCell>
                  {(sale.price / 1e6).toLocaleString()}{" "}
                  {sale.currency === 0 ? "VOI" : "VIA"}
                </StyledTableCell>
              </StyledTableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default NFTCollectionTable;
