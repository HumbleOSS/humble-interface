import React from "react";
import Navbar from "../components/Navbar";
import { Container } from "@mui/material";
import GoToTop from "../components/GoToTop";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Navbar />
      <Container
        maxWidth="lg"
        id="content-layer"
        sx={{ mt: 5, mb: 20, display: "flex", justifyContent: "center" }}
      >
        {children}
      </Container>
    </>
  );
};

export default Layout;
