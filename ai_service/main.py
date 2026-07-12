from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
from rag_engine import RAGEngine
import uvicorn

app = FastAPI(title="GrowthOS AI RAG Service")

# Allow CORS for Next.js app communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RAG engine instance
rag_engine = None

@app.on_event("startup")
def startup_event():
    global rag_engine
    try:
        rag_engine = RAGEngine()
    except Exception as e:
        print(f"Failed to start RAG Engine: {e}")

class QueryRequest(BaseModel):
    query: str
    user_stats: Dict[str, Any]

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "engine_ready": rag_engine is not None,
        "knowledge_base_chunks": len(rag_engine.chunks) if rag_engine else 0
    }

@app.post("/api/query")
def query_rag(request: QueryRequest):
    global rag_engine
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG Engine is not initialized or downloading model.")

    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")

    try:
        # 1. Retrieve top 3 semantically relevant chunks
        retrieved = rag_engine.retrieve(request.query, k=3)
        
        # 2. Generate RAG Response
        response_text = rag_engine.generate_rag_response(
            query=request.query,
            retrieved_context=retrieved,
            user_stats=request.user_stats
        )

        # 3. Compile source citations for transparency
        citations = []
        for r in retrieved:
            citations.append({
                "source": r["chunk"]["source"],
                "section": r["chunk"]["section"],
                "score": r["score"]
            })

        return {
            "response": response_text,
            "citations": citations
        }
    except Exception as e:
        print(f"Error during query execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
