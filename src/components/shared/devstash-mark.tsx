import type { SVGProps } from "react";

interface DevStashMarkProps extends SVGProps<SVGSVGElement> {
  title?: string;
}

export default function DevStashMark({ title, ...props }: DevStashMarkProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="#1d4ed8"
        d="M176 72h160c22 0 40 18 40 40v160H136V112c0-22 18-40 40-40Z"
      />
      <path
        fill="#60a5fa"
        d="M132 128h248c22 0 40 18 40 40v120H92V168c0-22 18-40 40-40Z"
      />
      <path
        fill="#3b82f6"
        d="M68 208c-11 0-19 10-17 21l38 177c4 20 22 34 42 34h250c20 0 38-14 42-34l38-177c2-11-6-21-17-21h-74c-8 0-15 5-18 12l-10 24c-3 7-10 12-18 12H188c-8 0-15-5-18-12l-10-24c-3-7-10-12-18-12H68Z"
      />
    </svg>
  );
}
