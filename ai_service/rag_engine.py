import os
import glob
import time
import requests
import numpy as np
from dotenv import load_dotenv

# LangChain Imports
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.embeddings import Embeddings

# Load environment variables from parent workspace .env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(dotenv_path=env_path)

OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
HF_TOKEN = os.getenv("HF_API_TOKEN")

HF_EMBEDDING_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

class HuggingFaceCloudEmbeddings(Embeddings):
    """
    Custom LangChain Embeddings connector that queries Hugging Face's 
    Inference API directly without needing local PyTorch or sentence-transformers downloads.
    """
    def __init__(self):
        self.headers = {}
        if HF_TOKEN:
            self.headers["Authorization"] = f"Bearer {HF_TOKEN}"

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        payload = {"inputs": texts, "options": {"wait_for_model": True}}
        try:
            response = requests.post(HF_EMBEDDING_URL, headers=self.headers, json=payload, timeout=12)
            if response.status_code == 200:
                data = response.json()
                arr = np.array(data)
                # Handle 3D token matrices: mean pool along the sequence dimension (axis 1)
                if len(arr.shape) == 3:
                    return np.mean(arr, axis=1).tolist()
                return data
            else:
                print(f"HF Inference API Error (status {response.status_code}): {response.text}")
        except Exception as e:
            print(f"Failed connecting to HF Inference endpoint: {e}")
            
        # Safe zero-vector fallback in case of local network blocks/offline mode
        return [[0.0] * 384 for _ in texts]

    def embed_query(self, text: str) -> list[float]:
        embeddings = self.embed_documents([text])
        return embeddings[0]

class RAGEngine:
    def __init__(self):
        print("Initializing LangChain RAG Engine...")
        self.chunks = []
        self.embeddings = None
        self.vector_store = None
        
        # Configure OpenRouter model through LangChain ChatOpenAI
        self.llm = ChatOpenAI(
            openai_api_key=OPENROUTER_KEY or "dummy_key",
            openai_api_base="https://openrouter.ai/api/v1",
            model="meta-llama/llama-3.1-8b-instruct:free",
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "GrowthOS"
            },
            timeout=25
        )
        
        self.index_knowledge_base()

    def index_knowledge_base(self):
        kb_path = os.path.join(os.path.dirname(__file__), 'knowledge_base')
        
        try:
            # 1. Load Markdown files using LangChain loaders
            loader = DirectoryLoader(
                kb_path, 
                glob="*.md", 
                loader_cls=TextLoader, 
                loader_kwargs={"encoding": "utf-8"}
            )
            documents = loader.load()
            
            # 2. Split documents into chunks using RecursiveCharacterTextSplitter
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            self.chunks = text_splitter.split_documents(documents)
            
            # 3. Load Custom HuggingFace Cloud Embeddings
            self.embeddings = HuggingFaceCloudEmbeddings()
            
            # 4. Initialize LangChain Vector Store
            self.vector_store = InMemoryVectorStore.from_documents(
                self.chunks,
                self.embeddings
            )
            print(f"Indexed {len(self.chunks)} document chunks using LangChain InMemoryVectorStore.")
        except Exception as e:
            print(f"Error during LangChain document ingestion: {e}")
            # Dynamic fallback empty corpus index
            self.embeddings = HuggingFaceCloudEmbeddings()
            self.vector_store = InMemoryVectorStore(self.embeddings)

    def retrieve(self, query: str, k: int = 3):
        if not self.vector_store:
            return []

        try:
            # Query the LangChain VectorStore using similarity search
            docs = self.vector_store.similarity_search(query, k=k)
            
            results = []
            for doc in docs:
                source_file = os.path.basename(doc.metadata.get("source", "unknown_source.md"))
                results.append({
                    "chunk": {
                        "source": source_file,
                        "section": source_file.replace(".md", "").replace("_", " ").title(),
                        "content": doc.page_content
                    },
                    "score": 1.0 # Default matched indicators
                })
            return results
        except Exception as e:
            print(f"LangChain semantic retrieval failed: {e}")
            return []

    def generate_rag_response(self, query: str, retrieved_context: list, user_stats: dict):
        # Format retrieval context
        context_str = ""
        for i, res in enumerate(retrieved_context):
            chunk = res["chunk"]
            context_str += f"[Context {i+1}] Source: {chunk['source']}\n{chunk['content']}\n\n"

        # Format stats context
        stats_str = (
            f"- User Title: {user_stats.get('title', 'Novice')}\n"
            f"- Level: {user_stats.get('level', 1)} | Balance: {user_stats.get('xp', 0)} XP\n"
            f"- Habit Streak: {user_stats.get('streak', 0)} days | Freezes Owned: {user_stats.get('streakFreezes', 0)}\n"
            f"- Today's Focus Duration: {user_stats.get('focusMinutes', 0)} minutes\n"
            f"- Today's Completed Habits: {user_stats.get('habitsDone', 0)} / {user_stats.get('habitsTotal', 0)}\n"
            f"- Sync Solved DSA Count: {user_stats.get('solvedDsaCount', 0)}\n"
            f"- Lagging Goal: {user_stats.get('laggingGoal', 'academic objectives')}\n"
        )

        # LangChain Prompts Template
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", (
                "You are the AI Personal Growth Coach inside GrowthOS.\n"
                "Analyze the User Query taking into account the retrieved Context chunks and the User's Active Dashboard Stats.\n"
                "Provide highly personalized, actionable advice.\n"
                "Guidelines:\n"
                "1. Reference specific details from the retrieved context.\n"
                "2. Reference the user's specific stats to motivate them.\n"
                "3. Format your response in clean markdown using headers (###), bold highlights, and checklist items.\n"
                "4. Keep it concise, energetic, and highly professional.\n\n"
                "=== RETRIEVED SEMANTIC CONTEXT ===\n{context}\n"
                "=== USER DASHBOARD STATS ===\n{stats}"
            )),
            ("human", "{query}")
        ])

        # Define LCEL execution chain
        chain = prompt_template | self.llm | StrOutputParser()

        # Call OpenRouter API through LangChain if API Key is configured
        if OPENROUTER_KEY:
            try:
                response = chain.invoke({
                    "context": context_str,
                    "stats": stats_str,
                    "query": query
                })
                return response
            except Exception as e:
                print(f"LangChain OpenRouter query execution failed: {e}")

        # Fallback local rules-based generator
        return self._generate_fallback_response(query, retrieved_context, user_stats)

    def _generate_fallback_response(self, query: str, retrieved_context: list, user_stats: dict):
        q_lower = query.lower()
        lag_goal = user_stats.get('laggingGoal', 'your targets')
        focus_mins = user_stats.get('focusMinutes', 0)
        streak = user_stats.get('streak', 0)
        
        first_section = "Study Heuristics"
        first_content = "Focus on active recall testing."
        if retrieved_context:
            first_section = retrieved_context[0]["chunk"]["section"]
            first_content = retrieved_context[0]["chunk"]["content"]

        if "study" in q_lower or "schedule" in q_lower or "planner" in q_lower or "time" in q_lower:
            return (
                f"### 📅 AI Coach: Optimized Study Plan\n\n"
                f"Based on **{first_section}** heuristics: *\"{first_content}\"*\n\n"
                f"Looking at your stats, you have **{focus_mins} focus minutes** today. Let's optimize your schedules:\n\n"
                f"*   **Focus Block Priority**: Spend your next 50-minute timeblock on **\"{lag_goal}\"** since it is currently your lowest-progress objective.\n"
                f"*   **Cognitive Rest**: Make sure you take a 5-minute break for every 25 minutes of deep focus to prevent call-stack overhead in your brain.\n\n"
                f"*(Note: Local fallback output. Check your OpenRouter key connections if you expected generative results.)*"
            )
        elif "habit" in q_lower or "streak" in q_lower or "consistency" in q_lower:
            return (
                f"### 🔥 AI Coach: Streak & Consistency Guide\n\n"
                f"Retrieving **{first_section}** insights: *\"{first_content}\"*\n\n"
                f"You are holding a **{streak}-day streak**. Today you completed **{user_stats.get('habitsDone', 0)}/{user_stats.get('habitsTotal', 0)} habits**:\n\n"
                f"*   **Habit Stacking**: Lock in your routine by performing your flashcard deck reviews right after checking your planner grids.\n"
                f"*   **Streak Rescue**: If today gets busy, make sure to check off at least one atomic habit to protect your streak.\n\n"
                f"*(Note: Local fallback output. Check your OpenRouter key connections if you expected generative results.)*"
            )
        elif "dsa" in q_lower or "code" in q_lower or "leetcode" in q_lower or "algorithm" in q_lower:
            return (
                f"### 💻 AI Coach: DSA & Algorithmic Insights\n\n"
                f"Semantic lookup on **{first_section}**: *\"{first_content}\"*\n\n"
                f"You have **{user_stats.get('solvedDsaCount', 0)} problems** synced. Here is your algorithmic path:\n\n"
                f"*   **DP tabulation**: When writing DP transitions, ensure you evaluate recursive call-stack overhead and attempt iterative tabulation with rolling space arrays.\n"
                f"*   **Shortest Paths**: Remember BFS uses queues for unweighted graphs, while Dijkstra utilizes priority queues for weighted paths.\n\n"
                f"*(Note: Local fallback output. Check your OpenRouter key connections if you expected generative results.)*"
            )
        else:
            return (
                f"### 🧠 AI Coach: Growth & Focus Advisor\n\n"
                f"Context-retrieved **{first_section}**: *\"{first_content}\"*\n\n"
                f"Hello! I am your GrowthOS Coach. Here is your daily priority index:\n\n"
                f"*   **OKR Target**: Direct focus to **\"{lag_goal}\"** to increase your level boundary.\n"
                f"*   **Focus Block**: You have logged **{focus_mins} focus minutes** today. Maintain active recall testing during your spaced deck studies.\n\n"
                f"*(Note: Local fallback output. Check your OpenRouter key connections if you expected generative results.)*"
            )
