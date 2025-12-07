import { Icon } from "@mui/material";
import React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { RootState } from "../../store/store";

const SearchRoot = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Spacing-400, 8px);
  flex: 1 0 0;
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0C0C10")};
`;

const InputContainer = styled.div<{ isDarkTheme: boolean }>`
  display: flex;
  padding: var(--Spacing-600, 12px) var(--Spacing-600, 12px);
  align-items: center;
  gap: var(--Spacing-400, 8px);
  align-self: stretch;
  border-radius: var(--Radius-300, 8px);
  border: 1px solid
    ${(props) =>
      props.isDarkTheme
        ? `rgba(255, 255, 255, 0.15)`
        : `rgba(41, 88, 255, 0.15)`};
  background: ${(props) =>
    props.isDarkTheme ? `rgba(255, 255, 255, 0.03)` : `rgba(41, 88, 255, 0.03)`};
  transition: border-color 0.2s ease, background-color 0.2s ease;

  &:focus-within {
    border-color: ${(props) =>
      props.isDarkTheme
        ? `rgba(255, 255, 255, 0.25)`
        : `rgba(41, 88, 255, 0.25)`};
    background: ${(props) =>
      props.isDarkTheme ? `rgba(255, 255, 255, 0.05)` : `rgba(41, 88, 255, 0.05)`};
  }
`;

const PlaceholderContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1 0 0;
`;

const Placeholder = styled.input<{ isDarkTheme: boolean }>`
  /* layout */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  flex: 1 0 0;
  /* type */
  overflow: hidden;
  /* color: var(--Color-Neutral-Element-Secondary, #f6f6f8); */
  color: ${(props) => (props.isDarkTheme ? "#fff" : "#0C0C10")};

  font-feature-settings: "clig" off, "liga" off;
  text-overflow: ellipsis;
  font-family: "Plus Jakarta Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  line-height: 120%; /* 16.8px */
`;

const SearchIcon = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.58341 17.4993C13.9557 17.4993 17.5001 13.9549 17.5001 9.58268C17.5001 5.21043 13.9557 1.66602 9.58341 1.66602C5.21116 1.66602 1.66675 5.21043 1.66675 9.58268C1.66675 13.9549 5.21116 17.4993 9.58341 17.4993Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.3334 18.3327L16.6667 16.666"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const StyledIcon = styled(SearchIcon)`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
`;

const IconContainer = styled.div`
  /* layout */
  display: flex;
  width: var(--Size-700, 20px);
  height: var(--Size-700, 20px);
  justify-content: center;
  align-items: center;
`;

interface SearchProps {
  onChange: (input: string) => void;
  placeholder?: string;
}

const Search: React.FC<SearchProps> = ({ onChange, placeholder = "Search by token ID, name, or Symbol" }) => {
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  return (
    <SearchRoot isDarkTheme={isDarkTheme}>
      <InputContainer isDarkTheme={isDarkTheme}>
        <IconContainer>
          <StyledIcon />
        </IconContainer>
        <PlaceholderContainer>
          <Placeholder
            placeholder={placeholder}
            isDarkTheme={isDarkTheme}
            onChange={(e) => {
              onChange(e.target.value);
            }}
          />
        </PlaceholderContainer>
      </InputContainer>
    </SearchRoot>
  );
};

export default Search;
