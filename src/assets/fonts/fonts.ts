import {
  Inter,
  Roboto,
  Oxygen,
  Ubuntu,
  Cantarell,
  Fira_Sans,
} from "next/font/google";

export const inter_init = Inter({
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const inter = inter_init.className;
