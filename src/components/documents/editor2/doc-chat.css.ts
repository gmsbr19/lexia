import { keyframes, style } from "@vanilla-extract/css"

const blink = keyframes({
  "0%, 100%": { opacity: 0.25, transform: "translateY(0)" },
  "50%": { opacity: 1, transform: "translateY(-1px)" },
})

export const typingDot = style({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "var(--accent)",
  animation: `${blink} 1.1s ease-in-out infinite`,
})
