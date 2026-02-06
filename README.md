# ✅ CLI → App Converter (Kubernetes Edition)

<div align="center">

<img width="3780" height="1890" alt="infra" src="https://github.com/user-attachments/assets/b25d8765-3a92-4208-b4c5-85e74d1e88ec" />

**🚀 Interactive Kubernetes Dashboard Generator powered by Generative UI**

[![Built with Tambo](https://img.shields.io/badge/Built%20with-Tambo%20AI-blue)](https://tambo.co)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Powered-326CE5)](https://kubernetes.io/)

*A hackathon project for "The UI Strikes Back" by WeMakeDevs*


</div>

---

## 🧠 The Problem

Kubernetes observability today is **broken**:

- ❌ Dashboards are static and overloaded
- ❌ Users must learn the UI before solving problems  
- ❌ Information is scattered (pods, logs, events, metrics)
- ❌ Existing tools don't adapt to user intent

**👉 This project replaces static dashboards with an AI-driven, intent-based UI.**

---

## 💡 The Solution

Instead of a fixed Kubernetes dashboard, the app **starts empty** and builds the UI dynamically based on what you ask — using natural language, Generative UI, and tools.

### ✨ Core Concept
```
User describes intent → AI selects K8s tools → Tambo renders exact UI needed
```

**There is no dashboard by default. The UI only exists when you ask for it.**

---

## 🎯 Features

### ✅ Completed Features

- [x] Kubernetes container management
- [x] Real-time container metrics (CPU, memory usage)
- [x] Dynamic UI rendering based on user intent
- [x] Create new containers on-demand
- [x] Live error logs with AI explanations
- [x] AI-powered pod analysis
- [x] Responsive landing page
- [x] Metrics visualization
- [x] Pod comparison tools
- [x] AI-powered "Fix It" suggestions
- [x] Pod health monitoring

### 🔥 Key Capabilities

- **Natural Language Interface** - Ask questions in plain English
- **Generative UI** - Interface builds itself based on your needs
- **Real-time Monitoring** - Live logs and metrics
- **AI Error Analysis** - Understand why pods are failing
- **Smart Comparisons** - Compare resource usage across pods
- **Intent-Based Design** - No pre-built dashboards, only what you need

---

## 🎬 Landing

<img width="1897" height="796" alt="tambo-ai-home" src="https://github.com/user-attachments/assets/02d2050d-a882-496a-8ebc-26174097e9e7" />

### Example Commands
```bash
# View cluster resources
"Show cluster overview"
"Show memory and CPU usage"

# Pod management
"List pods in error-testing namespace"
"Show all pods in default namespace"
"Show pods that need attention"

# Monitoring & Health
"Monitor pod health"
"Track pod status in kube-system"
"Show resource usage"

# Debugging
"Show logs of payment-service container"
"Why is db-error-app-6488467855-lg8v5 failing?"
"Explain these errors"

# Comparisons
"Compare CPU and memory of payment-service vs billing-service"
"Compare CPU of pod-a, pod-b, and pod-c"
```

---


<img width="1911" height="847" alt="tambo-ai-chat" src="https://github.com/user-attachments/assets/6701ee54-88fe-46e6-957f-cf119574671e" />

---

## 🚀 Installation

### Prerequisites

- Node.js 18+
- Kubernetes cluster (local or remote)
- kubectl configured
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/AymaanPathan/InfraPilot.git
cd InfraPilot/backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your actual API keys and configuration

# Start the backend server
npm run dev
```

The backend will run on `http://localhost:8000` (or your configured port).

### Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local and add your Tambo API key

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see InfraPilot in action.
---

## 📖 Usage

### How It Works

1. **Start the app** → Empty canvas with chat interface
2. **Type your intent** → Natural language command
3. **AI processes** → Groq AI reasons about your intent
4. **Tools execute** → Kubernetes MCP tools fetch data
5. **UI renders** → Tambo generates the exact interface you need

### Demo Flow
```
1. "list pods in error-testing namespace"
   → Shows pod list with status indicators

2. "compare logs of payment-service and billing-service"
   → Renders side-by-side log viewer

3. "explain these errors"
   → AI analyzes logs and provides insights

4. "show resource usage"
   → Displays CPU/memory charts

5. "monitor pod health"
   → Real-time health dashboard appears

6. "show pods that need attention"
   → Filtered view of problematic pods
```

---

## 🏗️ Architecture
```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │ Natural Language
       ▼
┌─────────────┐
│  Next.js    │
│  Frontend   │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   Groq AI   │◄────►│  Tambo UI    │
│  Reasoning  │      │  Generator   │
└──────┬──────┘      └──────────────┘
       │
       ▼
┌─────────────┐
│     K8s     │
│   Tools     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Kubernetes  │
│   Cluster   │
└─────────────┘
```

---



---
## 📧 Contact

**Aymaan Pathan** - www.linkedin.com/in/pathan-aymaan


---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ for better Kubernetes observability

</div>

---
