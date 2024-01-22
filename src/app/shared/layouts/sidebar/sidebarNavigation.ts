"use client";

// ** Icon imports
import BarChartIcon from "@mui/icons-material/BarChart";

// ** Type import
import { VerticalNavItemsType } from "@/app/shared/layouts/types";

const sidebarNavigation = (): VerticalNavItemsType => {
  return [
    {
      sectionTitle: "User Interface",
    },
    {
      title: "Charts",
      icon: BarChartIcon,
      path: "charts",
    },
  ];
};

export default sidebarNavigation;
