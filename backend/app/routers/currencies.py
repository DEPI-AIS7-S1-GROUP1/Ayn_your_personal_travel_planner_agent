"""Currencies router (contract §2, §4 GET /currencies)."""

from fastapi import APIRouter

router = APIRouter(tags=["currencies"])

SUPPORTED_CURRENCIES = [
    "USD", "EUR", "GBP", "JPY", "CNY", "CHF", "CAD",
    "AUD", "INR", "TRY", "EGP", "SAR", "AED", "MAD"
]


@router.get("/currencies")
def get_currencies():
    """Return list of supported currencies."""
    return {"supported": SUPPORTED_CURRENCIES}


@router.get("/currencies/default")
def get_default_currencies():
    """Return default and supported currencies (backward-compatibility)."""
    return {"default": "EGP", "supported": SUPPORTED_CURRENCIES}

