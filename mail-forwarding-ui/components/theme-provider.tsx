"use client";

import * as React from "react";

// next-themes está com typing conflitante no seu workspace.
// Aqui a gente força um wrapper estável pro build passar.
type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("next-themes") as any;
  const NextThemesProvider = mod.ThemeProvider as React.ComponentType<any>;

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
