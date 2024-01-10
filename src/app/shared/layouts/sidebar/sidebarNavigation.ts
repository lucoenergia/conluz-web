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

// ** Type import
import { VerticalNavItemsType } from "@/app/shared/layouts/types";

const sidebarNavigation = (): VerticalNavItemsType => {
  return [
    {
      title: "Dashboard",
      icon: HomeOutline,
      path: "/modules/dashboard",
    },
    {
      title: "Account Settings",
      icon: AccountCogOutline,
      path: "/modules/account-settings",
    },
    {
      sectionTitle: "Pages",
    },
    {
      title: "Login",
      icon: Login,
      path: "/modules/login",
      openInNewTab: true,
    },
    {
      title: "Register",
      icon: AccountPlusOutline,
      path: "/modules/register",
      openInNewTab: true,
    },
    {
      title: "Error",
      icon: AlertCircleOutline,
      path: "/modules/error",
      openInNewTab: true,
    },
    {
      sectionTitle: "User Interface",
    },
    {
      title: "Typography",
      icon: FormatLetterCase,
      path: "/modules/typography",
    },
    {
      title: "Icons",
      path: "/modules/icons",
      icon: GoogleCirclesExtended,
    },
    {
      title: "Cards",
      icon: CreditCardOutline,
      path: "/modules/cards",
    },
    {
      title: "Tables",
      icon: Table,
      path: "/modules/tables",
    },
    {
      icon: CubeOutline,
      title: "Form Layouts",
      path: "/modules/form-layouts",
    },
  ];
};

export default sidebarNavigation;
