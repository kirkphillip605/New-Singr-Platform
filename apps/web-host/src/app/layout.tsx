import type { Metadata } from "next";
import "@singr/ui/styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Singr Host Portal",
  description: "Manage venues, active shows, and drag-and-drop live request queues in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-[var(--singr-bg-primary)] text-[var(--singr-text-primary)] font-sans">
        <div className="fixed inset-0 pointer-events-none -z-10 bg-radial-at-0-0 rgba(255, 69, 50, 0.03) bg-radial-at-100-100 rgba(255, 170, 44, 0.03)" style={{
          backgroundImage: `
            radial-gradient(at 0% 0%, rgba(255, 69, 50, 0.03) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(255, 170, 44, 0.03) 0px, transparent 50%)
          `
        }} />
        {children}
      </body>
    </html>
  );
}
