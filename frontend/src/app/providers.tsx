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
        process.env.NEXT_PUBLIC_TAMBO_API_KEY || "your-tambo-api-key"
      }
      tools={[infraCommandTool]}
      components={components}
      mcpServers={[]}
    >
      {children}
    </TamboProvider>
  );
}
