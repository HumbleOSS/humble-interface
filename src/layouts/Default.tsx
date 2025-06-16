import React from "react";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Container,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import styled from "styled-components";
import { RootState } from "../store/store";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  return (
    <>
      <Navbar />
      <Container
        maxWidth="lg"
        id="content-layer"
        sx={{
          mt: 5,
          mb: 5,
          pb: 8,
          px: isMobile ? 4 : 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
        }}
      >
        {children}
      </Container>
      <Footer />
    </>
  );
};

export default Layout;
