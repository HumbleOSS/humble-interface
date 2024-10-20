import { createSlice } from "@reduxjs/toolkit";

export interface ThemeState {
  isDarkTheme: boolean;
}

const initialState: ThemeState = {
  isDarkTheme: window.localStorage.getItem("theme")
    ? window.localStorage.getItem("theme") === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)")?.matches || true,
};
const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      console.log("Toggling theme");
      window.localStorage.setItem(
        "theme",
        !state.isDarkTheme ? "dark" : "light"
      );
      state.isDarkTheme = !state.isDarkTheme;
    },
  },
});

export const { toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
