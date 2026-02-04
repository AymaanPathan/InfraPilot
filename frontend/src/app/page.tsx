import Image from "next/image";
import {
  Activity,
  Brain,
  Command,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Terminal,
  Boxes,
  Network,
  GitBranch,
  Cpu,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="bg-neutral-100 p-4 rounded-2xl">
                <Terminal className="w-12 h-12 text-neutral-900" />
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 leading-tight">
              Kubernetes Observability,
              <br />
              <span className="bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-900 bg-clip-text text-transparent">
                Reimagined with AI
              </span>
            </h1>

            <p className="text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
              An intent-based Kubernetes dashboard that builds itself as you ask
              questions. No static UI. No kubectl commands. Just natural
              language and dynamic, AI-generated interfaces.
            </p>

            {/* Powered by Tambo Badge */}
            <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
              <Sparkles className="w-4 h-4" />
              <span>
                Powered by{" "}
                <a
                  href="https://tambo.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-neutral-900 hover:underline"
                >
                  Tambo AI
                </a>{" "}
                for Generative UI
              </span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <a
                href="/chat"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Try Live
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="https://github.com/AymaanPathan/InfraPilot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-neutral-50 text-neutral-900 border-2 border-neutral-200 rounded-xl font-medium transition-all"
              >
                <GitBranch className="w-5 h-5" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              The Problem with Current K8s Tools
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Traditional Kubernetes dashboards are broken. Here's why.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: <Boxes className="w-6 h-6" />,
                title: "Static & Overloaded",
                description:
                  "Fixed dashboards show everything at once, making it hard to find what matters.",
              },
              {
                icon: <Terminal className="w-6 h-6" />,
                title: "Steep Learning Curve",
                description:
                  "Users must learn complex kubectl commands and UI layouts before solving problems.",
              },
              {
                icon: <Network className="w-6 h-6" />,
                title: "Scattered Information",
                description:
                  "Pods, logs, events, and metrics are disconnected across multiple views.",
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: "No Intent Understanding",
                description:
                  "Existing tools don't adapt to what you're actually trying to accomplish.",
              },
            ].map((problem, i) => (
              <div
                key={i}
                className="p-6 bg-neutral-50 rounded-xl border border-neutral-200"
              >
                <div className="inline-flex p-3 bg-neutral-100 rounded-lg text-neutral-700 mb-4">
                  {problem.icon}
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  {problem.title}
                </h3>
                <p className="text-neutral-600">{problem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              A fundamentally different approach to Kubernetes observability
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Ask in Natural Language",
                description:
                  'Type what you want: "Why is payments-service crashing?" or "Show resource usage"',
                icon: <Command className="w-8 h-8" />,
              },
              {
                step: "2",
                title: "AI Selects the Right Tools",
                description:
                  "Groq AI reasons about your intent and calls Kubernetes MCP tools automatically",
                icon: <Brain className="w-8 h-8" />,
              },
              {
                step: "3",
                title: "UI Generates Dynamically",
                description:
                  "Tambo AI renders the exact interface you need—nothing more, nothing less",
                icon: <Sparkles className="w-8 h-8" />,
              },
            ].map((step, i) => (
              <div key={i} className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center text-white mx-auto">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#7FFFC3] rounded-full flex items-center justify-center text-neutral-900 font-bold text-sm">
                    {step.step}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-neutral-900">
                  {step.title}
                </h3>
                <p className="text-neutral-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Features
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Everything you need for intelligent Kubernetes monitoring
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="w-6 h-6" />,
                title: "MCP-Powered",
                description:
                  "Direct integration with Kubernetes via Model Context Protocol—no kubectl needed",
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Generative UI",
                description:
                  "Every interface is generated on-demand by Tambo AI based on your query",
              },
              {
                icon: <Brain className="w-6 h-6" />,
                title: "AI Error Analysis",
                description:
                  "Automatic detection and explanation of CrashLoopBackOff, restarts, and failures",
              },
              {
                icon: <Activity className="w-6 h-6" />,
                title: "Live Metrics",
                description:
                  "Real-time CPU, memory, and restart tracking with comparative analysis",
              },
              {
                icon: <Terminal className="w-6 h-6" />,
                title: "Smart Log Viewer",
                description:
                  "Syntax-highlighted logs with error detection and AI-powered insights",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Resource Monitoring",
                description:
                  "Cluster-wide resource usage with namespace filtering and trend analysis",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-lg transition-all"
              >
                <div className="inline-flex p-3 bg-neutral-100 rounded-lg text-neutral-700 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Built With Modern Tech
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Tambo AI", description: "Generative UI Framework" },
              { name: "Groq", description: "AI Inference" },
              { name: "MCP", description: "Tool Integration" },
              { name: "Next.js 15", description: "React Framework" },
              { name: "TypeScript", description: "Type Safety" },
              { name: "Tailwind CSS", description: "Styling" },
              { name: "Kubernetes", description: "Container Orchestration" },
              { name: "Lucide Icons", description: "UI Icons" },
            ].map((tech, i) => (
              <div
                key={i}
                className="p-6 text-center bg-neutral-50 rounded-xl border border-neutral-200"
              >
                <div className="font-semibold text-neutral-900 mb-1">
                  {tech.name}
                </div>
                <div className="text-xs text-neutral-500">
                  {tech.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Queries */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Try These Queries
            </h2>
            <p className="text-lg text-neutral-600">
              See what you can ask the AI assistant
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Show cluster overview",
              "Show all pods in error-testing namespace",
              "Show logs of crashloop-app container",
              "List pods in default namespace",
              "Monitor pod health",
              "Show resource usage",
              "Compare CPU usage of pod A and pod B",
              "Why is nginx crashing?",
              "Show events for payment-service",
              "Get logs for api-server and explain errors",
              "Show failing pods and their logs",
              "List crashing pods and explain why",
            ].map((query, i) => (
              <div
                key={i}
                className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 font-mono text-sm text-neutral-700"
              >
                {query}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Transform Your
            <br />
            Kubernetes Workflow?
          </h2>
          <p className="text-xl text-neutral-300 max-w-2xl mx-auto">
            Experience the future of Kubernetes observability with AI-powered,
            intent-based interfaces.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <a
              href="/chat"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-[#7FFFC3] hover:bg-[#72e6b0] text-neutral-900 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Try Live Demo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="https://github.com/yourusername/k8s-ai-assistant"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white rounded-xl font-semibold transition-all"
            >
              <GitBranch className="w-5 h-5" />
              View Source Code
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-neutral-900 text-neutral-400 text-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              <span>Kubernetes AI Assistant</span>
            </div>
            <div className="flex items-center gap-6">
              <span>
                Built for{" "}
                <a
                  href="https://wemakedevs.org"
                  className="text-white hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WeMakeDevs Hackathon
                </a>
              </span>
              <span>•</span>
              <span>
                Powered by{" "}
                <a
                  href="https://tambo.co"
                  className="text-white hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Tambo AI
                </a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
