import { Inter, Rye } from "next/font/google";

export const inter = Inter({
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const rye = Rye({
  variable: "--font-rye",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
});
