import styled from "@emotion/styled";
import React, { FC, useState } from "react";
import { RootState } from "../../store/store";
import { useSelector } from "react-redux";
import { Box, IconButton } from "@mui/material";
import { KeyboardArrowUp, KeyboardArrowDown } from "@mui/icons-material";
import VersionDisplay from "../VersionDisplay";

const FooterRoot = styled.footer<{ isCollapsed: boolean }>`
  display: flex;
  width: 100%;
  height: ${props => props.isCollapsed ? '0px' : '58px'};
  min-width: 420px;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
  background: var(--Color-Brand-Primary, #41137e);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: height 0.3s ease-in-out;
  overflow: hidden;
`;

const ToggleButton = styled(IconButton)<{ isCollapsed: boolean }>`
  position: fixed;
  bottom: ${props => props.isCollapsed ? '0px' : '58px'};
  right: 20px;
  background: var(--Color-Brand-Primary, #41137e);
  color: white;
  border-radius: 50% 50% 0 0;
  width: 40px;
  height: 20px;
  min-width: 40px;
  transition: bottom 0.3s ease-in-out;
  z-index: 1001;
  
  &:hover {
    background: var(--Color-Brand-Primary, #41137e);
    opacity: 0.8;
  }
`;

const Footer: FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const toggleFooter = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Box>
      <ToggleButton
        onClick={toggleFooter}
        isCollapsed={isCollapsed}
        size="small"
      >
        {isCollapsed ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
      </ToggleButton>
      <FooterRoot isCollapsed={isCollapsed}>
        <Box sx={{ padding: "0 10px" }}>
          <VersionDisplay />
        </Box>
      </FooterRoot>
    </Box>
  );
};

export default Footer;
