"""Turns a user's past rating feedback into one sentence for the agent prompts."""


def feedback_text(profile: dict) -> str:
    fb = profile.get("past_feedback") or {}
    liked = ", ".join(fb.get("liked", [])) or "nothing recorded"
    disliked = ", ".join(fb.get("disliked", [])) or "nothing recorded"
    return (
        f"On past trips the user liked: {liked}. "
        f"They disliked: {disliked}. "
        "Avoid what they disliked and favor what they liked."
    )