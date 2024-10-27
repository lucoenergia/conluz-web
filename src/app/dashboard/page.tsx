"use client";

// ** MUI Imports
import Grid from "@mui/material/Grid";

// ** Icons Imports
import Poll from "mdi-material-ui/Poll";
import CurrencyUsd from "mdi-material-ui/CurrencyUsd";
import HelpCircleOutline from "mdi-material-ui/HelpCircleOutline";
import BriefcaseVariantOutline from "mdi-material-ui/BriefcaseVariantOutline";

// ** Custom Components Imports
import CardStatisticsVerticalComponent from "@/app/shared/components/card-statistics/CardStatsVertical";

// ** Styled Component Import
import ApexChartWrapper from "@/app/shared/styles/libs/react-apexcharts/ApexChartWrapper";

// ** Demo Components Imports
import Table from "./components/Table";
// import Trophy from "./components/Trophy";
import EnergyPricesSummary from "./components/EnergyPricesSummary";
import TotalEarning from "./components/TotalEarning";
import StatisticsCard from "./components/StatisticsCard";
import WeeklyOverview from "./components/WeeklyOverview";
import DepositWithdraw from "./components/DepositWithdraw";
import SalesByCountries from "./components/SalesByCountries";

const Dashboard = () => {
  return (
    <ApexChartWrapper>
      <Grid container spacing={6}>
        <Grid item xs={12} md={6}>
          <EnergyPricesSummary />
        </Grid>
        <Grid item xs={12} md={6}>
          <StatisticsCard />
        </Grid>
        {/* <Grid item xs={12} md={6} lg={4}>
          <WeeklyOverview />
        </Grid> */}
        <Grid item xs={12} md={6} lg={4}>
          <TotalEarning />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Grid container spacing={6}>
            <Grid item xs={6}>
              <CardStatisticsVerticalComponent
                stats="$25.6k"
                icon={<Poll />}
                color="success"
                trendNumber="+42%"
                title="Total Profit"
                subtitle="Weekly Profit"
              />
            </Grid>
            <Grid item xs={6}>
              <CardStatisticsVerticalComponent
                stats="$78"
                title="Refunds"
                trend="negative"
                color="secondary"
                trendNumber="-15%"
                subtitle="Past Month"
                icon={<CurrencyUsd />}
              />
            </Grid>
            <Grid item xs={6}>
              <CardStatisticsVerticalComponent
                stats="862"
                trend="negative"
                trendNumber="-18%"
                title="New Project"
                subtitle="Yearly Project"
                icon={<BriefcaseVariantOutline />}
              />
            </Grid>
            <Grid item xs={6}>
              <CardStatisticsVerticalComponent
                stats="15"
                color="warning"
                trend="negative"
                trendNumber="-18%"
                subtitle="Last Week"
                title="Sales Queries"
                icon={<HelpCircleOutline />}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <SalesByCountries />
        </Grid>
        <Grid item xs={12} md={12} lg={8}>
          <DepositWithdraw />
        </Grid>
        <Grid item xs={12}>
          <Table />
        </Grid>
      </Grid>
    </ApexChartWrapper>
  );
};

export default Dashboard;
