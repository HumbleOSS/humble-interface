import React from "react";
import styled from "styled-components";
import { Avatar } from "@mui/material";
import { stringToColorCode } from "../../utils/string";

const NFTCardWrapper = styled.div`
  align-items: center;
  background: linear-gradient(
    180deg,
    rgb(245, 211, 19) 0%,
    rgb(55, 19, 18) 100%
  );
  background-color: rgba(255, 255, 255, 1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  height: 481px;
  position: relative;
  transition: all 0.1s ease;
  width: 305px;
  overflow: hidden;
  cursor: pointer;
  &:hover {
    transform: scale(1.05);
  }
  & .image {
    align-self: stretch;
    height: 305px;
    position: relative;
    width: 100%;
  }

  & .NFT-info {
    -webkit-backdrop-filter: blur(200px) brightness(100%);
    align-items: flex-start;
    align-self: stretch;
    backdrop-filter: blur(200px) brightness(100%);
    background-color: #20202066;
    border-radius: 0px 0px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 176px;
    padding: 20px 30px 25px;
    position: relative;
    width: 100%;
  }

  & .frame {
    align-items: center;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    gap: 25px;
    position: relative;
    width: 100%;
  }

  & .artist-avatar-name-wrapper {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 10px;
    justify-content: space-around;
    position: relative;
  }

  & .artist-avatar-name {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 10px;
    position: relative;
  }

  & .avatar-instance {
    background-image: url(./avatar.svg) !important;
    height: 24px !important;
    position: relative !important;
    width: 24px !important;
  }

  & .text-wrapper {
    color: white;
    flex: 1;
    position: relative;
    font-family: Inter;
    font-size: 16px;
    font-weight: 500;
    line-height: 22px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .highest-bid {
    align-items: center;
    display: flex;
    flex: 1;
    flex-grow: 1;
    gap: 16px;
    justify-content: flex-end;
    position: relative;
  }

  & .div {
    align-items: center;
    background-color: #ffffff33;
    border-radius: 100px;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 10px;
    justify-content: flex-end;
    padding: 6px;
    position: relative;
  }

  & .icon-instance-node {
    height: 24px !important;
    position: relative !important;
    width: 24px !important;
  }

  & .artst-info {
    align-items: flex-start;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 5px;
    position: relative;
    width: 100%;
  }

  & .text-wrapper-2 {
    align-self: stretch;
    color: white;
    line-height: 24px;
    margin-top: -1px;
    position: relative;
    font-family: Inter, Helvetica;
    font-size: 20px;
    font-weight: 800;
    line-height: 24px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .additional-info {
    align-items: flex-end;
    align-self: stretch;
    display: flex;
    flex: 0 0 auto;
    justify-content: flex-end;
    position: relative;
    width: 100%;
  }

  & .price {
    align-items: flex-start;
    display: flex;
    flex: 1;
    flex-direction: column;
    flex-grow: 1;
    gap: 8px;
    padding: 0px 21px 0px 0px;
    position: relative;
  }

  & .text-wrapper-3 {
    align-self: stretch;
    color: #ffffff;
    font-family: Inter, Helvetica;
    margin-top: -1px;
    position: relative;
    font-family: Inter;
    font-size: 14px;
    font-weight: 400;
    line-height: 15px;
    letter-spacing: 0em;
    text-align: left;
  }

  & .text-wrapper-4 {
    align-self: stretch;
    color: white;
    position: relative;
    font-family: monospace;
    font-size: 16px;
    font-weight: 700;
    line-height: 22px;
    letter-spacing: 0em;
    text-align: left;
  }
`;

interface NFTCardProps {
  nftName: string;
  image: string;
  owner: string;
  price: string;
  onClick: any;
}

const NftCard: React.FC<NFTCardProps> = ({
  nftName,
  image,
  owner,
  price,
  onClick,
}) => {
  return (
    <NFTCardWrapper onClick={onClick}>
      <img className="image" alt="Image" src={image} />
      <div className="NFT-info">
        <div className="frame">
          <div className="artist-avatar-name-wrapper">
            <div className="artist-avatar-name">
              <Avatar
                sx={{
                  height: "24px",
                  width: "24px",
                  background: stringToColorCode(owner),
                }}
              >
                {owner.slice(0, 1)}
              </Avatar>
              <div className="text-wrapper">{owner.slice(0, 4)}</div>
            </div>
          </div>
        </div>
        <div className="artst-info">
          <div className="text-wrapper-2">{nftName}</div>
        </div>
        <div className="additional-info">
          <div className="price">
            <div className="text-wrapper-3">Price</div>
            <div className="text-wrapper-4">{price}</div>
          </div>
        </div>
      </div>
    </NFTCardWrapper>
  );
};

export default NftCard;
