import React from "react";
interface TokenLogoProps {
  width?: number;
  height?: number;
}

const TokenLogo: React.FC<TokenLogoProps> = ({ width = 32, height = 32 }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.1454 20.8873C20.1454 25.8472 16.1308 29.8617 11.1708 29.8617C6.21084 29.8617 2.19629 25.8472 2.19629 20.8873C2.19629 15.9273 6.21084 11.9127 11.1708 11.9127C11.4036 11.9127 11.6217 11.9273 11.869 11.9418C16.2763 12.2764 19.7963 15.7963 20.1308 20.2036C20.1308 20.4218 20.1454 20.64 20.1454 20.8873Z"
        stroke="currentColor"
        strokeWidth="3"
        stroke-miterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M29.8182 11.2C29.8182 16.16 25.8037 20.1745 20.8437 20.1745H20.131C19.7964 15.7673 16.2764 12.2473 11.8691 11.9127V11.2C11.8691 6.24004 15.8837 2.22556 20.8437 2.22556C25.8037 2.22556 29.8182 6.24004 29.8182 11.2Z"
        fill="currentColor"
        strokeWidth="3"
        stroke-miterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default TokenLogo;
