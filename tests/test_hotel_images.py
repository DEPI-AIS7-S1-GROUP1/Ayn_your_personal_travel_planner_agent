"""Hotel card photos from Wikimedia Commons (lookups faked: no network in tests)."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from agent.tools import hotel_images
from agent.tools.hotel_images import add_hotel_photos, needs_photo

# What Commons returns for "Hilton Dahab ..." and for "hotel Dahab Egypt".
COMMONS = {
    "hilton dahab": [{"title": "File:Hilton Hotel, Dahab - panoramio.jpg", "url": "https://img/hilton.jpg"}],
    "hotel dahab egypt": [
        {"title": "File:Hilton Hotel, Dahab - panoramio.jpg", "url": "https://img/hilton.jpg"},
        {"title": "File:Dahab Plaza Hotel - panoramio.jpg", "url": "https://img/plaza.jpg"},
        {"title": "File:Swiss Inn Dahab pool.jpg", "url": "https://img/swiss.jpg"},
    ],
    "dahab egypt": [
        {"title": "File:Dahab Plaza Hotel - panoramio.jpg", "url": "https://img/plaza.jpg"},
        {"title": "File:Dahab Lighthouse beach.jpg", "url": "https://img/beach.jpg"},
        {"title": "File:Dahab promenade at night.jpg", "url": "https://img/promenade.jpg"},
    ],
    "dahab sea view resort": [{"title": "File:CIMG2805 Red Sea Anemonefish.jpg", "url": "https://img/fish.jpg"}],
}


def fake_commons(query, limit=8):
    return COMMONS.get(query.casefold(), [])


def hotels(*names, url="https://example.com/hot_001.jpg"):
    return [SimpleNamespace(name=n, image_url=url) for n in names]


class HotelPhotoTests(unittest.TestCase):
    def setUp(self):
        patches = [
            patch.dict(os.environ, {"HOTEL_PHOTOS": "on"}),
            patch.object(hotel_images, "commons_photos", side_effect=fake_commons),
            patch.object(hotel_images, "city_photo", return_value="https://img/dahab-city.jpg"),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def test_made_up_and_missing_links_need_a_photo(self):
        for url in ("", None, "/images/hotels/placeholder-1.jpg", "https://example.com/hot_001.jpg"):
            self.assertTrue(needs_photo(url), url)
        self.assertFalse(needs_photo("https://upload.wikimedia.org/x.jpg"))

    def test_each_hotel_gets_its_own_photo_and_never_another_hotels(self):
        cards = hotels("Hilton Dahab Resort", "Swiss Inn Resort Dahab", "Le Meridien Dahab Resort")
        self.assertEqual(add_hotel_photos(cards, "Dahab"), 3)
        hilton, swiss, meridien = (c.image_url for c in cards)
        self.assertEqual(hilton, "https://img/hilton.jpg")   # found by its name
        self.assertEqual(swiss, "https://img/swiss.jpg")     # named in the city list
        self.assertEqual(meridien, "https://img/beach.jpg")  # the area, never another hotel (Plaza)
        self.assertEqual(len({hilton, swiss, meridien}), 3)

    def test_one_shared_word_is_not_a_match(self):
        cards = hotels("Dahab Sea View Resort", "Desert Oasis Hotel")
        add_hotel_photos(cards, "Dahab")
        urls = [c.image_url for c in cards]
        self.assertNotIn("https://img/fish.jpg", urls)  # "Red Sea Anemonefish" shares only "sea"
        self.assertNotIn("https://img/hilton.jpg", urls)
        self.assertEqual(urls, ["https://img/beach.jpg", "https://img/promenade.jpg"])

    def test_city_photo_when_commons_has_nothing(self):
        cards = hotels("Adrere Amellal")
        add_hotel_photos(cards, "Siwa")
        self.assertEqual(cards[0].image_url, "https://img/dahab-city.jpg")

    def test_real_photos_are_kept(self):
        cards = hotels("Hilton Dahab Resort", url="https://upload.wikimedia.org/own.jpg")
        self.assertEqual(add_hotel_photos(cards, "Dahab"), 0)
        self.assertEqual(cards[0].image_url, "https://upload.wikimedia.org/own.jpg")

    def test_failures_keep_the_placeholder(self):
        with patch.object(hotel_images, "commons_photos", side_effect=RuntimeError("429")), \
                patch.object(hotel_images, "city_photo", side_effect=RuntimeError("down")):
            cards = hotels("Hilton Dahab Resort")
            self.assertEqual(add_hotel_photos(cards, "Dahab"), 0)
        self.assertEqual(cards[0].image_url, "https://example.com/hot_001.jpg")

    def test_switch_off(self):
        with patch.dict(os.environ, {"HOTEL_PHOTOS": "off"}):
            self.assertEqual(add_hotel_photos(hotels("Hilton Dahab Resort"), "Dahab"), 0)


if __name__ == "__main__":
    unittest.main()
