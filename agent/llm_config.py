"""Groq LLM configuration for CrewAI agents.

Change this file to swap providers (e.g. openai/gpt-4o) without
touching any agent or task code.
"""

import os
import litellm
from crewai import LLM

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


def get_groq_llm(temperature: float = 0.3) -> LLM:
    """Return a CrewAI-compatible LLM backed by Groq.

    Parameters
    ----------
    temperature : float
        Lower values → more deterministic, better for JSON compliance.
        Default 0.3 balances creativity with schema accuracy.
    """
    model_name = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    if not model_name.startswith("groq/"):
        full_model = f"groq/{model_name}"
    else:
        full_model = model_name

    return LLM(
        model=full_model,
        temperature=temperature,
        max_tokens=1000,
    )
