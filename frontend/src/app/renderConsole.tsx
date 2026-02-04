"use client";

import { usePathname } from "next/navigation";
import { DevConsole } from "@/components/DevConsole";

export function ConditionalDevConsole() {
  const pathname = usePathname();

  // Only show DevConsole on chat and interactables pages, not on landing page
  const shouldShowDevConsole = pathname !== "/";

  if (!shouldShowDevConsole) {
    return null;
  }

  return (
    <DevConsole
      defaultExpanded={false}
      position="bottom"
      maxLogs={1000}
      persistLogs={true}
    />
  );
}
