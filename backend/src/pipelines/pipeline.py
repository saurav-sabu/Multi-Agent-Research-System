from src.agents.agents import build_search_agent, build_scrape_agent, writer_chain, critic_chain

def research_pipeline(topic:str):

    state = {}

    print(f"Starting research pipeline for topic: {topic}\n")
    print("Step 1: Searching the web for information...")
    print("=" * 50)

    search_agent = build_search_agent()
    search_result = search_agent.invoke({
        "messages":[("user", f"Search the web for information about: {topic}")]
    })

    state["search_result"] = search_result["messages"][-1].content
    print(f"Search results:\n{state['search_result']}\n")

    print("Step 2: Scraping content from top URLs...")
    print("=" * 50)

    scrape_agent = build_scrape_agent()
    scrape_result = scrape_agent.invoke({
        "messages":[("user", f"Scrape the following URLs for information about {topic}:\n Pick the most relevant URLs from the search results and scrape their content.\n\n Search Results:\n{state['search_result'][:800]}")]
    })

    state["scrape_result"] = scrape_result["messages"][-1].content
    print(f"Scraped content:\n{state['scrape_result']}\n")

    print("Step 3: Writing the article...")
    print("=" * 50)

    research_combined = f"Search Results:\n{state['search_result']}\n\nScraped Content:\n{state['scrape_result']}"

    state["article"] = writer_chain.invoke({
        "topic": topic,
        "information": research_combined
    })

    print(f"Generated Article:\n{state['article']}\n")

    print("Step 4: Critiquing the article...")
    print("=" * 50)

    state["critique"] = critic_chain.invoke({
        "article": state["article"],
        "information": research_combined
    })

    print(f"Critique:\n{state['critique']}\n")

    return state