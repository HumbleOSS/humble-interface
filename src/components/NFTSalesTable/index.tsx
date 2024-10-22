import React from "react";
import { styled } from "@mui/system";
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

interface Sale {
  event: string;
  price: number;
  seller: string;
  buyer: string;
  date: string;
}

interface Props {
  sales: Sale[];
}

const StyledTableRow = styled(TableRow)(({ theme }) => {
  return {
    // "&:nth-of-type(odd)": {
    //   backgroundColor: theme.palette.mode === "light" ? "#f5f5f5" : "#303030",
    // },
  };
});

const StyledTableCell = styled(TableCell)(({ theme }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return {
    borderBottom: "none",
    padding: theme.spacing(1), // Add padding to maintain the space between cells
    color: isDarkTheme ? "#fff" : "#000",
  };
});

const StyleTableHeading = styled(StyledTableCell)(({ theme }) => {
  return {
    fontWeight: "bold",
  };
});

const SalesTable: React.FC<Props> = ({ sales }) => {
  return (
    <TableContainer>
      <Table sx={{ minWidth: 650 }} aria-label="sales table">
        <TableHead>
          <TableRow>
            <StyleTableHeading>Event</StyleTableHeading>
            <StyleTableHeading align="right">Price</StyleTableHeading>
            <StyleTableHeading align="right">Seller</StyleTableHeading>
            <StyleTableHeading align="right">Buyer</StyleTableHeading>
            <StyleTableHeading align="right">Date</StyleTableHeading>
          </TableRow>
        </TableHead>
        <TableBody>
          {sales.map((sale, index) => (
            <StyledTableRow hover={true} key={index}>
              <StyledTableCell>{sale.event}</StyledTableCell>
              <StyledTableCell align="right">{sale.price}</StyledTableCell>
              <StyledTableCell align="right">{sale.seller}</StyledTableCell>
              <StyledTableCell align="right">{sale.buyer}</StyledTableCell>
              <StyledTableCell align="right">{sale.date}</StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SalesTable;
