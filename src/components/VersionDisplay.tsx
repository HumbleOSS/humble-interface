import React from "react";
import { Box, Typography } from "@mui/material";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { APP_VERSION } from "../constants/version";

const VersionContainer = styled(Box)<{ $isDarkTheme: boolean }>`
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 12px;
  background: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"};
  border: 1px solid
    ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.2)"};
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    background: ${(props) =>
      props.$isDarkTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)"};
  }
`;

const VersionText = styled(Typography)<{ $isDarkTheme: boolean }>`
  color: ${(props) =>
    props.$isDarkTheme ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.8)"};
  font-family: "IBM Plex Sans Condensed";
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  user-select: none;
`;

const VersionDisplay: React.FC = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  return (
    <VersionContainer $isDarkTheme={isDarkTheme}>
      <VersionText $isDarkTheme={isDarkTheme}>build {APP_VERSION}</VersionText>
    </VersionContainer>
  );
};

export default VersionDisplay;
