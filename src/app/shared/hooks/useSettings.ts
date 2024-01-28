"use client";

import { useContext } from "react";
import {
  SettingsContext,
  SettingsContextValue,
} from "@/app/shared/context/settingsContext";

export const useSettings = (): SettingsContextValue =>
  useContext(SettingsContext);
