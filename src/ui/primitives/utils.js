"use client";

import { cn, debounce, isObject as isPlainObject } from "@/shared";
import { useCallback, useState } from "react";

export { debounce };

export function resolveSlotClasses(className, classNames = {}) {
  const legacyClasses = isPlainObject(classNames) ? classNames : {};

  if (isPlainObject(className)) {
    return { ...legacyClasses, ...className };
  }

  if (typeof className === "string") {
    return { ...legacyClasses, root: cn(legacyClasses.root, className) };
  }

  return legacyClasses;
}

export function resolveNestedClassName(classMap, key, legacyValue) {
  const nestedValue = classMap?.[key];

  if (nestedValue === undefined) {
    return legacyValue;
  }

  return nestedValue;
}

export function filterOptions(options, query, filterFn = null) {
  if (!query) return options;

  if (filterFn) {
    return options.filter((option) => filterFn(option, query));
  }

  return options.filter((option) => {
    const label = option.label || option.value || "";
    return label.toLowerCase().includes(query.toLowerCase());
  });
}

export function useSelect({ value, onChange, defaultValue, multiple = false }) {
  const [internalValue, setInternalValue] = useState(
    defaultValue || (multiple ? [] : null),
  );
  const [isOpen, setIsOpen] = useState(false);

  const currentValue = value !== undefined ? value : internalValue;

  const handleSelect = useCallback(
    (selectedValue) => {
      if (multiple) {
        const newValue = currentValue.includes(selectedValue)
          ? currentValue.filter((v) => v !== selectedValue)
          : [...currentValue, selectedValue];

        if (value === undefined) {
          setInternalValue(newValue);
        }
        onChange?.(newValue);
      } else {
        if (value === undefined) {
          setInternalValue(selectedValue);
        }
        onChange?.(selectedValue);
        setIsOpen(false);
      }
    },
    [currentValue, multiple, onChange, value],
  );

  const handleOpenChange = useCallback((open) => {
    setIsOpen(open);
  }, []);

  return {
    value: currentValue,
    isOpen,
    handleSelect,
    handleOpenChange,
    setIsOpen,
  };
}
