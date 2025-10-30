import React, { useEffect, useMemo } from "react";
import useDefiRewards from "../../hooks/useDefiRewards";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Stack,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { TOKEN_WVOI1 } from "../../constants/tokens";
import { getPools } from "../../store/poolSlice";
import { getTokens } from "../../store/tokenSlice";
import type { UnknownAction } from "@reduxjs/toolkit";
import { tokenSymbol } from "../../utils/dex";

const BLOCK_REWARD_ADJUSTMENT = 17.05 / 2; // match PoolCard logic

export const Rewards: React.FC = () => {
  const rewards = useDefiRewards();
  const pools = useSelector((state: RootState) => state.pools.pools);
  const tokens = useSelector((state: RootState) => state.tokens.tokens);
  const dispatch = useDispatch();
  const isDarkTheme = useSelector(
    (state: RootState) => state.theme.isDarkTheme
  );
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  useEffect(() => {
    if (!pools || pools.length === 0) {
      dispatch(getPools() as unknown as UnknownAction);
    }
    if (!tokens || tokens.length === 0) {
      dispatch(getTokens() as unknown as UnknownAction);
    }
  }, []);

  const rows = useMemo(() => {
    const enriched = rewards.map((r) => {
      const pool = pools.find((p) => p.poolId === r.poolId);
      const tokAId = pool?.tokA;
      const tokBId = pool?.tokB;
      const tokA = tokens.find((t) => t.tokenId === tokAId);
      const tokB = tokens.find((t) => t.tokenId === tokBId);
      const symbolA =
        tokenSymbol(tokA as any, true) ||
        (tokAId !== undefined ? `${tokAId}` : "?");
      const symbolB =
        tokenSymbol(tokB as any, true) ||
        (tokBId !== undefined ? `${tokBId}` : "?");
      const blockReward = [tokAId, tokBId].map(Number).includes(TOKEN_WVOI1)
        ? BLOCK_REWARD_ADJUSTMENT
        : 0;
      const additional = r.additionalAprBoost || 0;
      const totalBoost = (r.aprBoost || 0) + blockReward + additional;
      return {
        ...r,
        tokAId,
        tokBId,
        symbolA,
        symbolB,
        blockReward,
        totalBoost,
      };
    });
    return enriched.sort((a, b) => (b.totalBoost || 0) - (a.totalBoost || 0));
  }, [rewards, pools, tokens]);

  const getIconUrl = (tokenId?: number) => {
    if (tokenId === undefined || tokenId === null)
      return "/default-token-icon.png";
    // VOI and wVOI use icon 0
    if (tokenId === 0 || tokenId === 390001)
      return "https://asset-verification.nautilus.sh/icons/0.png";
    return `https://asset-verification.nautilus.sh/icons/${tokenId}.png`;
  };

  return (
    <Box sx={{ px: { xs: 2, md: 6 }, py: { xs: 2, md: 4 } }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: 2,
          color: isDarkTheme ? "#FFFFFF" : "#0c0c10",
        }}
      >
        DeFi Incentives
      </Typography>
      {rows.length === 0 ? (
        <Typography
          variant="body1"
          sx={{ color: isDarkTheme ? "rgba(255,255,255,0.85)" : "#161717" }}
        >
          {!pools || pools.length === 0 || !tokens || tokens.length === 0
            ? "Loading pools and tokens..."
            : "No rewards available."}
        </Typography>
      ) : (
        <>
          {!isMobile && (
            <TableContainer
              component={Paper}
              sx={{ backgroundColor: isDarkTheme ? "#20093E" : "#FFFFFF" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ color: isDarkTheme ? "#FFFFFF" : "#161717" }}
                    >
                      Pair Name
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: isDarkTheme ? "#FFFFFF" : "#161717" }}
                    >
                      APR Boost (%)
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: isDarkTheme ? "#FFFFFF" : "#161717" }}
                    >
                      Total APR (%)
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: isDarkTheme ? "#FFFFFF" : "#161717" }}
                    >
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => {
                    const total = r.totalBoost || 0;
                    return (
                      <TableRow
                        key={r.poolId}
                        hover
                        sx={{
                          "& td": {
                            color: isDarkTheme ? "#FFFFFF" : "#161717",
                          },
                        }}
                      >
                        <TableCell component="th" scope="row">
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Box
                              sx={{
                                position: "relative",
                                width: 36,
                                height: 20,
                              }}
                            >
                              <img
                                src={getIconUrl(r.tokAId)}
                                alt={r.symbolA}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  position: "absolute",
                                  left: 0,
                                  top: 0,
                                }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    "https://asset-verification.nautilus.sh/icons/0.png";
                                }}
                              />
                              <img
                                src={getIconUrl(r.tokBId)}
                                alt={r.symbolB}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  position: "absolute",
                                  left: 12,
                                  top: 0,
                                  border: "2px solid white",
                                }}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    "https://asset-verification.nautilus.sh/icons/0.png";
                                }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{
                                color: isDarkTheme ? "#FFFFFF" : "#161717",
                              }}
                            >
                              {r.symbolA}/{r.symbolB}
                            </Typography>
                            <Typography
                              variant="caption"
                              color={
                                isDarkTheme
                                  ? "rgba(255,255,255,0.65)"
                                  : "text.secondary"
                              }
                            >
                              ({r.poolId})
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          {(r.aprBoost ?? 0).toFixed(2)}
                        </TableCell>
                        <TableCell align="right">{total.toFixed(2)}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              navigate(`/pool/add?poolId=${r.poolId}`)
                            }
                            sx={{
                              color: isDarkTheme ? "#FFFFFF" : "#161717",
                              borderColor: isDarkTheme
                                ? "rgba(255,255,255,0.35)"
                                : "#d1d5db",
                              "&:hover": {
                                borderColor: isDarkTheme
                                  ? "#FFBE1D"
                                  : "#9933FF",
                                color: isDarkTheme ? "#FFBE1D" : "#9933FF",
                              },
                              textTransform: "none",
                              minWidth: 64,
                            }}
                          >
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {isMobile && (
            <Stack spacing={1.5}>
              {rows.map((r) => {
                const total = r.totalBoost || 0;
                return (
                  <Card
                    key={r.poolId}
                    elevation={0}
                    sx={{
                      backgroundColor: isDarkTheme ? "#20093E" : "#FFFFFF",
                      borderRadius: 2,
                      border: isDarkTheme
                        ? "1px solid rgba(255,255,255,0.12)"
                        : "1px solid #e5e7eb",
                    }}
                  >
                    <CardContent sx={{ py: 1.5 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box
                            sx={{ position: "relative", width: 36, height: 20 }}
                          >
                            <img
                              src={getIconUrl(r.tokAId)}
                              alt={r.symbolA}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                position: "absolute",
                                left: 0,
                                top: 0,
                              }}
                            />
                            <img
                              src={getIconUrl(r.tokBId)}
                              alt={r.symbolB}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                position: "absolute",
                                left: 12,
                                top: 0,
                                border: "2px solid white",
                              }}
                            />
                          </Box>
                          <Stack>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                color: isDarkTheme ? "#FFFFFF" : "#161717",
                              }}
                            >
                              {r.symbolA}/{r.symbolB}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: isDarkTheme
                                  ? "rgba(255,255,255,0.65)"
                                  : "#6b7280",
                              }}
                            >
                              Pool {r.poolId}
                            </Typography>
                          </Stack>
                        </Stack>
                        <Stack spacing={0.5} alignItems="flex-end">
                          <Typography
                            variant="caption"
                            sx={{
                              color: isDarkTheme
                                ? "rgba(255,255,255,0.65)"
                                : "#6b7280",
                            }}
                          >
                            APR Boost
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: isDarkTheme ? "#FFFFFF" : "#161717" }}
                          >
                            {(r.aprBoost ?? 0).toFixed(2)}%
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              navigate(`/pool/add?poolId=${r.poolId}`)
                            }
                            sx={{
                              color: isDarkTheme ? "#FFFFFF" : "#161717",
                              borderColor: isDarkTheme
                                ? "rgba(255,255,255,0.35)"
                                : "#d1d5db",
                              "&:hover": {
                                borderColor: isDarkTheme
                                  ? "#FFBE1D"
                                  : "#9933FF",
                                color: isDarkTheme ? "#FFBE1D" : "#9933FF",
                              },
                              textTransform: "none",
                              mt: 0.5,
                            }}
                          >
                            Add
                          </Button>
                        </Stack>
                      </Stack>
                      <Divider
                        sx={{
                          my: 1,
                          borderColor: isDarkTheme
                            ? "rgba(255,255,255,0.12)"
                            : "#e5e7eb",
                        }}
                      />
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: isDarkTheme
                              ? "rgba(255,255,255,0.65)"
                              : "#6b7280",
                          }}
                        >
                          Total APR
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight={800}
                          sx={{ color: isDarkTheme ? "#FFBE1D" : "#9933FF" }}
                        >
                          {total.toFixed(2)}%
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 1.5,
              color: isDarkTheme ? "rgba(255,255,255,0.75)" : "#6b7280",
            }}
          >
            Note: Total APR includes block rewards for VOI pairs.
          </Typography>
        </>
      )}
    </Box>
  );
};
