import React from "react";
import { CircularProgress } from "@mui/material";

const LoadingSpinner: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "200px",
      }}
    >
      <CircularProgress />
    </div>
  );
};

export default LoadingSpinner; 