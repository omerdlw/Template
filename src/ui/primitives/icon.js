"use client";

import { Icon as IconifyIcon } from "@iconify-icon/react";

export default function Icon({
  className = "center",
  onClick,
  size = 20,
  color,
  icon,
  ...props
}) {
  return (
    <IconifyIcon
      className={className}
      onClick={onClick}
      style={{ color }}
      height={size}
      width={size}
      icon={icon}
      {...props}
    />
  );
}
