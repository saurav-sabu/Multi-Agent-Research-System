import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from src.pipelines.pipeline import research_pipeline

# Load env variables at startup
load_dotenv()

app = FastAPI(
    title="ScribeFlow API",
    description="Multi-agent automated research and content generation system using LangChain agents.",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str

class ResearchResponse(BaseModel):
    search_result: str
    scrape_result: str
    article: str
    critique: str

@app.get("/")
def read_root():
    """Health check / root endpoint."""
    return {"status": "healthy", "service": "ScribeFlow API"}

@app.post("/api/research", response_model=ResearchResponse)
def run_research(request: ResearchRequest):
    """Run the complete multi-agent research pipeline for the given topic."""
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")
    try:
        result = research_pipeline(request.topic)
        return ResearchResponse(
            search_result=result.get("search_result", ""),
            scrape_result=result.get("scrape_result", ""),
            article=result.get("article", ""),
            critique=result.get("critique", "")
        )
    except Exception as e:
        print(f"Error running pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))
