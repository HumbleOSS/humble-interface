import * as React from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { ARC200TokenI } from "../../types";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { tokenSymbol } from "../../utils/dex";
const Wrapper=styled.div`
  width:86%;
  @media screen and (min-width: 640px) {
    width: fit-content;
  } 
`
const TokenButton = styled.div`
  display: flex;
  padding: var(--Spacing-400, 8px) var(--Spacing-600, 12px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  width: 100%;
  
  border-radius: var(--Radius-600, 13px);
  &.light {
    background: var(--Color-Accent-Primary-Background-Default, #41137e);
  }
  &.dark {
    background: var(
      --Color-Accent-Primary-Background-Hover,
      rgba(255, 255, 255, 0.8)
    );
  }
`;

const TokenButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
  cursor: pointer;

`;

const TokenButtonLabel = styled.div`
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: 120%; /* 16.8px */
  min-width: 63px;
  text-align: center;
  &.light {
    color: var(--Color-Neutral-Element-Inverse, #fff);
  }
  &.dark {
    color: var(--Color-Neutral-Element-Inverse, #000);
  }
`;

const StyledMenuItem = styled(MenuItem)`
  display: flex;
  width: var(--select-token-width, 153px);
  padding: 8px 12px;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  border-radius: var(--Radius-600, 13px) var(--Radius-600, 13px) 0px 0px;
  border: 1px solid var(--Color-Neutral-Stroke-Primary, #d8d8e1);
  background: var(--Color-Neutral-Background-Base, #fff);
`;

const MenuContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: stretch;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: var(--Radius-400, 10px);
  background: var(--Color-Brand-Atomic, #ff6438);
`;

const IconButton = styled.div`
  display: flex;
  width: 32px;
  height: 32px;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  border-radius: var(--Radius-300, 8px);
  background: var(
    --Color-Neutral-Background-Transparent,
    rgba(255, 255, 255, 0)
  );
`;

const ContentBody = styled.div`
  display: flex;
  align-items: flex-start;
  flex: 1 0 0;
`;

const ContentText = styled.div`
  color: var(--Color-Neutral-Element-Primary, #0c0c10);
  font-feature-settings: "clig" off, "liga" off;
  font-family: "Plus Jakarta Sans";
  font-size: 16px;
  font-style: normal;
  font-weight: 700;
  line-height: 120%; /* 19.2px */
`;

const options = [
  "None",
  "Atria",
  "Callisto",
  "Dione",
  "Ganymede",
  "Hangouts Call",
  "Luna",
  "Oberon",
  "Phobos",
  "Pyxis",
  "Sedna",
  "Titania",
  "Triton",
  "Umbriel",
];

const ITEM_HEIGHT = 48;

const ArrowDownwardIcon = () => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M16 10L12 14L8 10"
        stroke={isDarkTheme ? "#000" : "#fff"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface LongMenuProps {
  onSelect: (token: ARC200TokenI) => void;
  options?: ARC200TokenI[];
  token?: ARC200TokenI;
}

const TokenSelect: React.FC<LongMenuProps> = ({ token, options, onSelect }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const dispatch = useDispatch();
  const tokens: ARC200TokenI[] = useSelector(
    (state: RootState) => state.tokens.tokens
  );
  const tokenStatus = useSelector((state: RootState) => state.tokens.status);
  React.useEffect(() => {
    dispatch(getTokens() as unknown as UnknownAction);
  }, [dispatch]);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  //const [selectedIndex, setSelectedIndex] = React.useState(0);
  return (
    <Wrapper>
      <TokenButton
        className={isDarkTheme ? "dark" : "light"}
        aria-label="more"
        id="long-button"
        aria-controls={open ? "long-menu" : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-haspopup="true"
        onClick={handleClick}
        style={{
          width:"100%"
        }}
      >
        <TokenButtonGroup>
          <TokenButtonLabel  className={isDarkTheme ? "dark" : "light"}>
            {tokenSymbol(token)}
          </TokenButtonLabel>
          <ArrowDownwardIcon />
        </TokenButtonGroup>
      </TokenButton>
      <Menu
        id="long-menu"
        MenuListProps={{
          "aria-labelledby": "long-button",
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            mt: 0,
          },
          style: {
            maxHeight: ITEM_HEIGHT * 4.5,
            //width: "20ch",
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "flex-start",
            borderRadius: "13px",
          },
        }}
      >
        {(options || tokens)
          .map((t) => tokenSymbol(t))
          .map((option, i) => (
            <StyledMenuItem
              key={option}
              selected={option === tokenSymbol(token)}
              onClick={(e: any) => {
                onSelect((options || tokens)[i]);
                handleClose();
              }}
            >
              <MenuContent>
                <IconContainer>
                  <IconButton>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 32 32"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.6187 7.38128C12.9604 7.72299 12.9604 8.27701 12.6187 8.61872L8.61872 12.6187C8.27701 12.9604 7.72299 12.9604 7.38128 12.6187C7.03957 12.277 7.03957 11.723 7.38128 11.3813L11.3813 7.38128C11.723 7.03957 12.277 7.03957 12.6187 7.38128ZM18.6187 7.38128C18.9604 7.72299 18.9604 8.27701 18.6187 8.61872L8.61872 18.6187C8.27701 18.9604 7.72299 18.9604 7.38128 18.6187C7.03957 18.277 7.03957 17.723 7.38128 17.3813L17.3813 7.38128C17.723 7.03957 18.277 7.03957 18.6187 7.38128ZM24.6187 7.38128C24.9604 7.72299 24.9604 8.27701 24.6187 8.61872L8.61872 24.6187C8.27701 24.9604 7.72299 24.9604 7.38128 24.6187C7.03957 24.277 7.03957 23.723 7.38128 23.3813L23.3813 7.38128C23.723 7.03957 24.277 7.03957 24.6187 7.38128ZM24.6187 13.3813C24.9604 13.723 24.9604 14.277 24.6187 14.6187L14.6187 24.6187C14.277 24.9604 13.723 24.9604 13.3813 24.6187C13.0396 24.277 13.0396 23.723 13.3813 23.3813L23.3813 13.3813C23.723 13.0396 24.277 13.0396 24.6187 13.3813ZM24.6187 19.3813C24.9604 19.723 24.9604 20.277 24.6187 20.6187L20.6187 24.6187C20.277 24.9604 19.723 24.9604 19.3813 24.6187C19.0396 24.277 19.0396 23.723 19.3813 23.3813L23.3813 19.3813C23.723 19.0396 24.277 19.0396 24.6187 19.3813Z"
                        fill="#0C0C10"
                      />
                    </svg>
                  </IconButton>
                </IconContainer>
                <ContentBody>
                  <ContentText>{option}</ContentText>
                </ContentBody>
              </MenuContent>
            </StyledMenuItem>
          ))}
      </Menu>
    </Wrapper>
  );
};

export default TokenSelect;
