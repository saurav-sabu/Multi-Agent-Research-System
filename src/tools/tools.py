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
    search_tool = TavilySearch(max_results=3)  # fix: was max_result (typo)
    result = search_tool.invoke(query)

    out = []
    for r in result["results"]:
        out.append(
            f"Title: {r['title']}\n"       # fix: use single quotes inside f-string
            f"URL: {r['url']}\n"           # fix: missing space after "URL:"
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

    # fix: endpoint url was overwriting the `url` parameter
    endpoint = f"https://production-sfo.browserless.io/scrape?token={api_key}"

    payload = {
        "url": url,               # fix: was hardcoded to "https://example.com"
        "formats": ["markdown"]
    }

    response = requests.post(endpoint, json=payload)
    response.raise_for_status()   # raise early on 4xx/5xx instead of silently failing

    return response.json()