import Script from "next/script";
import { bodyHtml } from "@/lib/legacy-page";

export default function Home() {
  return (
    <>
      <div className="legacy-root" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <Script src="/legacy.js" strategy="afterInteractive" />
    </>
  );
}
