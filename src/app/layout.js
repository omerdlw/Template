import "./globals.css";
import { geistSans, zuume } from "@/ui/fonts";
import { Providers } from "./providers";

export const metadata = {
  title: {
    default: "Base Framework",
    template: "%s",
  },
  description: "Base Framework",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistSans.className} ${zuume.variable} bg-black text-white antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
