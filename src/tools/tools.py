import os
import requests
from dotenv import load_dotenv
from langchain_tavily import TavilySearch
from langchain.tools import tool

load_dotenv()

# ---------------------------------------------------------------------------
# Web Search
# ---------------------------------------------------------------------------

@tool
def web_search(query: str) -> str:
    """Search the web for a query and return titles, URLs, and snippets."""
    search_tool = TavilySearch(max_results=3)  
    result = search_tool.invoke(query)

    out = []
    for r in result["results"]:
        out.append(
            f"Title: {r['title']}\n"       
            f"URL: {r['url']}\n"           
            f"Snippet: {r['content'][:300]}\n"
        )

    return "\n----\n".join(out)

# ---------------------------------------------------------------------------
# Scraper
# ---------------------------------------------------------------------------

@tool
def scrape_url(url: str) -> str:
    """Scrape the content of a URL and return it as markdown."""
    api_key = os.getenv("BROWSERLESS_API_KEY")
    if not api_key:
        raise ValueError("BROWSERLESS_API_KEY is not set in environment variables.")

    
    endpoint = f"https://production-sfo.browserless.io/smart-scrape?token={api_key}"

    payload = {
        "url": url,               
        "formats": ["markdown"]
    }

    response = requests.post(endpoint, json=payload)
    response.raise_for_status()  

    markdown_content = response.json().get("markdown", "")
    # Truncate content to avoid exceeding context window limits
    max_chars = 60000
    if len(markdown_content) > max_chars:
        markdown_content = markdown_content[:max_chars] + "\n\n...[TRUNCATED due to length limits]..."
    return markdown_content