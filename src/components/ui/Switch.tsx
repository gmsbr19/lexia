"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { switchRoot, switchThumb } from "./switch.css";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
}

export function Switch({ checked, onCheckedChange, id }: SwitchProps) {
  return (
    <RadixSwitch.Root
      className={switchRoot}
      checked={checked}
      onCheckedChange={onCheckedChange}
      id={id}
    >
      <RadixSwitch.Thumb className={switchThumb} />
    </RadixSwitch.Root>
  );
}
