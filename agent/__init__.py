"""Personal Travel Planner — Agent Layer.

3-agent CrewAI pipeline with 3-tier fallback:
  Tier 1: CrewAI (Context Parser → Destination Searcher → Itinerary Planner)
  Tier 2: Direct Groq SDK
  Tier 3: Deterministic mock builder
"""
