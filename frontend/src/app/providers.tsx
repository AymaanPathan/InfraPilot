"use client";

import { TamboProvider } from "@tambo-ai/react";
import { components } from "@/lib/tambo";
import { infraCommandTool } from "@/tools/infraTool";

export function TamboClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TamboProvider
      apiKey={
        "tambo_Zi7iEhSzcleFQGjJ4AZaG61t5qtVjH1Yq0p8EAGpgzVL1RA1KfH/vA/TlesXu0wmzYpw1PD58dXIT7xVghOHQ4Vnd8f+oXP1IqWnHrljwks="
      }
      tools={[infraCommandTool]}
      components={components}
      mcpServers={[]}
    >
      {children}
    </TamboProvider>
  );
}
