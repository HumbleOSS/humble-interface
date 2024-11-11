import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import {
  Container,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import styled from "styled-components";
import { RootState } from "../store/store"; // Make sure this path is correct

// ... (keep all existing styled components)

const NotificationBox = styled(Box)<{
  $isMobile: boolean;
  $isDarkTheme: boolean;
}>`
  display: flex;
  padding: ${(props) => (props.$isMobile ? "16px" : "16px 16px")};
  justify-content: space-between;
  align-items: ${(props) => (props.$isMobile ? "flex-start" : "center")};
  gap: ${(props) => (props.$isMobile ? "16px" : "24px")};
  border-radius: 24px;
  border: 1px solid
    ${(props) => (props.$isDarkTheme ? "rgba(255, 255, 255, 0.1)" : "#d8d8e1")};
  background-color: ${(props) =>
    props.$isDarkTheme ? "rgba(12, 12, 16, 0.7)" : "rgba(255, 255, 255, 0.7)"};
  backdrop-filter: blur(25px);
  flex-direction: ${(props) => (props.$isMobile ? "column" : "row")};
  width: 100%;
  max-width: 630px;
`;

const NotificationLogos = styled(Box)<{ $isMobile: boolean }>`
  flex-shrink: 0;
  margin-right: ${(props) => (props.$isMobile ? "0" : "16px")};
`;

const NotificationBody = styled(Box)<{ $isMobile: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-grow: 1;
  min-width: 0;
  width: ${(props) => (props.$isMobile ? "100%" : "auto")};
`;

const NotificationTitle = styled(Typography)<{
  $isDarkTheme: boolean;
  $isMobile: boolean;
}>`
  width: 100%;
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#0C0C10")};
  font-feature-settings: "liga" off, "clig" off;
  font-family: "Plus Jakarta Sans";
  font-size: ${(props) => (props.$isMobile ? "14px" : "16px")};
  font-style: normal;
  font-weight: 500;
  line-height: 120%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
`;

const NotificationLinkLabel = styled(Typography)<{
  $isDarkTheme: boolean;
  $isMobile: boolean;
}>`
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#56566E")};
  font-feature-settings: "liga" off, "clig" off;
  font-family: "IBM Plex Sans Condensed";
  font-size: ${(props) => (props.$isMobile ? "12px" : "14px")};
  font-style: normal;
  font-weight: 300;
  line-height: 120%;
  margin-bottom: 4px;
`;

const NotificationLink = styled.a<{
  $isDarkTheme: boolean;
  $isMobile: boolean;
}>`
  width: 100%;
  display: block;
  overflow: hidden;
  color: ${(props) => (props.$isDarkTheme ? "#fff" : "#56566E")};
  font-feature-settings: "liga" off, "clig" off;
  text-overflow: ellipsis;
  font-family: "IBM Plex Sans Condensed";
  font-size: ${(props) => (props.$isMobile ? "12px" : "14px")};
  font-style: normal;
  font-weight: 300;
  line-height: 120%;
  text-decoration-line: underline;
  white-space: nowrap;
`;

interface LayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: number;
  title: string;
  link: string;
  date: string;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  // Simulating notifications for demonstration purposes
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications([
        {
          id: 1,
          title: "Voi DeFi Boost Program Goes Live on October 28th, 2024!",
          link: "https://medium.com/humbledefi/voi-defi-boost-program-goes-live-on-october-28th-2024-7d8b4c99c20a",
          date: "October 26th, 2024",
        },
      ]);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Navbar />
      <Container
        maxWidth="lg"
        id="content-layer"
        sx={{
          mt: 5,
          px: isMobile ? 4 : 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "none",
        }}
      >
        {notifications.length > 0 && (
          <>
            {notifications.map((notification) => (
              <NotificationBox
                key={notification.id}
                $isMobile={isMobile}
                $isDarkTheme={isDarkTheme}
              >
                <NotificationBody $isMobile={isMobile}>
                  <NotificationTitle
                    $isDarkTheme={isDarkTheme}
                    $isMobile={isMobile}
                  >
                    {notification.title}
                  </NotificationTitle>
                  <NotificationLinkLabel
                    $isDarkTheme={isDarkTheme}
                    $isMobile={isMobile}
                  >
                    Learn more here:
                  </NotificationLinkLabel>
                  <NotificationLink
                    target="_blank"
                    rel="noreferrer"
                    href={notification.link}
                    $isDarkTheme={isDarkTheme}
                    $isMobile={isMobile}
                  >
                    {notification.link}
                  </NotificationLink>
                </NotificationBody>
              </NotificationBox>
            ))}
          </>
        )}
      </Container>
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
