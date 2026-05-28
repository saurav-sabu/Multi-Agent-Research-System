from langchain.agents import create_agent
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from src.tools.tools import web_search, scrape_url
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------

model = ChatAnthropic(model="claude-haiku-4-5-20251001",temperature=0.7)

# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------

def build_search_agent():
    """Agent responsible for searching the web for information on a topic."""
    return create_agent(model=model, tools=[web_search],system_prompt="You are giving title, url and snippet of the search result. Pick the most relevant URLs to scrape content from.")


def build_scrape_agent():
    """Agent responsible for scraping content from a given URL."""
    return create_agent(model=model, tools=[scrape_url])

# ---------------------------------------------------------------------------
# Writer
# ---------------------------------------------------------------------------

writer_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are an expert journalist and content writer. Your writing is clear, \
engaging, and well-structured. When writing articles:
- Open with a compelling hook that draws the reader in
- Present information in a logical, flowing narrative
- Use specific facts, quotes, and data from the provided research
- Maintain a neutral, authoritative tone unless instructed otherwise
- Close with a meaningful conclusion or forward-looking insight
- Never fabricate information not present in the provided sources"""
    ),
    (
        "human",
        """Write a comprehensive article about: {topic}

Research and sources:
{information}

Format the article with a title, introduction, body sections with subheadings, and a conclusion."""
    ),
])

# Pipe: prompt → model → plain string output
writer_chain = writer_prompt | model | StrOutputParser()

# ---------------------------------------------------------------------------
# Critic
# ---------------------------------------------------------------------------

_CRITIC_RUBRIC = """Scoring rubric:
- Accuracy   (3pts): Are all claims supported by the research?
- Clarity    (3pts): Is the writing clear, coherent, and well-structured?
- Completeness (2pts): Are key points from the research covered?
- Engagement (2pts): Is the opening compelling and the conclusion meaningful?"""

_CRITIC_FORMAT = """Always structure your response exactly as follows:

SCORE: <integer from 1 to 10>

STRENGTHS:
- <strength>
- <strength>

AREAS TO IMPROVE:
- <actionable suggestion>
- <actionable suggestion>

VERDICT: <one sentence summary>"""

critic_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        f"""You are a meticulous editor and critic. \
Evaluate articles strictly against the provided research.

{_CRITIC_FORMAT}

{_CRITIC_RUBRIC}"""
    ),
    (
        "human",
        """Article:
{article}

Research and sources:
{information}

Evaluate the article using the structure above."""
    ),
])

# Pipe: prompt → model → plain string output
critic_chain = critic_prompt | model | StrOutputParser()