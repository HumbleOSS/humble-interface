import * as React from "react";
import styled from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { ARC200TokenI } from "../../types";
import { getTokens } from "../../store/tokenSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { tokenSymbol } from "../../utils/dex";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";

const Wrapper = styled.div`
  width: 86%;
  @media screen and (min-width: 640px) {
    width: fit-content;
  }
`;

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

const StyledMenuItem = styled.div`
  display: flex;
  padding: 8px 12px;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  border-radius: var(--Radius-600, 13px);
  border: 1px solid var(--Color-Neutral-Stroke-Primary, #d8d8e1);
  background: var(--Color-Neutral-Background-Base, #fff);
  cursor: pointer;

  &:hover {
    background: var(--Color-Neutral-Background-Hover, #f5f5f7);
  }
`;

const MenuContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  width: 100%;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-radius: 16px;
  background: transparent;
  overflow: hidden;
`;

const IconButton = styled.div`
  display: flex;
  width: 32px;
  height: 32px;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: transparent;
`;

const ContentBody = styled.div`
  display: flex;
  align-items: flex-start;
  flex: 1 0 0;
  width: 100%;
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

const ModalBox = styled(Box)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 400px;
  background-color: ${(props) => (props.theme.isDarkTheme ? "#000" : "#fff")};
  border-radius: 13px;
  padding: 24px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeading = styled.h2`
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px 0;
`;

const TokenList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SearchInput = styled.input`
  width: 93%;
  padding: 12px;
  border: 1px solid ${(props) => (props.theme.isDarkTheme ? "#333" : "#d8d8e1")};
  border-radius: 10px;
  margin-bottom: 16px;
  background: transparent;
  color: ${(props) => (props.theme.isDarkTheme ? "#fff" : "#000")};
  font-family: "Plus Jakarta Sans";
  font-size: 14px;

  &::placeholder {
    color: ${(props) => (props.theme.isDarkTheme ? "#888" : "#666")};
  }

  &:focus {
    outline: none;
    border-color: var(--Color-Accent-Primary-Background-Default, #41137e);
  }
`;

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
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredTokens = React.useMemo(() => {
    return (options || tokens).filter((t) =>
      tokenSymbol(t).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, tokens, searchTerm]);

  return (
    <Wrapper>
      <TokenButton
        className={isDarkTheme ? "dark" : "light"}
        onClick={handleClick}
      >
        <TokenButtonGroup>
          <TokenButtonLabel className={isDarkTheme ? "dark" : "light"}>
            {tokenSymbol(token)}
          </TokenButtonLabel>
          <ArrowDownwardIcon />
        </TokenButtonGroup>
      </TokenButton>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="token-select-modal"
      >
        <ModalBox>
          <ModalHeading>Select Token</ModalHeading>
          <SearchInput
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <TokenList>
            {filteredTokens
              .map((t) => tokenSymbol(t))
              .map((option, i) => (
                <StyledMenuItem
                  key={option}
                  onClick={() => {
                    onSelect(filteredTokens[i]);
                    handleClose();
                  }}
                >
                  <MenuContent>
                    <IconContainer>
                      <IconButton>
                        <img
                          style={{
                            width: "32px",
                            height: "32px",
                          }}
                          src={`https://asset-verification.nautilus.sh/icons/${
                            filteredTokens[i]?.tokenId || 0
                          }.png`}
                          alt="Icon 401384"
                        />
                      </IconButton>
                    </IconContainer>
                    <ContentBody>
                      <ContentText>{option}</ContentText>
                    </ContentBody>
                  </MenuContent>
                </StyledMenuItem>
              ))}
          </TokenList>
        </ModalBox>
      </Modal>
    </Wrapper>
  );
};

export default TokenSelect;
