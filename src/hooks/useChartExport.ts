import type React from "react";
import { useCallback } from "react";
import html2canvas from "html2canvas";

function sanitizeFilename(filename: string): string {
  const clean = filename
    .trim()
    .replace(/\.png$/i, "")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return clean || "chart";
}

export function useChartExport(
  ref: React.RefObject<HTMLDivElement | null>,
  filename: string,
  title = filename,
) {
  const exportChart = useCallback(async () => {
    const container = ref.current;
    if (!container) return false;

    const originalBackground = container.style.background;
    const originalPaddingTop = container.style.paddingTop;
    const originalOverflow = container.style.overflow;

    const header = document.createElement("div");
    header.setAttribute("data-chart-export-header", "true");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "16px";
    header.style.padding = "12px 12px 0";
    header.style.color = "var(--foreground)";
    header.style.fontFamily = "inherit";
    header.style.pointerEvents = "none";

    const heading = document.createElement("div");
    heading.textContent = title;
    heading.style.fontSize = "13px";
    heading.style.fontWeight = "600";
    heading.style.letterSpacing = "0.01em";

    const date = document.createElement("div");
    date.textContent = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    date.style.marginLeft = "auto";
    date.style.fontSize = "11px";
    date.style.color = "var(--muted)";
    date.style.whiteSpace = "nowrap";

    header.append(heading, date);

    try {
      container.prepend(header);
      container.style.background = "var(--card)";
      container.style.overflow = "visible";

      const canvas = await html2canvas(container, {
        backgroundColor: null,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        ignoreElements: (element) =>
          element instanceof HTMLElement &&
          element.hasAttribute("data-chart-export-ignore"),
      });

      const link = document.createElement("a");
      link.download = `${sanitizeFilename(filename)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      return true;
    } finally {
      header.remove();
      container.style.background = originalBackground;
      container.style.paddingTop = originalPaddingTop;
      container.style.overflow = originalOverflow;
    }
  }, [filename, ref, title]);

  return { exportChart };
}
