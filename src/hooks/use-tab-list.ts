import { useRef, useState, type KeyboardEvent } from "react";

/** Selection and arrow-key movement for a row of tabs, with focus following the selection. */
export function useTabList(count: number) {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = (selected + step + count) % count;
    setSelected(next);
    tabs.current[next]?.focus();
  };

  const tabRef = (index: number) => (element: HTMLButtonElement | null) => {
    tabs.current[index] = element;
  };

  return { selected, setSelected, onKeyDown, tabRef };
}
