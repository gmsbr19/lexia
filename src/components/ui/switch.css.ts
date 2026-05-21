import { style } from "@vanilla-extract/css";
import { tokens } from "@/styles/tokens.css";

export const switchRoot = style({
  width: "30px",
  height: "18px",
  borderRadius: "999px",
  background: tokens.color.borderStrong,
  position: "relative",
  transition: "background 0.15s",
  border: "none",
  cursor: "pointer",
  flexShrink: 0,
  selectors: {
    '&[data-state="checked"]': { background: tokens.brand.gold },
  },
});

export const switchThumb = style({
  display: "block",
  width: "14px",
  height: "14px",
  borderRadius: "50%",
  background: "#FFFFFF",
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  transition: "transform 0.15s",
  transform: "translateX(2px)",
  selectors: {
    '[data-state="checked"] &': { transform: "translateX(14px)" },
  },
});
