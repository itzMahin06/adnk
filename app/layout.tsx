import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Noto_Serif_Bengali } from "next/font/google"
import { Preloader } from "@/components/preloader"
import { LoadingProvider } from "@/providers/loading-provider"
import { MobileNav } from "@/components/mobile-nav"
import { Toaster } from "@/components/ui/toaster"

// Initialize the Noto Serif Bengali font
const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-serif-bengali",
})

export const metadata: Metadata = {
  title: "এডমিশন নিয়ে খেলছি - অনলাইন পরীক্ষা প্ল্যাটফর্ম",
  description: "স্বপ্নের বিশ্ববিদ্যালয়ে ভর্তির জন্য সেরা প্রস্তুতি নিন। অনলাইন পরীক্ষা, অনুশীলন এবং ফলাফল ট্র্যাকিং।",
  keywords: "admission, exam, university, bangladesh, online test, ভর্তি পরীক্ষা, বিশ্ববিদ্যালয় ভর্তি, অনলাইন পরীক্ষা",
  authors: [{ name: "এডমিশন নিয়ে খেলছি" }],
  creator: "এডমিশন নিয়ে খেলছি",
  publisher: "এডমিশন নিয়ে খেলছি",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "এডমিশন নিয়ে খেলছি",
    description: "স্বপ্নের বিশ্ববিদ্যালয়ে ভর্তির জন্য সেরা প্রস্তুতি নিন",
    url: "https://your-domain.com",
    siteName: "এডমিশন নিয়ে খেলছি",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "এডমিশন নিয়ে খেলছি",
      },
    ],
    locale: "bn_BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "এডমিশন নিয়ে খেলছি",
    description: "স্বপ্নের বিশ্ববিদ্যালয়ে ভর্তির জন্য সেরা প্রস্তুতি নিন",
    images: ["/logo.png"],
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="bn" suppressHydrationWarning className={notoSerifBengali.variable}>
      <head>
        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\\$$', '\\\$$']],
        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process'
      },
      startup: {
        ready: function() {
          MathJax.startup.defaultReady();
          // Force a typeset when the page loads
          MathJax.typeset();
        }
      }
    };
  `,
          }}
        ></script>
      </head>
      <body className={notoSerifBengali.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LoadingProvider>
            <SidebarProvider>
              <Preloader />
              <div className="has-mobile-nav">{children}</div>
              <MobileNav />
              <Toaster />
            </SidebarProvider>
          </LoadingProvider>
        </ThemeProvider>
      {/* v0 – built-with badge */}
  <div dangerouslySetInnerHTML={{ __html: `<div id="v0-built-with-button-02fea5da-57c8-4c63-9a7f-e1d0298feb43" style="
border: 1px solid hsl(0deg 0% 100% / 12%);
position: fixed;
bottom: 24px;
right: 24px;
z-index: 1000;
background: #121212;
color: white;
padding: 8px 12px;
border-radius: 8px;
font-weight: 400;
font-size: 14px;
box-shadow: 0 2px 8px rgba(0,0,0,0.12);
letter-spacing: 0.02em;
transition: all 0.2s;
display: flex;
align-items: center;
gap: 4px;
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
">
<a
  href="https://v0.dev/chat/api/open/built-with-v0/b_wQEgJlN8eYj"
  target="_blank"
  rel="noopener noreferrer"
  style="
    color: inherit;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 4px;
  "
>
  Built with
  <svg
    fill="currentColor"
    viewBox="0 0 40 20"
    xmlns="http://www.w3.org/2000/svg"
    style="width: 20px; height: 20px;"
  >
    <path d="M23.3919 0H32.9188C36.7819 0 39.9136 3.13165 39.9136 6.99475V16.0805H36.0006V6.99475C36.0006 6.90167 35.9969 6.80925 35.9898 6.71766L26.4628 16.079C26.4949 16.08 26.5272 16.0805 26.5595 16.0805H36.0006V19.7762H26.5595C22.6964 19.7762 19.4788 16.6139 19.4788 12.7508V3.68923H23.3919V12.7508C23.3919 12.9253 23.4054 13.0977 23.4316 13.2668L33.1682 3.6995C33.0861 3.6927 33.003 3.68923 32.9188 3.68923H23.3919V0Z" />
    <path d="M13.7688 19.0956L0 3.68759H5.53933L13.6231 12.7337V3.68759H17.7535V17.5746C17.7535 19.6705 15.1654 20.6584 13.7688 19.0956Z" />
  </svg>
</a>

<button
  onclick="document.getElementById('v0-built-with-button-02fea5da-57c8-4c63-9a7f-e1d0298feb43').style.display='none'"
  onmouseenter="this.style.opacity='1'"
  onmouseleave="this.style.opacity='0.7'"
  style="
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 2px;
    margin-left: 4px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    opacity: 0.7;
    transition: opacity 0.2s;
    transform: translateZ(0);
  "
  aria-label="Close"
>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
</button>

<span style="
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
">
  v0
</span>
</div>` }} />
</body>
    </html>
  )
}
