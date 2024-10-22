import * as React from "react";
import { createTheme, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import moment from "moment";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

interface DarkCalendarProps {
  minDate?: string;
  onChange?: any;
}

const DarkCalendar: React.FC<DarkCalendarProps> = ({ minDate, onChange }) => {
  return (
    <ThemeProvider theme={darkTheme}>
      <LocalizationProvider dateAdapter={AdapterMoment}>
        <DateCalendar
          minDate={minDate ? moment(minDate) : moment()}
          onChange={onChange}
        />
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default DarkCalendar;
