import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from src.pipelines.pipeline import research_pipeline

# Load env variables at startup
load_dotenv()

app = FastAPI(
    title="Multi-Agent Research System API",
    description="API for running the multi-agent research pipeline using LangChain agents.",
    version="1.0.0"
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
    return {"status": "healthy", "service": "Multi-Agent Research System API"}

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
