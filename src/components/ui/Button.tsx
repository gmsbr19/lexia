"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { btn } from "@/styles/components.css";

type BtnVariant = "primary" | "secondary" | "ghost" | "gold";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", className, ...props }, ref) => (
    <button
      ref={ref}
      className={[btn({ variant }), className].filter(Boolean).join(" ")}
      {...props}
    />
  )
);
Button.displayName = "Button";
