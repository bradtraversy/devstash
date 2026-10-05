import { ImageResponse } from "next/og";
import DevStashMark from "@/components/shared/devstash-mark";

export const alt = "DevStash";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The image renderer takes inline styles only, so this file is the one place they are allowed.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "linear-gradient(135deg, #0a0a0a 0%, #111827 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <DevStashMark style={{ width: 96, height: 96 }} />
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>DevStash</div>
        </div>
        <div style={{ marginTop: 36, fontSize: 40, color: "#a1a1aa" }}>
          Stash it. Share it.
        </div>
      </div>
    ),
    { ...size }
  );
}
