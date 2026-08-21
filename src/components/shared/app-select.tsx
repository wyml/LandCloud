"use client";

import { Select } from "@heroui/react";
import { ListBox, ListBoxItem } from "react-aria-components";

export interface AppSelectOption {
  value: string;
  label: string;
}

interface AppSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  ariaLabel: string;
  className?: string;
  fullWidth?: boolean;
}

const ITEM_CLASS =
  "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors " +
  "data-[hovered=true]:bg-neutral-100 data-[focus-visible=true]:bg-neutral-100 " +
  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground " +
  "dark:data-[hovered=true]:bg-neutral-800 dark:data-[focus-visible=true]:bg-neutral-800";

export function AppSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  fullWidth,
}: AppSelectProps) {
  return (
    <Select
      aria-label={ariaLabel}
      selectedKey={value}
      onSelectionChange={(key: string | number | null) => onChange(key == null ? "" : String(key))}
      className={className}
      fullWidth={fullWidth}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox slot="list-box" className="p-1.5 outline-none">
          {options.map((opt) => (
            <ListBoxItem
              key={opt.value}
              id={opt.value}
              textValue={opt.label}
              className={ITEM_CLASS}
            >
              {opt.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
