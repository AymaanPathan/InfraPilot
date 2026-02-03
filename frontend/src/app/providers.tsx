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
        "tambo_pzNAu22lrhgYalLeNnVRUXkeJ9btGL626yIFuJVtVx9O81oup/VvKhVy6ANzswGuhIwswvN5Jte5lBS1hWqeI5ngG7ruWmk6mg2080sMg/k="
      }
      tools={[infraCommandTool]}
      components={components}
      mcpServers={[]}
    >
      {children}
    </TamboProvider>
  );
}
