"use client";

import { Select } from "@heroui/react";
import { ListBox, ListBoxItem } from "react-aria-components";
import type { Key } from "react";

export interface AppMultiSelectOption {
  value: string;
  label: string;
}

interface AppMultiSelectProps {
  selected: Set<string>;
  onChange: (keys: Set<string>) => void;
  options: AppMultiSelectOption[];
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}

const ITEM_CLASS =
  "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors " +
  "data-[hovered=true]:bg-neutral-100 data-[focus-visible=true]:bg-neutral-100 " +
  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground " +
  "dark:data-[hovered=true]:bg-neutral-800 dark:data-[focus-visible=true]:bg-neutral-800";

export function AppMultiSelect({
  selected,
  onChange,
  options,
  ariaLabel,
  placeholder,
  className,
}: AppMultiSelectProps) {
  return (
    <Select
      aria-label={ariaLabel}
      selectionMode="multiple"
      value={[...selected]}
      onChange={(keys: Key | Key[] | null) => {
        if (keys === null) {
          onChange(new Set());
        } else if (Array.isArray(keys)) {
          onChange(new Set(keys.map(String)));
        } else {
          onChange(new Set([String(keys)]));
        }
      }}
      placeholder={placeholder}
      className={className}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox slot="list-box" selectionMode="multiple" className="p-1.5 outline-none">
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
