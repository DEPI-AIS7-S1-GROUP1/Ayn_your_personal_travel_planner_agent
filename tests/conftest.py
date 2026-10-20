import os

# Hotel photos come from Wikimedia, which needs no key: tests never call it.
os.environ["HOTEL_PHOTOS"] = "off"
