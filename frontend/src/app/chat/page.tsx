"use client";

import { useEffect, useRef, useState } from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import { MessageCircle, Send, Brain, Loader2, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-black flex flex-col">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative flex-1 overflow-hidden flex flex-col">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto px-4 py-12 md:px-6">
            {messages.length === 0 ? (
              <EmptyState onExampleClick={setInputValue} />
            ) : (
              <div className="space-y-8">
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
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }

        .animate-shimmer {
          animation: shimmer 2s infinite linear;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 0.03) 50%,
            transparent 100%
          );
          background-size: 1000px 100%;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 2px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
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
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center animate-fadeIn">
      <div className="mb-10">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
          <div className="relative bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
            <MessageCircle className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <h1 className="text-4xl md:text-5xl font-medium mb-4 text-white tracking-tight">
        Kubernetes Assistant
      </h1>

      <p className="text-zinc-400 mb-16 max-w-md text-base md:text-lg leading-relaxed font-light">
        Monitor resources, analyze metrics, view logs.
        <br />
        <span className="text-white/90">AI-powered cluster insights.</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
        {[
          "Show cluster overview",
          "Check pod health status",
          "Analyze resource usage",
          "View recent error logs",
        ].map((example, i) => (
          <button
            key={i}
            onClick={() => onExampleClick(example)}
            className="group px-5 py-3.5 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700/50 rounded-xl text-left transition-all duration-300 hover:scale-[1.02]"
          >
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors duration-300">
              {example}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function isInternalData(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.includes("componentName")) {
    return true;
  }

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

  const explanation = message.content?.find(
    (c: any) => c.type === "tool_result" && c.content?.explanation,
  )?.content?.explanation;

  const autoExplained = message.content?.find(
    (c: any) => c.type === "tool_result" && c.content?.autoExplained,
  )?.content?.autoExplained;

  const textContent = Array.isArray(message.content)
    ? message.content
        .filter((item: any) => {
          if (item.type !== "text") return false;
          if (isInternalData(item.text)) {
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
        className={`max-w-2xl ${
          isUser
            ? "bg-white text-black"
            : "bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 text-white w-full"
        } rounded-2xl px-5 py-4 transition-all duration-300 hover:shadow-lg ${
          isUser ? "hover:shadow-white/10" : "hover:shadow-black/50"
        }`}
      >
        {textContent.map((text: string, i: number) => (
          <p
            key={i}
            className={`text-[15px] whitespace-pre-wrap leading-relaxed font-light ${
              isUser ? "text-black" : "text-zinc-100"
            }`}
          >
            {text}
          </p>
        ))}

        {message.renderedComponent && (
          <div
            className={`${textContent.length > 0 ? "mt-5" : ""} animate-fadeIn`}
          >
            {message.renderedComponent}
          </div>
        )}

        {explanation && !isUser && (
          <div className="mt-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-3 text-sm text-zinc-400">
              <div className="p-1 bg-zinc-800/50 rounded-md">
                <Brain className="w-3.5 h-3.5" strokeWidth={2} />
              </div>
              <span className="font-medium">
                {autoExplained ? "Auto-Analysis" : "AI Explanation"}
              </span>
            </div>
            <ExplanationDisplay
              explanation={explanation}
              type="info"
              showIcon={false}
              className="bg-zinc-800/30 border-zinc-700/50"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-3 text-zinc-400 px-5 py-4 animate-slideUp">
      <div className="relative">
        <Loader2 className="w-5 h-5 animate-spin text-white" strokeWidth={2} />
        <div className="absolute inset-0 bg-white/20 blur-md animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-light">Analyzing cluster</span>
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
    <div className="relative border-t border-zinc-800/50 bg-black/80 backdrop-blur-xl sticky bottom-0 z-10">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent" />

      <div className="max-w-3xl mx-auto px-4 py-6 md:px-6">
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`relative rounded-xl transition-all duration-300 ${
              isFocused
                ? "ring-1 ring-white/20 shadow-lg shadow-white/5"
                : "ring-1 ring-zinc-800/50"
            }`}
          >
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={onKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask about your cluster..."
              className="w-full px-5 py-4 pr-14 bg-zinc-900/50 backdrop-blur-sm rounded-xl text-white placeholder-zinc-500 focus:outline-none transition-all duration-300 font-light text-[15px]"
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !value.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:cursor-not-allowed text-black disabled:text-zinc-600 rounded-lg transition-all duration-300 hover:scale-105 disabled:scale-100 group disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              ) : (
                <Send
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-zinc-600 mt-4 text-center font-light">
          Press{" "}
          <kbd className="px-2 py-1 bg-zinc-900/50 border border-zinc-800/50 rounded text-zinc-400 font-mono text-[11px]">
            Enter
          </kbd>{" "}
          to send
        </p>
      </div>
    </div>
  );
}
