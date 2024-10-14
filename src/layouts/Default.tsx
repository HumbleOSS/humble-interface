import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { Container } from "@mui/material";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // const [navHeight, setNavHeight] = useState(0);
  // useEffect(() => {
  //   const elem = document.getElementsByTagName("nav")?.[0];
  //   const height = elem?.clientHeight;
  //   if (height) {
  //     setNavHeight(height);
  //   }
  // }, []);
  return (
    <>
      <Navbar />
      <Container
        maxWidth="lg"
        id="content-layer"
        sx={{
          mt: 5,
          mb: 20,
          display: "flex",
          justifyContent: "center",
          border: "none",
        }}
      >
        {children}
      </Container>
    </>
  );
};

export default Layout;
