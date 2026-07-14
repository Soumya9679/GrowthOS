import os
import glob
import time
import requests
import numpy as np
from dotenv import load_dotenv

# Pinecone Imports
from pinecone import Pinecone, ServerlessSpec

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
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "growthos")

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
        
        # Retry loop for network warmup / DNS resolution latency on Render
        for attempt in range(3):
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
                    print(f"HF Inference API (Attempt {attempt+1}/3) status {response.status_code}: {response.text}")
            except Exception as e:
                print(f"HF Inference endpoint connection attempt {attempt+1}/3 failed: {e}")
            
            # Brief backoff before next attempt
            if attempt < 2:
                time.sleep(1.5)
            
        # Safe non-zero fallback vector (Pinecone throws 400 error on all-zero vectors)
        fallback_vec = [0.0] * 384
        fallback_vec[0] = 1e-5
        return [fallback_vec for _ in texts]

    def embed_query(self, text: str) -> list[float]:
        embeddings = self.embed_documents([text])
        return embeddings[0]

class RAGEngine:
    def __init__(self):
        print("Initializing LangChain RAG Engine...")
        self.chunks = []
        self.embeddings = HuggingFaceCloudEmbeddings()
        self.vector_store = None
        self.pc = None
        self.index = None
        self.use_pinecone = False
        
        # Connect to Pinecone if API Key is configured
        if PINECONE_API_KEY:
            try:
                self.pc = Pinecone(api_key=PINECONE_API_KEY)
                # Auto-initialize serverless index if missing
                existing_indexes = [idx.name for idx in self.pc.list_indexes()]
                if PINECONE_INDEX_NAME not in existing_indexes:
                    print(f"Creating Pinecone Index '{PINECONE_INDEX_NAME}' (384 Dimensions)...")
                    self.pc.create_index(
                        name=PINECONE_INDEX_NAME,
                        dimension=384,
                        metric="cosine",
                        spec=ServerlessSpec(cloud="aws", region="us-east-1")
                    )
                self.index = self.pc.Index(PINECONE_INDEX_NAME)
                self.use_pinecone = True
                print(f"Linked successfully to Pinecone Index: {PINECONE_INDEX_NAME}")
            except Exception as e:
                print(f"Pinecone startup failed, falling back to Local Vector Store: {e}")

        # Configure OpenRouter model through LangChain ChatOpenAI
        self.llm = ChatOpenAI(
            openai_api_key=OPENROUTER_KEY or "dummy_key",
            openai_api_base="https://openrouter.ai/api/v1",
            model="tencent/hy3:free",
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
            
            # 3. Synchronize Global knowledge chunks to Pinecone or Local Store
            if self.use_pinecone:
                print("Synchronizing global knowledge base documents to Pinecone index...")
                vectors_to_upsert = []
                for i, doc in enumerate(self.chunks):
                    source_file = os.path.basename(doc.metadata.get("source", "unknown_source.md"))
                    vector = self.embeddings.embed_query(doc.page_content)
                    
                    # Idempotent global chunk ID
                    chunk_id = f"global_chunk_{i}"
                    vectors_to_upsert.append((
                        chunk_id,
                        vector,
                        {
                            "userId": "global",
                            "category": "global",
                            "content": doc.page_content,
                            "source": source_file
                        }
                    ))
                
                # Perform batch upsert
                if vectors_to_upsert:
                    self.index.upsert(vectors=vectors_to_upsert)
                print(f"Indexed {len(vectors_to_upsert)} global chunks in Pinecone.")
            else:
                # Local In-Memory Fallback Vector Store
                self.vector_store = InMemoryVectorStore.from_documents(
                    self.chunks,
                    self.embeddings
                )
                print(f"Indexed {len(self.chunks)} document chunks using LangChain InMemoryVectorStore.")
        except Exception as e:
            print(f"Error during LangChain document ingestion: {e}")
            if not self.use_pinecone:
                self.vector_store = InMemoryVectorStore(self.embeddings)

    def upsert_user_document(self, userId: str, docId: str, category: str, content: str):
        """
        Dynamically indexes or updates user-specific logs (notes, journals, tasks) in Pinecone.
        """
        if not self.use_pinecone:
            print("Ignoring document upsert: Pinecone database is not configured.")
            return False

        try:
            print(f"Upserting user vector for user '{userId}', category '{category}', ID '{docId}'...")
            vector = self.embeddings.embed_query(content)
            self.index.upsert(vectors=[(
                docId,
                vector,
                {
                    "userId": userId,
                    "category": category,
                    "content": content,
                    "source": f"{category}_log.md"
                }
            )])
            return True
        except Exception as e:
            print(f"Failed to upsert user document {docId} in Pinecone: {e}")
            return False

    def delete_user_document(self, docId: str):
        """
        Deletes a user-specific document from the Pinecone vector index.
        """
        if not self.use_pinecone:
            return False

        try:
            print(f"Deleting user vector ID '{docId}' from Pinecone...")
            self.index.delete(ids=[docId])
            return True
        except Exception as e:
            print(f"Failed to delete document {docId} from Pinecone: {e}")
            return False

    def retrieve(self, query: str, userId: str = "global", k: int = 3):
        try:
            # 1. Retrieve using Pinecone Index (with userId metadata filtration)
            if self.use_pinecone:
                query_vector = self.embeddings.embed_query(query)
                
                # Multi-tenant search: retrieve global guides OR active user specific logs
                meta_filter = {
                    "userId": {"$in": ["global", userId]}
                }
                
                response = self.index.query(
                    vector=query_vector,
                    top_k=k,
                    include_metadata=True,
                    filter=meta_filter
                )
                
                results = []
                for match in response.get("matches", []):
                    metadata = match.get("metadata", {})
                    results.append({
                        "chunk": {
                            "source": metadata.get("source", "unknown_source.md"),
                            "section": metadata.get("category", "Context").title(),
                            "content": metadata.get("content", "")
                        },
                        "score": float(match.get("score", 1.0))
                    })
                return results
                
            # 2. Retrieve using local InMemory Vector Store fallback
            else:
                if not self.vector_store:
                    return []
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
                        "score": 1.0
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
                f"*(Note: Local fallback output. Check your OpenRouter/Pinecone key connections if you expected generative results.)*"
            )
        elif "habit" in q_lower or "streak" in q_lower or "consistency" in q_lower:
            return (
                f"### 🔥 AI Coach: Streak & Consistency Guide\n\n"
                f"Retrieving **{first_section}** insights: *\"{first_content}\"*\n\n"
                f"You are holding a **{streak}-day streak**. Today you completed **{user_stats.get('habitsDone', 0)}/{user_stats.get('habitsTotal', 0)} habits**:\n\n"
                f"*   **Habit Stacking**: Lock in your routine by performing your flashcard deck reviews right after checking your planner grids.\n"
                f"*   **Streak Rescue**: If today gets busy, make sure to check off at least one atomic habit to protect your streak.\n\n"
                f"*(Note: Local fallback output. Check your OpenRouter/Pinecone key connections if you expected generative results.)*"
            )
        elif "dsa" in q_lower or "code" in q_lower or "leetcode" in q_lower or "algorithm" in q_lower:
            return (
                f"### 💻 AI Coach: DSA & Algorithmic Insights\n\n"
                f"Semantic lookup on **{first_section}**: *\"{first_content}\"*\n\n"
                f"You have **{user_stats.get('solvedDsaCount', 0)} problems** synced. Here is your algorithmic path:\n\n"
                f"*   **DP tabulation**: When writing DP transitions, ensure you evaluate recursive call-stack overhead and attempt iterative tabulation with rolling space arrays.\n"
                f"*   **Shortest Paths**: Remember BFS uses queues for unweighted graphs, while Dijkstra utilizes priority queues for weighted paths.\n\n"
                f"*(Note: Local fallback output. Check your OpenRouter/Pinecone key connections if you expected generative results.)*"
            )
        else:
            return (
                f"### 🧠 AI Coach: Growth & Focus Advisor\n\n"
                f"Context-retrieved **{first_section}**: *\"{first_content}\"*\n\n"
                f"Hello! I am your GrowthOS Coach. Here is your daily priority index:\n\n"
                f"*   **OKR Target**: Direct focus to **\"{lag_goal}\"** to increase your level boundary.\n"
                f"*   **Focus Block**: You have logged **{focus_mins} focus minutes** today. Maintain active recall testing during your spaced deck studies.\n\n"
                f"*(Note: Local fallback output. Check your OpenRouter/Pinecone key connections if you expected generative results.)*"
            )
