"use client";

import { useEffect, useRef, useState } from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import {
  Send,
  Brain,
  Loader2,
  Terminal,
  Sparkles,
  Zap,
  CheckCircle2,
  Code,
} from "lucide-react";
import { ExplanationDisplay } from "@/components/container/Explanationcomponents";
import { logger } from "@/components/DevConsole";

export default function ChatPage() {
  const { thread, isLoading } = useTamboThread();
  const { value, setValue, submit } = useTamboThreadInput();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [generatingComponent, setGeneratingComponent] = useState(false);

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
        setGeneratingComponent(false);
      }

      logger.debug("tambo", "Full message object", lastMessage);
    }
  }, [thread?.messages]);

  useEffect(() => {
    if (isLoading) {
      setGeneratingComponent(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isAutoScrollEnabled && messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    }
  }, [thread?.messages, isAutoScrollEnabled, isLoading]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setIsAutoScrollEnabled(isNearBottom);
  };

  const messages = thread?.messages || [];

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isLoading) return;

    setIsAutoScrollEnabled(true);
    setValue(input);
    setInputValue("");
    setGeneratingComponent(true);

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
      setGeneratingComponent(false);
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
    <div className="h-screen bg-gradient-to-br from-black via-zinc-950 to-black flex flex-col overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_50%)]" />
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
      </div>

      <div className="relative flex-1 flex flex-col overflow-hidden z-10">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scrollbar-thin"
          style={{ scrollbarGutter: "stable" }}
        >
          <div className="max-w-6xl mx-auto px-4 py-8 md:px-6">
            {messages.length === 0 ? (
              <EmptyState onExampleClick={setInputValue} />
            ) : (
              <div className="space-y-8 pb-4">
                {messages.map((message: any, index: number) => (
                  <MessageBubble
                    key={message.id || index}
                    message={message}
                    isLatest={index === messages.length - 1}
                    isGenerating={
                      generatingComponent && index === messages.length - 1
                    }
                  />
                ))}
              </div>
            )}
            {isLoading && generatingComponent && <ComponentGenerationStatus />}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <CommandInput
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
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
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
            rgba(255, 255, 255, 0.1) 50%,
            transparent 100%
          );
          background-size: 1000px 100%;
        }

        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 255, 255, 0.2);
          }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }

        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
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
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center">
      <div className="mb-10 animate-fadeIn">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl rounded-full" />
          <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 p-8 rounded-3xl border border-white/10 backdrop-blur-xl">
            <Terminal className="w-16 h-16 text-white" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <h1
        className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent tracking-tight animate-fadeIn"
        style={{ animationDelay: "0.1s" }}
      >
        Kubernetes AI Assistant
      </h1>

      <p
        className="text-zinc-400 mb-14 max-w-xl text-lg md:text-xl leading-relaxed font-light animate-fadeIn"
        style={{ animationDelay: "0.2s" }}
      >
        Your intelligent debugging companion.
        <br />
        <span className="text-white/90 font-medium">
          Ask questions, get visual insights instantly.
        </span>
      </p>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl animate-fadeIn"
        style={{ animationDelay: "0.3s" }}
      >
        {[
          {
            text: "Show cluster overview",
            icon: <Terminal className="w-4 h-4" />,
          },
          {
            text: "Which pods are unhealthy?",
            icon: <Sparkles className="w-4 h-4" />,
          },
          {
            text: "Compare CPU usage of two pods",
            icon: <Zap className="w-4 h-4" />,
          },
          {
            text: "Why is payment-service crashing?",
            icon: <Brain className="w-4 h-4" />,
          },
        ].map((example, i) => (
          <button
            key={i}
            onClick={() => onExampleClick(example.text)}
            className="group px-6 py-5 bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 hover:from-zinc-800/60 hover:to-zinc-700/40 border border-white/5 hover:border-white/20 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-white/5 active:scale-[0.98] backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="text-zinc-500 group-hover:text-white transition-colors duration-300">
                {example.icon}
              </div>
              <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors duration-300 font-medium">
                EXAMPLE QUERY
              </span>
            </div>
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors duration-300 leading-relaxed">
              {example.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ComponentGenerationStatus() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-center animate-slideUp mb-8">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-pink-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse-glow" />

        {/* Main container */}
        <div className="relative bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-6 shadow-2xl">
          <div className="flex items-center gap-6">
            {/* Animated icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/10 rounded-2xl blur-md animate-pulse" />
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 p-4 rounded-2xl">
                <Code
                  className="w-8 h-8 text-white animate-pulse"
                  strokeWidth={1.5}
                />
              </div>
            </div>

            {/* Text content */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                <span className="text-white font-semibold text-lg">
                  Generating Component{dots}
                </span>
              </div>
              <p className="text-zinc-400 text-sm">
                Analyzing cluster data and building visualization
              </p>
            </div>

            {/* Progress indicator */}
            <div className="ml-4">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-white/30 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Shimmer effect */}
          <div className="absolute inset-0 animate-shimmer rounded-2xl pointer-events-none" />
        </div>
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
  isGenerating,
}: {
  message: any;
  isLatest: boolean;
  isGenerating?: boolean;
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
          if (isInternalData(item.text)) return false;
          return true;
        })
        .map((item: any) => item.text)
        .join(" ")
    : "";

  const hasComponent = !!message.renderedComponent;
  const hasText = textContent.trim().length > 0;

  // USER MESSAGE
  if (isUser) {
    return (
      <div className="flex justify-end animate-slideUp">
        <div className="flex items-center gap-4 max-w-[75%]">
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-zinc-400/20 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300" />
            <div className="relative bg-white rounded-2xl px-6 py-4 shadow-2xl">
              <p className="text-[15px] text-black leading-relaxed font-medium">
                {textContent}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // AI RESPONSE - Full width, no chat bubble
  return (
    <div className="flex flex-col gap-6 animate-slideUp w-full">
      {/* Component Display - Full width card */}
      {hasComponent && (
        <div className="relative group animate-fadeIn">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-pink-600/10 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-all duration-500" />
          <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-800/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header badge */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 bg-black/20">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-zinc-400 font-medium tracking-wide">
                VISUALIZATION READY
              </span>
            </div>

            {/* Component content */}
            <div className="p-6">{message.renderedComponent}</div>
          </div>
        </div>
      )}

      {/* AI Explanation */}
      {explanation && (
        <div className="max-w-4xl">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-all duration-500" />
            <div className="relative bg-gradient-to-br from-zinc-900/70 to-zinc-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Brain className="w-5 h-5 text-blue-400" strokeWidth={2} />
                </div>
                <div>
                  <span className="text-sm text-white font-semibold">
                    {autoExplained ? "Automatic Analysis" : "AI Insights"}
                  </span>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Deep dive into the data
                  </p>
                </div>
              </div>
              <ExplanationDisplay
                explanation={explanation}
                type="info"
                showIcon={false}
                className="bg-transparent border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommandInput({
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
    if (value.trim() && !isLoading) {
      onSend(value);
    }
  };

  return (
    <div className="relative shrink-0">
      {/* Top gradient border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Background with blur */}
      <div className="relative bg-black/95 backdrop-blur-2xl border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="relative">
            {/* Glow effect on focus */}
            {isFocused && (
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-pink-600/20 rounded-2xl blur-xl animate-pulse-glow" />
            )}

            <div
              className={`relative rounded-2xl transition-all duration-300 ${
                isFocused
                  ? "ring-2 ring-white/30 shadow-2xl shadow-white/10"
                  : "ring-1 ring-white/10"
              }`}
            >
              <div className="flex items-center gap-3 bg-gradient-to-br from-zinc-900/90 to-zinc-800/80 backdrop-blur-xl rounded-2xl px-6 py-4">
                {/* Terminal icon */}
                <Terminal
                  className={`w-5 h-5 shrink-0 transition-colors duration-300 ${
                    isFocused ? "text-white" : "text-zinc-600"
                  }`}
                />

                {/* Input */}
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyPress={onKeyPress}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Ask anything about your cluster..."
                  className="flex-1 bg-transparent text-white placeholder-zinc-500 focus:outline-none text-[15px] font-medium"
                  disabled={isLoading}
                  autoComplete="off"
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={isLoading || !value.trim()}
                  className="relative group shrink-0 p-3 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 text-black disabled:text-zinc-600 rounded-xl transition-all duration-200 disabled:cursor-not-allowed overflow-hidden"
                >
                  {/* Button glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative">
                    {isLoading ? (
                      <Loader2
                        className="w-5 h-5 animate-spin"
                        strokeWidth={2}
                      />
                    ) : (
                      <Send
                        className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        strokeWidth={2}
                      />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </form>

          {/* Helper text */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <p className="text-xs text-zinc-600 font-medium">
              Press{" "}
              <kbd className="px-2.5 py-1 bg-zinc-900/70 border border-zinc-800 rounded-lg text-zinc-400 font-mono text-[11px] shadow-sm">
                Enter
              </kbd>{" "}
              to send
            </p>
            <span className="text-zinc-800">•</span>
            <p className="text-xs text-zinc-600 font-medium">
              Real-time cluster insights powered by AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
