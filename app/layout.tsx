import "@navikt/ds-css";
import "@fontsource-variable/source-sans-3";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

import type { Metadata } from "next";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: {
    default: "nEESSI admin",
    template: "%s · nEESSI admin",
  },
  description: "Administrasjon, innsikt og drift for EUX/nEESSI – prototype med fiktive data.",
};

const themeBootScript = `(function(){try{var m=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(m!=="light"&&m!=="dark"&&m!=="system")m="system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(d?"dark":"light");e.style.colorScheme=d?"dark":"light";e.setAttribute("data-theme-mode",m);}catch(_){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
