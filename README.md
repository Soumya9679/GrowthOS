# 🚀 GrowthOS

GrowthOS is a gamified, self-improvement productivity dashboard designed to optimize your study habits, track deep work focus blocks, and sync competitive programming totals. It features an integrated **AI Growth Coach** powered by a serverless **LangChain & Pinecone RAG microservice** to provide contextual, data-driven daily advice.

---

## 🌟 Key Features

### 1. 🧠 AI Growth Coach (RAG Pipeline)
*   **LangChain LCEL**: Structured execution chains connecting prompts, OpenAI model integrations, and output parsers.
*   **Pinecone Vector Database**: Persistent multi-tenant vector storage mapping user documents (notes and journals) with `userId` metadata filter queries.
*   **Hugging Face Cloud Inference**: Direct REST-based embedding generation (`sentence-transformers/all-MiniLM-L6-v2`) without local PyTorch dependencies.
*   **OpenRouter Integration**: Generates context-aware, personalized advice utilizing the meta-llama Llama-3.1 model.

### 🔄 2. Real-Time Search Synchronization
*   Next.js Server Actions automatically trigger background vector updates to `/api/index` and `/api/delete` in the Python microservice when you save journals, notes, or checklists.

### 💻 3. Competitive Programming Tracker
*   Queries public platforms (**LeetCode**, **Codeforces**, **GeeksforGeeks**) in real-time to calculate aggregate solved problem statistics.
*   Awards **+25 XP** dynamically for every newly resolved question since the last sync.

### 🎮 4. Gamification Engine
*   Includes daily habit trackers, OKR goal setting, a vertical vertical timeline planner with Glowing Clocks, Pomodoro focus timers, XP level-up thresholds, and Streak Freezes.

---

## 🛠️ Technology Stack

*   **Frontend**: Next.js, React, TailwindCSS, Prisma, Auth.js.
*   **Backend**: Python, FastAPI, Uvicorn, LangChain Core, Pinecone, Requests, NumPy.
*   **Databases**: PostgreSQL (Production) / SQLite (Local development), Pinecone (Vector Index).

---

## ⚙️ Environment Variables (`.env`)

Configure the following variables in your root `.env` file:

```env
# Database Connections
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Session Security
AUTH_SECRET="your_32_character_session_key"
NEXTAUTH_URL="http://localhost:3000"

# External API Keys
OPENROUTER_API_KEY="your_openrouter_api_key"
HF_API_TOKEN="your_hugging_face_token"

# Pinecone Credentials
PINECONE_API_KEY="your_pinecone_api_key"
PINECONE_INDEX_NAME="growthos"

# RAG Integration URL
PYTHON_RAG_SERVICE_URL="http://127.0.0.1:8000"
```

---

## 🚀 Local Installation & Execution

### 1. Run the Next.js Frontend
```bash
# Install packages
npm install

# Run database setup
npx prisma db push

# Launch Next.js dev server
npm run dev
```

### 2. Run the Python AI Service
The service runs locally on port `8000`. You can launch it using either PowerShell or Docker:

#### Method A: Using PowerShell (Autodetects virtual environment)
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-ai.ps1
```

#### Method B: Using Docker
```bash
cd ai_service
docker build -t growthos-ai .
docker run -d -p 8000:8000 --env-file ../.env --name growthos-ai-instance growthos-ai
```

---

## ☁️ Deployment Strategy

### 1. Python RAG Microservice (Render)
1. Create a new **Web Service** on Render.
2. Select **Docker** (or **Python**).
3. Set the **Root Directory** to `ai_service`.
4. Configure your `.env` variables (`PINECONE_API_KEY`, `OPENROUTER_API_KEY`, etc.) under the *Advanced* section.
5. Deploy! Render will build the container and provide you with a public endpoint URL (e.g. `https://growthos-rsxo.onrender.com`).

### 2. Next.js Web App (Vercel)
1. Create a new project on Vercel.
2. Configure your environment variables, mapping `PYTHON_RAG_SERVICE_URL` to your deployed Render service endpoint.
3. Deploy!
