"use client";

// ** MUI Imports
import Grid from "@mui/material/Grid";

// ** Styled Component
import DatePickerWrapper from "@/app/shared/styles/libs/react-datepicker/DatePickerWrapper";

// ** Demo Components Imports
import FormLayoutsBasic from "./components/FormLayoutsBasic";
import FormLayoutsIcons from "./components/FormLayoutsIcons";
import FormLayoutsSeparator from "./components/FormLayoutsSeparator";
import FormLayoutsAlignment from "./components/FormLayoutsAlignment";

// ** Third Party Styles Imports
import "react-datepicker/dist/react-datepicker.css";

const FormLayouts = () => {
  return (
    <DatePickerWrapper>
      <Grid container spacing={6}>
        <Grid item xs={12} md={6}>
          <FormLayoutsBasic />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormLayoutsIcons />
        </Grid>
        <Grid item xs={12}>
          <FormLayoutsSeparator />
        </Grid>
        <Grid item xs={12}>
          <FormLayoutsAlignment />
        </Grid>
      </Grid>
    </DatePickerWrapper>
  );
};

export default FormLayouts;
