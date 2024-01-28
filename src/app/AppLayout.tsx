"use client";

import "./shared/css/globals.css";

// ** React Perfect Scrollbar Style
import "react-perfect-scrollbar/dist/css/styles.css";

// ** Component Imports
import ThemeComponent from "@/app/shared/styles/theme/ThemeComponent";

// ** Emotion Imports
import { CacheProvider } from "@emotion/react";

// ** Contexts
import {
  SettingsConsumer,
  SettingsProvider,
} from "@/app/context/settingsContext";

// ** Utils Imports
import { createEmotionCache } from "@/app/shared/utils/utils";

// ** React Import
import React from "react";

// ** Next Import
import { useServerInsertedHTML } from "next/navigation";

// @ts-ignore
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const clientSideEmotionCache = createEmotionCache();

  const [{ cache, flush }] = React.useState(() => {
    const cache = createEmotionCache();
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) {
      return null;
    }
    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{
          __html: styles,
        }}
      />
    );
  });

  return (
    <CacheProvider value={clientSideEmotionCache}>
      <SettingsProvider>
        <SettingsConsumer>
          {({ settings }) => {
            return (
              <ThemeComponent settings={settings}>{children}</ThemeComponent>
            );
          }}
        </SettingsConsumer>
      </SettingsProvider>
    </CacheProvider>
  );
}
