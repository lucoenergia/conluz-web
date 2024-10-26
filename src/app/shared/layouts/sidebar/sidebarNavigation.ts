"use client";

// ** Icon imports
import Login from "mdi-material-ui/Login";
import Table from "mdi-material-ui/Table";
import CubeOutline from "mdi-material-ui/CubeOutline";
import HomeOutline from "mdi-material-ui/HomeOutline";
import FormatLetterCase from "mdi-material-ui/FormatLetterCase";
import AccountCogOutline from "mdi-material-ui/AccountCogOutline";
import CreditCardOutline from "mdi-material-ui/CreditCardOutline";
import AccountPlusOutline from "mdi-material-ui/AccountPlusOutline";
import AlertCircleOutline from "mdi-material-ui/AlertCircleOutline";
import GoogleCirclesExtended from "mdi-material-ui/GoogleCirclesExtended";
import LeaderboardIcon from '@mui/icons-material/Leaderboard';

// ** Type import
import { VerticalNavItemsType } from "@/app/shared/layouts/types";

const sidebarNavigation = (): VerticalNavItemsType => {
  return [
    {
      title: "Dashboard",
      icon: HomeOutline,
      path: "dashboard",
    },
    {
      title: "Account Settings",
      icon: AccountCogOutline,
      path: "account-settings",
    },
    {
      sectionTitle: "Pages",
    },
    {
      title: "Login",
      icon: Login,
      path: "login",
      openInNewTab: true,
    },
    {
      title: "Register",
      icon: AccountPlusOutline,
      path: "register",
      openInNewTab: true,
    },
    {
      title: "Error",
      icon: AlertCircleOutline,
      path: "error",
      openInNewTab: true,
    },
    {
      sectionTitle: "User Interface",
    },
    {
      title: "Typography",
      icon: FormatLetterCase,
      path: "typography",
    },
    {
      title: "Icons",
      path: "icons",
      icon: GoogleCirclesExtended,
    },
    {
      title: "Cards",
      icon: CreditCardOutline,
      path: "cards",
    },
    {
      title: "Tables",
      icon: Table,
      path: "tables",
    },
    {
      icon: CubeOutline,
      title: "Form Layouts",
      path: "form-layouts",
    },
    {
      icon: LeaderboardIcon,
      title: "Charts",
      path: "charts",
    },
  ];
};

export default sidebarNavigation;
