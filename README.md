# 🚀 QuickMove — AI Relocation Operations Hub

[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688.svg?style=flat&logo=FastAPI&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Groq AI](https://img.shields.io/badge/AI-Groq_%2F_Llama_3.3_70B-f05032.svg?style=flat)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**QuickMove** is an enterprise-grade, full-stack AI-powered operations platform designed to streamline end-to-end relocation operations. It features automated AI workflow generation, real-time risk detection, intelligent task management, intelligent query assistant via Groq (Llama 3.3 70B), vendor tracking, and operational analytics.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture & AI Engine](#-architecture--ai-engine)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Docker Compose Setup (Alternative)](#3-docker-compose-setup-alternative)
- [Environment Variables](#-environment-variables)
- [Demo Data](#-demo-data)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [License](#-license)

---

## ✨ Key Features

- 📊 **Executive Dashboard**: Live operational metrics, daily priority summaries, system health alerts, and instant actionable recommendations.
- 🤖 **AI Workflow Generator**: Automatically generates 20+ custom, milestone-based tasks per relocation move tailored to move distance, origin/destination, and special requirements.
- ⚡ **AI Assistant Engine**: Powered by Groq LLM (`llama-3.3-70b-versatile`) with context-aware database RAG to answer queries like *"Which moves in Mumbai are at risk?"*.
- 🚨 **Automated Risk Engine**: Continuous detection of operational bottlenecks, vendor delay predictions, missing documents, and overdue tasks.
- 📋 **Kanban Board**: Drag-and-drop task status updates (`Pending`, `In Progress`, `Blocked`, `Completed`) with real-time backend state updates.
- 📅 **Interactive Timeline**: Visual milestone tracking with color-coded operational events and status indicators.
- 🚚 **Vendor Management**: Performance tracking, quality rating scores, vehicle allocation, and partner contact directories.
- 🔍 **Global Search (Spotlight)**: Press `Ctrl+K` to search across customers, cities, tasks, and vendors instantly.
- 📑 **Document Center**: Multi-file document upload and validation per customer relocation file.
- 🎨 **Modern Design System**: Built with Tailwind CSS, warm slate + beige aesthetics, dark/light theme switching, and smooth micro-animations.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS, Lucide Icons
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **UI Drag & Drop**: `@dnd-kit/core` & `@dnd-kit/sortable`
- **Charts**: Recharts

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite with SQLAlchemy ORM & Pydantic V2 schemas
- **AI Integration**: Groq API (`llama-3.3-70b-versatile`) with graceful fallback to mock rule-based engine
- **Production Server**: Uvicorn / Gunicorn

### Infrastructure & Deployment
- **Containers**: Docker & Docker Compose
- **Web Server**: Nginx (Frontend static hosting & API reverse proxy)

---

## 🧠 Architecture & AI Engine

QuickMove uses a hybrid AI architecture:

```
                  ┌──────────────────────────────┐
                  │    React + Vite Frontend     │
                  └──────────────┬───────────────┘
                                 │ HTTP / REST API
                                 ▼
                  ┌──────────────────────────────┐
                  │       FastAPI Backend        │
                  └──────┬───────────────┬───────┘
                         │               │
      SQLAlchemy ORM     │               │ AI Agent Engine
                         ▼               ▼
                  ┌────────────┐   ┌───────────────────────────┐
                  │ SQLite DB  │   │ Groq API (Llama-3.3-70b)  │
                  └────────────┘   │ (Fallback: Rule Engine)   │
                                   └───────────────────────────┘
```

1. **Context-Aware LLM Agent**: Queries the database in real-time, compiles relevant context, and sends structured prompts to Groq LLM for natural language operational queries.
2. **Automated Risk Scoring**: Runs rule-based and AI heuristic checks against upcoming moves to raise warning alerts for operations executives.
3. **Workflow Synthesizer**: Generates localized relocation checklists based on origin city, destination city, housing type, and vehicle requirements.

---

## 📂 Project Structure

```
quickmove/
├── backend/
│   ├── main.py              # FastAPI app setup & API endpoints
│   ├── database.py          # SQLAlchemy engine & session config
│   ├── models.py            # ORM Database models
│   ├── schemas.py           # Pydantic validation schemas
│   ├── services.py          # Core business logic & risk detection
│   ├── agent_engine.py      # Groq AI LLM integration & prompt pipeline
│   ├── seed.py              # Comprehensive demo dataset generator
│   ├── Dockerfile           # Backend container build script
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Template environment variables
│   └── uploads/             # Customer document storage
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Root routing & layout
│   │   ├── main.tsx         # React app entry point
│   │   ├── index.css        # Tailwind design system & global styles
│   │   ├── types/index.ts   # TypeScript interfaces & types
│   │   ├── lib/api.ts       # Axios/Fetch API client layer
│   │   ├── lib/utils.ts     # Formatting & calculation utilities
│   │   ├── stores/          # Zustand global state stores
│   │   ├── pages/           # Dashboard, Kanban, Customer, Vendor views
│   │   └── components/      # UI components, Modals, Search overlays
│   ├── Dockerfile           # Frontend static container build script
│   ├── nginx.conf           # Nginx reverse proxy configuration
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docker-compose.yml       # Production multi-container orchestra
├── DEPLOYMENT_GUIDE.md      # Step-by-step production deployment instructions
├── USER_GUIDE.md            # Operations manual & workflow guide
└── README.md                # Project documentation
```

---

## ⚡ Prerequisites

Before getting started, ensure you have installed:
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **Python**: `v3.10` or higher
- *(Optional)* **Docker & Docker Compose** (for containerized deployment)

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and add your Groq API key (optional)
cp .env.example .env

# Seed the database with demo data (50 customers, 20 vendors, 200+ tasks)
python seed.py

# Start backend server
uvicorn main:app --reload --port 8000
```
Backend API interactive documentation will be available at **`http://localhost:8000/docs`**.

---

### 2. Frontend Setup

In a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

### 3. Docker Compose Setup (Alternative)

To spin up both frontend and backend in production-ready Docker containers with a single command:

```bash
# Set your environment variable
export GROQ_API_KEY="your_groq_api_key"

# Build and run containers
docker-compose up -d --build
```
- **Frontend App**: `http://localhost`
- **Backend API**: `http://localhost:8000/docs`

---

## 🔑 Environment Variables

### Backend Environment Variables (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | No | `sqlite:///./quickmove.db` | Database connection URI |
| `GROQ_API_KEY` | Optional | `""` | API key from [Groq Console](https://console.groq.com/keys). If blank, fallback mock engine is used. |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Model family override |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `/api` (or `http://localhost:8000/api`) | Base API endpoint |

---

## 📦 Demo Data Overview

Running `python seed.py` populates QuickMove with real-world simulated operational data:
- **50 Customer Relocation Files**: Spanning 14 major Indian tech hubs (Bengaluru, Mumbai, Delhi-NCR, Pune, Hyderabad, Chennai, etc.).
- **20 Verified Logistics Vendors**: Categorized into Packers & Movers, IT setup specialists, vehicle transport, and housing partners with performance scores.
- **200+ Operational Tasks**: Distributed across intake, packing, transit, unloading, and post-move setup stages.
- **Activity & Risk Log Entries**: Simulated past events and urgent alerts for risk testing.

---

## 🌐 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/customers` | List all customers with search & filter |
| `POST` | `/api/customers` | Create new customer & auto-generate workflow |
| `GET` | `/api/customers/{id}` | Retrieve customer detail, tasks & documents |
| `GET` | `/api/tasks` | Filterable operational task list |
| `GET` | `/api/tasks/kanban` | Grouped task structure for Kanban board |
| `PUT` | `/api/tasks/{id}/status` | Update task status (Drag-and-Drop) |
| `GET` / `POST` | `/api/vendors` | List or register vendor partners |
| `POST` | `/api/documents` | Upload relocation file documents |
| `GET` | `/api/analytics` | High-level operations analytics & charts data |
| `POST` | `/api/ai/chat` | AI Query Assistant endpoint |
| `GET` | `/api/ai/daily-summary` | Real-time daily priorities & alerts |
| `GET` | `/api/ai/risks` | System-wide risk assessment matrix |
| `GET` | `/api/search?q=` | Global multi-entity search endpoint |

---

## 📖 User & Deployment Guides

- **User Guide**: Detailed operational walkthroughs for operations teams can be found in [USER_GUIDE.md](USER_GUIDE.md).
- **Deployment Guide**: Production deployment instructions for Render, Railway, Vercel, and Cloud VPS in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
