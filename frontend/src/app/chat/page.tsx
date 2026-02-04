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

export default function ChatPage() {
  const { thread, isLoading } = useTamboThread();
  const { value, setValue, submit } = useTamboThreadInput();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (thread?.messages?.length) {
      const lastMessage = thread.messages.at(-1);
      console.group("🧠 TAMBO MESSAGE DEBUG");
      console.log("Message role:", lastMessage?.role);
      console.log("Message ID:", lastMessage?.id);
      console.log("Content:", lastMessage?.content);
      console.log("Has rendered component:", !!lastMessage?.renderedComponent);

      if (lastMessage?.content) {
        const hasExplanation = lastMessage.content.some(
          (c: any) => c.type === "tool_result" && c.content?.explanation,
        );
        console.log("Has explanation:", hasExplanation);
      }

      if (lastMessage?.renderedComponent) {
        console.log(
          "Component type:",
          lastMessage.renderedComponent?.type?.name ||
            typeof lastMessage.renderedComponent,
        );
      }
      console.log("Full message object:", lastMessage);
      console.groupEnd();
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

    console.group("📤 SENDING MESSAGE");
    console.log("Input:", input);
    console.log("Thread ID:", thread?.id);
    console.log("Message count before:", thread?.messages?.length);
    console.groupEnd();

    try {
      await submit({
        streamResponse: true,
        forceToolChoice: "infra_command",
      });

      console.log("✅ Submit successful");
    } catch (err: any) {
      console.group("🚨 TAMBO SUBMISSION ERROR");
      console.error("Error type:", err?.constructor?.name);
      console.error("Message:", err?.message);
      console.error("Full error:", err);

      if (err?.cause) {
        console.error("Cause:", err.cause);
      }

      if (err?.response) {
        console.error("Response:", err.response);
        try {
          const responseText = await err.response.text();
          console.error("Response body:", responseText);
        } catch (e) {
          console.error("Could not read response body");
        }
      }

      if (err?.stack) {
        console.error("Stack trace:", err.stack);
      }

      console.error("Thread state at error:", {
        threadId: thread?.id,
        messageCount: thread?.messages?.length,
        lastMessage: thread?.messages?.at(-1),
      });

      console.groupEnd();

      alert(
        `Error: ${err?.message || "Unknown error occurred"}. Check console for details.`,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">
      {/* Modern Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-lg opacity-20" />
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl">
                <Command className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Kubernetes Assistant
              </h1>
              <p className="text-xs text-slate-500">
                AI-powered cluster management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">
                AI-Powered
              </span>
            </div>
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
              <Activity className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
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
          background: #cbd5e1;
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
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
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
    },
    {
      text: "Get resource usage for all namespaces",
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-50 to-purple-50",
    },
    {
      text: "Monitor pod health across the cluster",
      icon: <Box className="w-5 h-5" />,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50",
    },
    {
      text: "Show all pods and their current status",
      icon: <Database className="w-5 h-5" />,
      gradient: "from-cyan-500 to-blue-500",
      bgGradient: "from-cyan-50 to-blue-50",
    },
    {
      text: "Get logs for api-server pod",
      icon: <Command className="w-5 h-5" />,
      gradient: "from-blue-500 to-indigo-500",
      bgGradient: "from-blue-50 to-indigo-50",
    },
    {
      text: "List all deployments and services",
      icon: <Network className="w-5 h-5" />,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] text-center animate-fadeIn">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 blur-3xl rounded-full animate-pulse" />
        <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl shadow-xl">
          <MessageCircle className="w-12 h-12 text-white" />
        </div>
      </div>

      <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
        Welcome to your Kubernetes Assistant
      </h2>

      <p className="text-slate-600 mb-12 max-w-2xl text-lg leading-relaxed">
        Ask me anything about your cluster. I can monitor resources, view logs,
        check health, analyze metrics,{" "}
        <span className="font-semibold text-blue-600">
          and explain what's wrong
        </span>{" "}
        using AI.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl w-full">
        {examples.map((example, index) => (
          <button
            key={index}
            onClick={() => onExampleClick(example.text)}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${example.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />
            <div className="relative flex flex-col gap-4">
              <div
                className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${example.gradient} shadow-sm`}
              >
                <div className="text-white">{example.icon}</div>
              </div>
              <span className="text-sm text-slate-700 leading-relaxed font-medium">
                {example.text}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 flex items-center gap-2 text-xs text-slate-400">
        <Sparkles className="w-4 h-4" />
        <span>
          Powered by AI • Real-time monitoring • Automatic issue detection
        </span>
      </div>
    </div>
  );
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

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-slideUp`}
    >
      <div
        className={`max-w-4xl ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
            : "bg-white border border-slate-200 text-slate-900 w-full shadow-sm"
        } rounded-2xl px-6 py-4 transition-all duration-300`}
      >
        {/* Render text content */}
        {Array.isArray(message.content) &&
          message.content.map((item: any, i: number) =>
            item.type === "text" ? (
              <p
                key={i}
                className={`text-sm whitespace-pre-wrap leading-relaxed ${isUser ? "text-white" : "text-slate-700"}`}
              >
                {item.text}
              </p>
            ) : null,
          )}

        {/* Render component if available */}
        {message.renderedComponent && (
          <div className="mt-4 animate-fadeIn">{message.renderedComponent}</div>
        )}

        {/* Render AI explanation if available */}
        {explanation && !isUser && (
          <div className="mt-6 animate-fadeIn">
            <div className="flex items-center gap-2 mb-3 text-sm text-blue-600">
              <Brain className="w-4 h-4" />
              <span className="font-semibold">
                {autoExplained ? "AI Auto-Analysis" : "AI Explanation"}
              </span>
            </div>
            <ExplanationDisplay
              explanation={explanation}
              type="info"
              showIcon={false}
              className="bg-blue-50 border-blue-200"
            />
          </div>
        )}

        {/* Debug info for development */}
        {isLatest && !isUser && process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono">
            <div className="text-slate-600 mb-2 font-semibold">
              🔍 Debug Info
            </div>
            <div className="space-y-1 text-slate-500">
              <div>
                Role: <span className="text-blue-600">{message.role}</span>
              </div>
              <div>
                Component:{" "}
                <span
                  className={
                    message.renderedComponent
                      ? "text-emerald-600"
                      : "text-red-600"
                  }
                >
                  {message.renderedComponent ? "✓ Rendered" : "✗ Missing"}
                </span>
              </div>
              <div>
                Explanation:{" "}
                <span
                  className={
                    explanation ? "text-emerald-600" : "text-slate-400"
                  }
                >
                  {explanation ? "✓ Present" : "✗ None"}
                </span>
              </div>
              <div>
                Content blocks:{" "}
                <span className="text-amber-600">
                  {message.content?.length || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-3 text-slate-600 px-6 py-4 animate-slideUp">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
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
    <div className="border-t border-slate-200 bg-white/80 backdrop-blur-xl sticky bottom-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-5">
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`relative rounded-2xl transition-all duration-300 ${
              isFocused
                ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/10"
                : "ring-1 ring-slate-200"
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
              className="w-full px-5 py-4 pr-14 bg-white rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none transition-all duration-300"
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !value.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 hover:scale-105 disabled:scale-100 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 group"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-slate-500 mt-3 text-center">
          Press{" "}
          <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono">
            Enter
          </kbd>{" "}
          to send • AI will auto-explain issues
        </p>
      </div>
    </div>
  );
}
