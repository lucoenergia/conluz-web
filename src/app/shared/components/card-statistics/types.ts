"use client";

// ** React Imports
import { ReactNode } from "react";

// ** Types
import { ThemeColor } from "@/app/shared/styles/theme/types";

export type CardStatsVerticalProps = {
  title: string;
  stats: string;
  icon: ReactNode;
  subtitle: string;
  color?: ThemeColor;
  trendNumber: string;
  trend?: "positive" | "negative";
};
