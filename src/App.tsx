import React, { useEffect, useMemo, useState } from "react";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import store, { RootState } from "./store/store";
import Navbar from "./components/Navbar";
import { routes } from "./routes";
import { getProviderInit } from "./wallets";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styled from "styled-components";
import Layout from "./layouts/Default";
import { getPools } from "./store/poolSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { getToken, getTokens } from "./store/tokenSlice";
import { getPoolBals } from "./store/poolBalsSlice";
import { getVolume } from "./store/volumeSlice";
import { Button, Paper, Stack, Typography } from "@mui/material";

import { WalletProvider } from "@txnlab/use-wallet-react";
import { NetworkId, WalletId, WalletManager } from "@txnlab/use-wallet";

const BackgroundLayer = styled.div`
  width: 100%;
  height: 100%;
  top: 0;
`;

const BackgroundLayer2 = styled(BackgroundLayer)`
  background: url(/static/pattern.svg);
  background-repeat: no-repeat;
  background-position-y: bottom;
  background-position-x: right;
  @media screen and (max-width: 640px) {
    background: url(/static/pattern_small.svg);
    background-repeat: no-repeat;
    background-position-y: bottom;
    background-position-x: right;
  }
  @media screen and (min-width: 640px) {
    /* transform: translateY(-200px); */
  }
`;

interface AppContainerProps {
  children: React.ReactNode;
}
const AppContainer: React.FC<AppContainerProps> = ({ children }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return (
    <div
      style={{
        color: isDarkTheme ? "#fff" : "#000",
        transition: "all 0.25s linear",
      
      }}
    >
      <BackgroundLayer
        className="background-layer"
        style={{
          background: isDarkTheme
            ? "linear-gradient(45deg, rgba(34,23,63,1) 35%, rgba(82,61,136,1) 100%)"
            : "#FFFFFF",
        }}
      ></BackgroundLayer>
      <BackgroundLayer2
        {...{ isDarkTheme }}
        className="background-layer"
      ></BackgroundLayer2>
      <div className="content-layer" style={{ width: "100%", height: "100%" }}>
        {children}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const walletManager = new WalletManager({
    wallets: [
      /*
      WalletId.DEFLY,
      WalletId.PERA,
      WalletId.EXODUS,
      */
      WalletId.KIBISIS,
      /*
      {
        id: WalletId.WALLETCONNECT,
        options: { projectId: '<YOUR_PROJECT_ID>' }
      },
      {
        id: WalletId.MAGIC,
        options: { apiKey: '<YOUR_API_KEY>' }
      },
      */
      {
        id: WalletId.LUTE,
        options: { siteName: "HumbPact" },
      },
    ],
    network: NetworkId.MAINNET,
    algod: {
      baseServer: "https://mainnet-api.voi.nodely.dev",
      port: "",
      token: "",
    },
  });

  return (
    <WalletProvider manager={walletManager}>
      <Provider store={store}>
        <AppContainer>
          <Router>
            <Layout>
              <Routes>
                {routes.map((el) => (
                  <Route path={el.path} Component={el.Component} />
                ))}
              </Routes>
            </Layout>
          </Router>
        </AppContainer>
      </Provider>
      <ToastContainer />
    </WalletProvider>
  );
};

export default App;
