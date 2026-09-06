import localFont from "next/font/local";

export const geistSans = localFont({
  variable: "--font-geist-sans",
  src: [
    {
      path: "./fonts/geist/Geist-Variable.woff2",
      style: "normal",
      weight: "100 900",
    },
  ],
});

export const zuume = localFont({
  variable: "--font-zuume",
  src: [
    {
      path: "./fonts/zuume/Zuume-Bold.woff2",
      style: "normal",
      weight: "700",
    },
  ],
});
