"use client";

import { useEffect, useRef, useState } from "react";
import { useTamboThread, useTamboThreadInput } from "@tambo-ai/react";
import {
  MessageCircle,
  Terminal,
  Loader2,
  Send,
  Sparkles,
  Zap,
  Activity,
  Box,
  Database,
  Network,
  Settings,
  TrendingUp,
} from "lucide-react";

export default function ChatPage() {
  const { thread, isLoading } = useTamboThread();
  const { value, setValue, submit } = useTamboThreadInput();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  // Enhanced debugging
  useEffect(() => {
    if (thread?.messages?.length) {
      const lastMessage = thread.messages.at(-1);
      console.group("🧠 TAMBO MESSAGE DEBUG");
      console.log("Message role:", lastMessage?.role);
      console.log("Message ID:", lastMessage?.id);
      console.log("Content:", lastMessage?.content);
      console.log("Has rendered component:", !!lastMessage?.renderedComponent);
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

      // Show user-friendly error
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
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col relative overflow-hidden">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-500/5 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/3 rounded-full blur-3xl animate-pulse-slow animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <Terminal className="w-6 h-6 text-blue-400 transition-transform group-hover:scale-110 duration-300" />
              <div className="absolute inset-0 bg-blue-400 blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              Kubernetes AI Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Powered by Tambo + MCP</span>
            </div>
            <button className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="container mx-auto px-6 py-8 max-w-6xl">
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
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.05;
            transform: scale(1);
          }
          50% {
            opacity: 0.1;
            transform: scale(1.05);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thumb-slate-700::-webkit-scrollbar-thumb {
          background-color: rgb(51 65 85);
          border-radius: 3px;
        }

        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background-color: transparent;
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
      icon: <Activity className="w-6 h-6" />,
      color: "from-emerald-500/20 to-blue-500/20",
      borderColor: "hover:border-emerald-500/30",
    },
    {
      text: "Get resource usage for all namespaces",
      icon: <TrendingUp className="w-6 h-6" />,
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "hover:border-purple-500/30",
    },
    {
      text: "Monitor pod health across the cluster",
      icon: <Box className="w-6 h-6" />,
      color: "from-amber-500/20 to-orange-500/20",
      borderColor: "hover:border-amber-500/30",
    },
    {
      text: "Show all pods and their current status",
      icon: <Database className="w-6 h-6" />,
      color: "from-cyan-500/20 to-blue-500/20",
      borderColor: "hover:border-cyan-500/30",
    },
    {
      text: "Get logs for api-server pod",
      icon: <Terminal className="w-6 h-6" />,
      color: "from-blue-500/20 to-indigo-500/20",
      borderColor: "hover:border-blue-500/30",
    },
    {
      text: "List all deployments and services",
      icon: <Network className="w-6 h-6" />,
      color: "from-green-500/20 to-emerald-500/20",
      borderColor: "hover:border-green-500/30",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl rounded-full" />
        <MessageCircle className="relative w-20 h-20 text-blue-500/50" />
      </div>

      <h2 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
        Ask me about your Kubernetes cluster
      </h2>

      <p className="text-slate-400 mb-12 max-w-2xl text-lg leading-relaxed">
        I can help you monitor resources, view logs, check health, analyze
        metrics, and diagnose issues using natural language.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl w-full">
        {examples.map((example, index) => (
          <button
            key={index}
            onClick={() => onExampleClick(example.text)}
            className={`group relative px-6 py-5 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 ${example.borderColor} rounded-xl text-left transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${example.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />
            <div className="relative flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-slate-800/50 group-hover:bg-slate-800 transition-colors">
                  {example.icon}
                </div>
                <Zap className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
              </div>
              <span className="text-sm text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                {example.text}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-12 flex items-center gap-2 text-xs text-slate-500">
        <Sparkles className="w-4 h-4" />
        <span>
          Powered by AI • Real-time monitoring • Natural language interface
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

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-slide-up`}
    >
      <div
        className={`max-w-4xl ${
          isUser
            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20"
            : "bg-slate-800/80 backdrop-blur-sm text-slate-100 w-full border border-slate-700/50"
        } rounded-2xl px-6 py-4 transition-all duration-300 hover:shadow-xl ${
          isUser ? "hover:shadow-blue-500/30" : "hover:shadow-slate-700/50"
        }`}
      >
        {/* Render text content */}
        {Array.isArray(message.content) &&
          message.content.map((item: any, i: number) =>
            item.type === "text" ? (
              <p
                key={i}
                className="text-sm whitespace-pre-wrap leading-relaxed"
              >
                {item.text}
              </p>
            ) : null,
          )}

        {/* Render component if available */}
        {message.renderedComponent && (
          <div className="mt-4 animate-fade-in">
            {message.renderedComponent}
          </div>
        )}

        {/* Enhanced debug info for latest assistant message */}
        {isLatest && !isUser && (
          <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30 text-xs font-mono">
            <div className="text-slate-400 mb-2 font-semibold">
              🔍 Debug Info
            </div>
            <div className="space-y-1 text-slate-500">
              <div>
                Role: <span className="text-blue-400">{message.role}</span>
              </div>
              <div>
                Component:{" "}
                <span
                  className={
                    message.renderedComponent
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {message.renderedComponent ? "✓ Rendered" : "✗ Missing"}
                </span>
              </div>
              <div>
                Content blocks:{" "}
                <span className="text-amber-400">
                  {message.content?.length || 0}
                </span>
              </div>
              {message.content?.[0] && (
                <div>
                  First block type:{" "}
                  <span className="text-purple-400">
                    {message.content[0].type}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-3 text-slate-400 px-6 py-4 animate-slide-up">
      <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
      <div className="flex gap-1">
        <span className="text-sm">Analyzing cluster</span>
        <span className="animate-pulse">.</span>
        <span className="animate-pulse animation-delay-200">.</span>
        <span className="animate-pulse animation-delay-400">.</span>
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
    <div className="relative border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-xl z-10">
      <div className="container mx-auto px-6 py-5 max-w-4xl">
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`relative rounded-2xl transition-all duration-300 ${
              isFocused
                ? "ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20"
                : "ring-1 ring-slate-700/50"
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
              className="w-full px-5 py-4 pr-14 bg-slate-800/50 backdrop-blur-sm rounded-2xl text-white placeholder-slate-500 focus:outline-none transition-all duration-300"
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={isLoading || !value.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 hover:scale-105 disabled:scale-100 hover:shadow-lg hover:shadow-blue-500/30 group"
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
          <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-400">
            Enter
          </kbd>{" "}
          to send
        </p>
      </div>
    </div>
  );
}
