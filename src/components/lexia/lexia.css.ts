// Animations for the LexIA chat kit (spinner + thinking dots). Co-located CSS
// per the project's vanilla-extract convention; applied via global class names
// referenced from the inline-styled components.
import { globalKeyframes, globalStyle } from "@vanilla-extract/css"

const spin = "lxSpin"
globalKeyframes(spin, {
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
})
globalStyle(".lx-spin", {
  animation: `${spin} 0.8s linear infinite`,
})

const pulse = "lxPulse"
globalKeyframes(pulse, {
  "0%, 80%, 100%": { opacity: 0.25, transform: "translateY(0)" },
  "40%": { opacity: 1, transform: "translateY(-2px)" },
})
globalStyle(".lx-dot", {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "var(--text-subtle)",
  display: "inline-block",
  animation: `${pulse} 1.2s ease-in-out infinite`,
})
