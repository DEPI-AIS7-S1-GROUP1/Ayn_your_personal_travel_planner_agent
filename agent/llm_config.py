"""Groq LLM configuration for CrewAI agents.

Supports a multi-key architecture where each CrewAI agent uses its own
dedicated Groq API key (GROQ_API_KEY_CONTEXT, GROQ_API_KEY_SEARCH,
GROQ_API_KEY_PLANNER) to multiply free-tier quotas.  Falls back to the
shared GROQ_API_KEY when a per-agent key is absent or empty.

Change this file to swap providers (e.g. openai/gpt-4o) without
touching any agent or task code.
"""

import os
import logging
import litellm
from crewai import LLM

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Multi-key resolution
# ---------------------------------------------------------------------------

# Mapping from logical agent name → env-var name
_AGENT_KEY_ENV: dict[str, str] = {
    "context": "GROQ_API_KEY_CONTEXT",
    "search":  "GROQ_API_KEY_SEARCH",
    "planner": "GROQ_API_KEY_PLANNER",
}


def _resolve_groq_key(agent_name: str | None = None) -> str | None:
    """Return the best available Groq API key for the given agent.

    Resolution order:
    1. Per-agent key  (e.g. GROQ_API_KEY_CONTEXT) — if agent_name is given.
    2. Shared fallback key (GROQ_API_KEY).
    3. None — caller should raise or skip Groq tier.
    """
    if agent_name:
        env_var = _AGENT_KEY_ENV.get(agent_name.lower())
        if env_var:
            per_agent = os.getenv(env_var, "").strip()
            if per_agent and not per_agent.startswith("gsk_your"):
                logger.debug("Using per-agent Groq key from %s", env_var)
                return per_agent

    fallback = os.getenv("GROQ_API_KEY", "").strip()
    if fallback and not fallback.startswith("gsk_your"):
        logger.debug("Using shared GROQ_API_KEY fallback")
        return fallback

    return None


# ---------------------------------------------------------------------------
# litellm patches
# ---------------------------------------------------------------------------

# Automatically drop parameters unsupported by Groq (e.g. cache_breakpoint)
litellm.drop_params = True

# Patch litellm.completion to strip 'cache_breakpoint' and 'cache_control' from messages
_orig_completion = litellm.completion


def _clean_msgs(msgs):
    if isinstance(msgs, list):
        for m in msgs:
            if isinstance(m, dict):
                m.pop("cache_breakpoint", None)
                m.pop("cache_control", None)


def _patched_completion(*args, **kwargs):
    if "messages" in kwargs:
        _clean_msgs(kwargs["messages"])
    return _orig_completion(*args, **kwargs)


litellm.completion = _patched_completion


# ---------------------------------------------------------------------------
# Public factory
# ---------------------------------------------------------------------------

def get_groq_llm(temperature: float = 0.3, agent_name: str | None = None) -> LLM:
    """Return a CrewAI-compatible LLM backed by Groq.

    Parameters
    ----------
    temperature : float
        Lower values → more deterministic, better for JSON compliance.
        Default 0.3 balances creativity with schema accuracy.
    agent_name : str | None
        Logical agent name ("context", "search", or "planner").  When
        provided, the matching per-agent key is preferred over the shared key.
    """
    api_key = _resolve_groq_key(agent_name)
    if not api_key:
        raise ValueError(
            "No Groq API key found. Set GROQ_API_KEY (shared) or "
            f"GROQ_API_KEY_{(agent_name or 'CONTEXT').upper()} in your .env file."
        )

    model_name = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    if not model_name.startswith("groq/"):
        full_model = f"groq/{model_name}"
    else:
        full_model = model_name

    logger.debug("Creating Groq LLM: model=%s agent=%s", full_model, agent_name or "shared")

    return LLM(
        model=full_model,
        api_key=api_key,
        temperature=temperature,
        max_tokens=1000,
    )
