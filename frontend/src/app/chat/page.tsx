"use client";

import { useEffect, useRef, useState } from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import {
  MessageCircle,
  Send,
  Sparkles,
  Activity,
  Box,
  Database,
  Network,
  TrendingUp,
  Brain,
  Command,
  Loader2,
} from "lucide-react";
import { ExplanationDisplay } from "@/components/container/Explanationcomponents";
import { logger } from "@/components/DevConsole";

export default function ChatPage() {
  const { thread, isLoading } = useTamboThread();
  const { value, setValue, submit } = useTamboThreadInput();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (thread?.messages?.length) {
      const lastMessage = thread.messages.at(-1);

      // Log to DevConsole only - not displayed in chat
      logger.group("TAMBO MESSAGE DEBUG");
      logger.debug("tambo", `Message role: ${lastMessage?.role}`);
      logger.debug("tambo", `Message ID: ${lastMessage?.id}`);
      logger.debug("tambo", "Has rendered component", {
        hasComponent: !!lastMessage?.renderedComponent,
      });

      if (lastMessage?.content) {
        const hasExplanation = lastMessage.content.some(
          (c: any) => c.type === "tool_result" && c.content?.explanation,
        );
        logger.debug("tambo", `Has explanation: ${hasExplanation}`);
      }

      if (lastMessage?.renderedComponent) {
        logger.info("tambo", "Component rendered", {
          type:
            lastMessage.renderedComponent?.type?.name ||
            typeof lastMessage.renderedComponent,
        });
      }

      logger.debug("tambo", "Full message object", lastMessage);
    }
  }, [thread?.messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  const messages = thread?.messages || [];

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isLoading) return;

    setValue(input);
    setInputValue("");

    logger.group(`Sending message: "${input}"`);
    logger.info("chat", "User input received", {
      input: input.substring(0, 100),
      threadId: thread?.id,
      messageCountBefore: thread?.messages?.length,
    });

    try {
      const startTime = Date.now();

      await submit({
        streamResponse: true,
        forceToolChoice: "infra_command",
      });

      const duration = Date.now() - startTime;
      logger.success("chat", `Submit successful (${duration}ms)`, {
        messageCountAfter: thread?.messages?.length,
      });
    } catch (err: any) {
      logger.group("🚨 TAMBO SUBMISSION ERROR");
      logger.error("chat", "Submission failed", {
        errorType: err?.constructor?.name,
        message: err?.message,
        cause: err?.cause,
        stack: err?.stack,
      });

      if (err?.response) {
        logger.error("chat", "Error response", { response: err.response });
        try {
          const responseText = await err.response.text();
          logger.error("chat", "Response body", { body: responseText });
        } catch (e) {
          logger.warn("chat", "Could not read response body");
        }
      }

      logger.error("chat", "Thread state at error", {
        threadId: thread?.id,
        messageCount: thread?.messages?.length,
        lastMessage: thread?.messages?.at(-1),
      });

      alert(
        `Error: ${err?.message || "Unknown error occurred"}. Check DevConsole for details.`,
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {messages.length === 0 ? (
              <EmptyState onExampleClick={setInputValue} />
            ) : (
              <div className="space-y-6">
                {messages.map((message: any, index: number) => (
                  <MessageBubble
                    key={message.id || index}
                    message={message}
                    isLatest={index === messages.length - 1}
                  />
                ))}
              </div>
            )}
            {isLoading && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          isLoading={isLoading}
        />
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.5s ease-out;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #d4d4d4;
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a3a3a3;
        }
      `}</style>
    </div>
  );
}

function EmptyState({
  onExampleClick,
}: {
  onExampleClick: (text: string) => void;
}) {
  const examples = [
    {
      text: "Show me cluster overview with health metrics",
      icon: <Activity className="w-5 h-5" />,
      color: "neutral",
    },
    {
      text: "Get resource usage for all namespaces",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "neutral",
    },
    {
      text: "Monitor pod health across the cluster",
      icon: <Box className="w-5 h-5" />,
      color: "neutral",
    },
    {
      text: "Show all pods and their current status",
      icon: <Database className="w-5 h-5" />,
      color: "neutral",
    },
    {
      text: "Get logs for api-server pod",
      icon: <Command className="w-5 h-5" />,
      color: "neutral",
    },
    {
      text: "List all deployments and services",
      icon: <Network className="w-5 h-5" />,
      color: "neutral",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] text-center animate-fadeIn">
      <div className="mb-8">
        <div className="bg-neutral-100 p-6 rounded-2xl">
          <MessageCircle className="w-12 h-12 text-neutral-700" />
        </div>
      </div>

      <h2 className="text-3xl font-semibold mb-3 text-neutral-900">
        Welcome to your Kubernetes Assistant
      </h2>

      <p className="text-neutral-600 mb-12 max-w-2xl text-base leading-relaxed">
        Ask me anything about your cluster. I can monitor resources, view logs,
        check health, analyze metrics,{" "}
        <span className="font-medium text-neutral-900">
          and explain what's wrong
        </span>{" "}
        using AI.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl w-full">
        {examples.map((example, index) => (
          <button
            key={index}
            onClick={() => onExampleClick(example.text)}
            className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 text-left transition-all duration-200 hover:border-neutral-300 hover:shadow-sm"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col gap-3">
              <div className="inline-flex p-2.5 rounded-lg bg-neutral-100 text-neutral-700 w-fit">
                {example.icon}
              </div>
              <span className="text-sm text-neutral-700 leading-relaxed">
                {example.text}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 flex items-center gap-2 text-xs text-neutral-400">
        <Sparkles className="w-4 h-4" />
        <span>
          Powered by AI • Real-time monitoring • Automatic issue detection
        </span>
      </div>
    </div>
  );
}

/**
 * Helper function to check if text looks like JSON or internal data
 */
function isInternalData(text: string): boolean {
  const trimmed = text.trim();

  // Check if it's JSON
  if (trimmed.startsWith("{") && trimmed.includes("componentName")) {
    return true;
  }

  // Check if it's stringified JSON
  if (trimmed.startsWith('{"componentName"')) {
    return true;
  }

  return false;
}

function MessageBubble({
  message,
  isLatest,
}: {
  message: any;
  isLatest: boolean;
}) {
  const isUser = message.role === "user";

  // Extract explanation from tool_result content
  const explanation = message.content?.find(
    (c: any) => c.type === "tool_result" && c.content?.explanation,
  )?.content?.explanation;

  const autoExplained = message.content?.find(
    (c: any) => c.type === "tool_result" && c.content?.autoExplained,
  )?.content?.autoExplained;

  // Get only human-readable text content (filter out JSON and tool results)
  const textContent = Array.isArray(message.content)
    ? message.content
        .filter((item: any) => {
          // Only include text type
          if (item.type !== "text") return false;

          // Filter out JSON-like content
          if (isInternalData(item.text)) {
            logger.debug("chat", "Filtered out internal data from display", {
              preview: item.text.substring(0, 100),
            });
            return false;
          }

          return true;
        })
        .map((item: any) => item.text)
    : [];

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-slideUp`}
    >
      <div
        className={`max-w-4xl ${
          isUser
            ? "bg-neutral-900 text-white"
            : "bg-white border border-neutral-200 text-neutral-900 w-full"
        } rounded-xl px-6 py-4 transition-all duration-200`}
      >
        {/* Render ONLY clean text content */}
        {textContent.map((text: string, i: number) => (
          <p
            key={i}
            className={`text-sm whitespace-pre-wrap leading-relaxed ${isUser ? "text-white" : "text-neutral-700"}`}
          >
            {text}
          </p>
        ))}

        {/* Render component if available */}
        {message.renderedComponent && (
          <div
            className={
              textContent.length > 0 ? "mt-4 animate-fadeIn" : "animate-fadeIn"
            }
          >
            {message.renderedComponent}
          </div>
        )}

        {/* Render AI explanation if available */}
        {explanation && !isUser && (
          <div className="mt-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-3 text-sm text-neutral-600">
              <Brain className="w-4 h-4" />
              <span className="font-medium">
                {autoExplained ? "AI Auto-Analysis" : "AI Explanation"}
              </span>
            </div>
            <ExplanationDisplay
              explanation={explanation}
              type="info"
              showIcon={false}
              className="bg-neutral-50 border-neutral-200"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-3 text-neutral-600 px-6 py-4 animate-slideUp">
      <Loader2 className="w-5 h-5 animate-spin text-neutral-600" />
      <div className="flex gap-1">
        <span className="text-sm">Analyzing cluster</span>
        <span className="animate-pulse">.</span>
        <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>
          .
        </span>
        <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>
          .
        </span>
      </div>
    </div>
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  isLoading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (input: string) => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.trim()) {
      onSend(value);
    }
  };

  return (
    <div className="border-t border-neutral-200 bg-white/80 backdrop-blur-xl sticky bottom-0 z-10">
      <div className="max-w-4xl mx-auto px-6 py-5">
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`relative rounded-xl transition-all duration-200 ${
              isFocused
                ? "ring-2 ring-neutral-900 shadow-sm"
                : "ring-1 ring-neutral-200"
            }`}
          >
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={onKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask about your cluster... (e.g., 'show cluster overview')"
              className="w-full px-5 py-3.5 pr-14 bg-white rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all duration-200"
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !value.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 hover:scale-105 disabled:scale-100 group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-neutral-500 mt-3 text-center">
          Press{" "}
          <kbd className="px-2 py-1 bg-neutral-100 border border-neutral-200 rounded text-neutral-700 font-mono text-xs">
            Enter
          </kbd>{" "}
          to send • AI will auto-explain issues
        </p>
      </div>
    </div>
  );
}
