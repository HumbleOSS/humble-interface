import React, { useEffect, useMemo } from "react";
import Layout from "../../layouts/Default";
import {
  Box,
  CircularProgress,
  Container,
  Grid,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Section from "../../components/Section";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import axios from "axios";
import styled from "styled-components";
import { getSales } from "../../store/saleSlice";
import { UnknownAction } from "@reduxjs/toolkit";
import { ListingI } from "../../types";
import { getCollections } from "../../store/collectionSlice";
import NFTListingTable from "../../components/NFTListingTable";
//import { MarketplaceContext } from "../../store/MarketplaceContext";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";

const StatContainer = styled(Stack)`
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: var(--Main-System-24px, 24px);
  & .dark {
    color: #fff;
  }
  & .light {
    color: #000;
  }
`;

const BannerContainer = styled.div`
  display: flex;
  width: 100%;
  height: 200px;
  align-items: flex-end;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 16px;
  background-size: cover;
  padding-bottom: 50px;
`;

const BannerTitleContainer = styled.div`
  display: flex;
  width: 400px;
  height: 80px;
  padding: 28px;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--Main-System-8px, 8px);
  flex-shrink: 0;
  border-radius: var(--Main-System-16px, 16px);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(50px);
  margin-left: 40px;
`;

const BannerTitle = styled.h1`
  flex: 1 0 0;
  color: #fff;
  leading-trim: both;
  text-edge: cap;
  font-feature-settings: "clig" off, "liga" off;
  font-family: Nohemi;
  font-size: 40px;
  font-style: normal;
  font-weight: 700;
  line-height: 100%; /* 40px */
`;

const ExternalLinks = styled.ul`
  & li {
    margin-top: 10px;
  }
`;

const StyledLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const formatter = Intl.NumberFormat("en", { notation: "compact" });

export const Collection: React.FC = () => {
  const dispatch = useDispatch();
  /* Sales */
  const sales = useSelector((state: any) => state.sales.sales);
  const salesStatus = useSelector((state: any) => state.sales.status);
  useEffect(() => {
    dispatch(getSales() as unknown as UnknownAction);
  }, [dispatch]);
  /* Collections */
  const collections = useSelector(
    (state: any) => state.collections.collections
  );
  const collectionStatus = useSelector(
    (state: any) => state.collections.status
  );
  useEffect(() => {
    dispatch(getCollections() as unknown as UnknownAction);
  }, [dispatch]);
  /* Router */
  const { id } = useParams();
  const navigate = useNavigate();
  /* Theme */
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );

  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");

  /* NFT Navigator Listings */
  const [listings, setListings] = React.useState<any>(null);
  React.useEffect(() => {
    try {
      const res = axios
        .get("https://arc72-idx.nftnavigator.xyz/nft-indexer/v1/mp/listings", {
          params: {
            active: true,
            collectionId: id,
          },
        })
        .then(({ data }) => {
          setListings(data.listings);
        });
    } catch (e) {
      console.log(e);
    }
  }, []);

  /* NFT Navigator Collections */
  // const [collections, setCollections] = React.useState<any>(null);
  // React.useEffect(() => {
  //   try {
  //     (async () => {
  //       const {
  //         data: { collections: res },
  //       } = await axios.get(
  //         "https://arc72-idx.voirewards.com/nft-indexer/v1/collections",
  //         {
  //           params: {
  //             contractId: id,
  //           },
  //         }
  //       );
  //       const collections = [];
  //       for (const c of res) {
  //         const t = c.firstToken;
  //         if (!!t) {
  //           const tm = JSON.parse(t.metadata);
  //           collections.push({
  //             ...c,
  //             firstToken: {
  //               ...t,
  //               metadata: tm,
  //             },
  //           });
  //         }
  //       }
  //       setCollections(collections);
  //     })();
  //   } catch (e) {
  //     console.log(e);
  //   }
  // }, [listings]);

  /* NFT Navigator NFTs */
  const [nfts, setNfts] = React.useState<any>(null);
  React.useEffect(() => {
    try {
      (async () => {
        const {
          data: { tokens: res },
        } = await axios.get(
          `https://arc72-idx.voirewards.com/nft-indexer/v1/tokens`,
          {
            params: {
              contractId: id,
            },
          }
        );
        const nfts = [];
        for (const t of res) {
          const tm = JSON.parse(t.metadata);
          nfts.push({
            ...t,
            metadata: tm,
          });
        }
        setNfts(nfts);
      })();
    } catch (e) {
      console.log(e);
    }
  }, []);

  const listedNfts = useMemo(() => {
    const listedNfts =
      nfts
        ?.filter((nft: any) => {
          return listings?.some(
            (listing: any) =>
              `${listing.collectionId}` === `${nft.contractId}` &&
              `${listing.tokenId}` === `${nft.tokenId}`
          );
        })
        ?.map((nft: any) => {
          const listing = listings.find(
            (l: any) =>
              `${l.collectionId}` === `${nft.contractId}` &&
              `${l.tokenId}` === `${nft.tokenId}`
          );
          return {
            ...nft,
            listing,
          };
        }) || [];
    listedNfts.sort(
      (a: any, b: any) => b.listing.createTimestamp - a.listing.createTimestamp
    );
    return listedNfts;
  }, [nfts, listings]);

  const listedCollections = useMemo(() => {
    const listedCollections =
      collections
        ?.filter((c: any) => {
          return listedNfts?.some(
            (nft: any) => `${nft.contractId}` === `${c.contractId}`
          );
        })
        .map((c: any) => {
          return {
            ...c,
            tokens: listedNfts?.filter(
              (nft: any) => `${nft.contractId}` === `${c.contractId}`
            ),
          };
        }) || [];
    listedCollections.sort(
      (a: any, b: any) =>
        b.tokens[0].listing.createTimestamp -
        a.tokens[0].listing.createTimestamp
    );
    return listedCollections;
  }, [collections, listedNfts]);

  /*
  const [sales, setSales] = React.useState<any>(null);
  React.useEffect(() => {
    axios
      .get("https://arc72-idx.nftnavigator.xyz/nft-indexer/v1/mp/sales", {
        params: {
          collectionId: id,
        },
      })
      .then(({ data }) => {
        setSales(data.sales.reverse());
      });
  }, []);
  */

  const collectionSales = useMemo(() => {
    return (
      sales?.filter((sale: any) => `${sale.collectionId}` === `${id}`) || []
    );
  }, [sales]);

  console.log({ collectionSales });

  const floor = useMemo(() => {
    return listedNfts.length > 0
      ? listedNfts.reduce(
          (acc: any, nft: any) => {
            return acc.listing.price > nft.listing.price ? nft : acc;
          },
          { listing: { price: Number.MAX_SAFE_INTEGER } }
        )
      : { listing: { price: 0 } };
  }, [listedNfts]);

  const ceiling = useMemo(() => {
    return listedNfts.reduce(
      (acc: any, nft: any) => {
        return acc.listing.price < nft.listing.price ? nft : acc;
      },
      { listing: { price: 0 } }
    );
  }, [listedNfts]);

  const volume = useMemo(() => {
    return (
      collectionSales?.reduce((acc: any, sale: ListingI) => {
        return acc + sale.price;
      }, 0) || 0
    );
  }, [collectionSales]);

  const isLoading = useMemo(
    () =>
      salesStatus !== "succeeded" ||
      collectionStatus !== "succeeded" ||
      !collectionSales ||
      !collections ||
      !nfts ||
      !listings ||
      !listedNfts ||
      !listedCollections ||
      !sales ||
      !floor,
    [collections, nfts, listings, listedNfts, listedCollections, floor]
  );

  return (
    <Layout>
      {!isLoading ? (
        <Container sx={{ pt: 5 }} maxWidth="xl">
          <BannerContainer
            style={{
              backgroundImage: `url(${nfts[0].metadata.image})`,
              backgroundPosition: "center",
            }}
          >
            <BannerTitleContainer>
              <BannerTitle>
                {nfts[0].metadata.name.replace(/[0-9]*$/, "")}
              </BannerTitle>
            </BannerTitleContainer>
          </BannerContainer>
          <Grid container spacing={2}>
            <Grid
              item
              sx={{ display: { xs: "none", sm: "block" } }}
              xs={12}
              sm={3}
            >
              &nbsp;
            </Grid>
            <Grid item xs={12} sm={9}>
              <Stack sx={{ mt: 5 }} gap={2}>
                <StatContainer
                  sx={{
                    display: { xs: "none", md: "flex" },
                    flexDirection: { xs: "column", md: "row" },
                    overflow: "hidden",
                  }}
                >
                  {[
                    {
                      name: "Total NFTs",
                      displayValue: nfts.length,
                      value: nfts.length,
                    },
                    {
                      name: "Listed",
                      displayValue:
                        ((listedNfts.length / nfts.length) * 100).toFixed(2) +
                        "%",
                      value: listedNfts.length,
                    },
                    {
                      name: "Sales",
                      displayValue: collectionSales.length,
                      value: collectionSales.length,
                    },
                    {
                      name: "Volume",
                      displayValue: formatter.format(volume / 1e6) + " VOI",
                      value: volume,
                    },

                    {
                      name: "Floor Price",
                      displayValue:
                        formatter.format(floor.listing.price / 1e6) + " VOI",
                      value: floor.listing.price,
                    },
                    {
                      name: "Avg. Sale",
                      displayValue:
                        formatter.format(
                          volume / collectionSales.length / 1e6
                        ) + " VOI",
                      value:
                        volume > 0 && collectionSales.length > 0
                          ? volume / collectionSales.length
                          : 0,
                    },
                    {
                      name: "Ceiling Price",
                      displayValue:
                        formatter.format(ceiling.listing.price / 1e6) + " VOI",
                      value: ceiling.listing.price,
                    },
                  ].map((el, i) =>
                    el.value > 0 ? (
                      <Stack key={i}>
                        <Typography sx={{ color: "#717579" }} variant="h6">
                          {el.name}
                        </Typography>
                        <Typography
                          variant="h4"
                          className={isDarkTheme ? "dark" : "light"}
                        >
                          {el.displayValue}
                        </Typography>
                      </Stack>
                    ) : null
                  )}
                </StatContainer>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ justifyContent: "end" }}
                >
                  <ToggleButtonGroup
                    color="primary"
                    value={viewMode}
                    exclusive
                    onChange={() => {
                      setViewMode(viewMode === "list" ? "grid" : "list");
                    }}
                    aria-label="Platform"
                  >
                    <ToggleButton value="list">
                      <ViewListIcon />
                    </ToggleButton>
                    <ToggleButton value="grid">
                      <GridViewIcon />
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                {viewMode === "list" ? (
                  <NFTListingTable
                    listings={listings}
                    tokens={nfts}
                    collections={collections}
                  />
                ) : null}
                {viewMode === "grid" ? (
                  listedNfts.length > 0 ? (
                    <Grid container spacing={2}>
                      {listedNfts.map((el: any) => {
                        return (
                          <Grid item xs={6} sm={4}>
                            <img
                              style={{
                                width: "100%",
                                cursor: "pointer",
                                borderRadius: 10,
                              }}
                              src={el.metadata.image}
                              alt={el.metadata.name}
                              onClick={() =>
                                navigate(
                                  `/collection/${el.contractId}/token/${el.tokenId}`
                                )
                              }
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <Box sx={{ mt: 5 }}>
                      <Typography variant="body2">
                        No NFTs found in this collection
                      </Typography>
                    </Box>
                  )
                ) : null}
                {/*<div>
                  <Typography
                    sx={{ mt: 5, color: isDarkTheme ? "#fff" : "#000" }}
                    variant="h6"
                  >
                    External Links
                  </Typography>
                  <ExternalLinks
                    style={{
                      listStyle: "none",
                    }}
                  >
                    <li>
                      <StyledLink
                        target="_blank"
                        to={`https://nftnavigator.xyz/collection/${id}/`}
                        style={{ color: isDarkTheme ? "#fff" : "#000" }}
                      >
                        <img
                          src="https://nftnavigator.xyz/_app/immutable/assets/android-chrome-192x192.44ed2806.png"
                          style={{
                            height: "24px",
                            width: "24px",
                            borderRadius: "5px",
                          }}
                        />{" "}
                        NFT Navigator
                      </StyledLink>
                    </li>
                    <li>
                      <StyledLink
                        target="_blank"
                        to={`https://highforge.io/project/${id}`}
                        style={{ color: isDarkTheme ? "#fff" : "#000" }}
                      >
                        <img
                          src="https://highforge.io/apple-touch-icon.png"
                          style={{
                            height: "24px",
                            width: "24px",
                            borderRadius: "5px",
                          }}
                        />{" "}
                        High Forge
                      </StyledLink>
                    </li>
                  </ExternalLinks>
                        </div>*/}
              </Stack>
            </Grid>
          </Grid>
        </Container>
      ) : (
        <Container maxWidth="lg">
          <Stack sx={{ mt: 5 }} gap={2}>
            <Skeleton variant="text" width={280} height={50} />
            <Grid container spacing={2}>
              {[1, 2, 3, 4, 5, 6].map((el) => (
                <Grid item xs={6} sm={4} md={3} lg={2}>
                  <Skeleton variant="rectangular" width="100%" height={200} />
                </Grid>
              ))}
            </Grid>
            <Skeleton variant="text" width={280} height={50} />
            <Skeleton variant="text" width={180} height={50} />
            <Skeleton variant="text" width={180} height={50} />
          </Stack>
        </Container>
      )}
    </Layout>
  );
};
