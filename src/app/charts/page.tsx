"use client";

// ** MUI Imports
import Grid from "@mui/material/Grid";

// ** Styled Component
import DatePickerWrapper from "@/app/shared/styles/libs/react-datepicker/DatePickerWrapper";

import BasicChart from "./components/BasicChart";

// ** Third Party Styles Imports
import "react-datepicker/dist/react-datepicker.css";

const Charts = () => {
  return (
    <DatePickerWrapper>
        <Grid container spacing={6}>
        <Grid item xs={12} md={6}>
          <BasicChart />
        </Grid>
        <Grid item xs={12} md={6}>
          {/* <FormLayoutsIcons /> */}
        </Grid>
        <Grid item xs={12}>
          {/* <FormLayoutsSeparator /> */}
        </Grid>
        <Grid item xs={12}>
          {/* <FormLayoutsAlignment /> */}
        </Grid>
      </Grid>      
    </DatePickerWrapper>
  );
};

export default Charts;
