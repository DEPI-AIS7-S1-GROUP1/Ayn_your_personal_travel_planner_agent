# DESIGN.md: Ayn (Personal Travel Planner)

Visual identity and component rules. The AI coding agent must follow this file exactly. If a value is not here, ask the team leader; do not invent one.

Status: DRAFT v4.1 for team approval by Oct 8. Items marked **[CONFIRM]** are still open (list in section 8). Light theme only for the MVP. English interface only.

Data shapes come from `docs/api-contract.md` and `mock-data/`.

---

## 1. Brand and feel

**Name:** Ayn, with the Arabic "أين" shown beside it ("where?"). **Wordmark:** orange map pin, then "Ayn" in Bricolage Grotesque 800 (primary blue), then "أين" in Cairo 800 (muted). No plane, no swoosh or underline curve (it resembles another brand's logo).
**Tagline:** "Just tell us where. We'll cover the rest."

**References (the team likes both):** a Georgian tourism landing page (warm terracotta display type on cream, dusty teal panels, arch-shaped photo cards, mountain silhouettes) and a Korean eco-travel site (soft sky bands, clouds, small illustrated people, friendly rounded sections). Take the feel, not the layouts.

Feel traits:
1. **Friendly and illustrated.** Small flat people, clouds and simple scenes make pages feel alive.
2. **Warm Egypt.** Cream, terracotta, sand, Nile blue and palm green. Arch shapes echo Egyptian and Islamic architecture.
3. **Chunky and playful.** 2px outlines, rounded corners, a flat offset under the main button.
4. **Still clear.** Forms and data (budget, timeline) stay plain and readable.

---

## 2. Home page (landing)

Order from top to bottom:
1. **Navbar** (section 5.1) with the profile icon at the top right.
2. **Hero slider**, 440px tall, full width, 4 to 6 slides of Egypt (pyramids, Nile, Red Sea coast, Luxor temples). Auto-advance every 4s with a 600ms fade, pause on hover, no auto-advance under `prefers-reduced-motion`. A caption pill at the bottom right names the place. A white card on the left (2px outline, radius 20px) holds the H1 "Where to in Egypt? Ayn knows.", one muted line, and a primary button "Start planning".
3. **About Ayn:** H2 "About Ayn", two or three short paragraphs (what Ayn means, that it learns who you are, builds a day-by-day plan around taste and budget), with two or three small people illustrations beside it.
4. **Features:** four arch cards in a row (2 on tablet, 1 on mobile): "Made for you", "A budget that adds up", "Chat to change it", "Take it with you". Each has an arch image on top, an H3 and one muted line.
5. **Call to action band** (sky background, clouds, people): H2 "Is Egypt your next destination?" and a toggle switch (section 5.5). When the toggle is on, show the primary button "Start the survey".

Images: slides use real photos once the team has them. Until then use the flat illustrated scenes from the preview page. All slides need a 2:1 crop that works at 1440 and 390 wide.

---

## 3. Tokens

CSS variables on `:root`. Components use token names only.

### 3.1 Color

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#F5EFE6` | Page background (warm sand) |
| `--color-surface` | `#FCFAF6` | Cards, inputs |
| `--color-text` | `#2B2118` | Body text, outlines |
| `--color-text-muted` | `#7A6A5A` | Labels, captions |
| `--color-border` | `#E0D5C4` | Card, input and divider borders |
| `--color-primary` | `#1F5F8B` | The only action color |
| `--color-primary-hover` | `#184B6F` | Hover |
| `--color-on-primary` | `#FCFAF6` | Text on primary |
| `--color-sky` | `#CFE3E8` | Hero bands, chat replies, active nav link |
| `--color-cloud` | `#FFFFFF` | Cloud illustrations |
| `--color-terracotta` | `#B5472F` | Large headings on sky bands (24px or bigger only), map fill |
| `--color-sun` | `#F5A623` | Pin, avatar, small highlights. Never used for text |
| `--color-green` | `#2F6B4A` | Success, confirmed |
| `--color-brown` | `#7A5232` | Neutral accent |
| `--color-error` | `#A8403A` | Errors, over budget |

Budget chart ramp: hotel `#1F5F8B`, food `#2F6B4A`, activities `#7A5232`, transport `#8DB7D1` (tokens `--chart-hotel`, `--chart-food`, `--chart-activities`, `--chart-transport`).

Rules: blue is the only action color on a screen. Text contrast at least 4.5:1 (terracotta on sky is only allowed for 24px or larger text). Meaning is never carried by color alone.

### 3.2 Typography

| Role | Font | Weights |
|---|---|---|
| Headings, wordmark | **Bricolage Grotesque** | 600, 800 |
| Body, UI, numbers | **Nunito** | 400, 600, 700 |
| Arabic wordmark only | **Cairo** | 800 |

| Style | Size / line height (px) | Weight |
|---|---|---|
| H1 | 48 / 52 (mobile 36 / 40), letter-spacing -0.02em | 800 |
| H2 | 28 / 36 | 600 |
| H3 | 20 / 28 | 600 |
| Body | 16 / 24 | 400 |
| Label / UI | 14 / 20 | 600 |
| Small | 14 / 20 | 400 |
| Caption | 12 / 16, uppercase, letter-spacing 0.06em | 600 |

Money and dates use `font-variant-numeric: tabular-nums`. Never more than these three fonts, and Cairo only in the wordmark.

### 3.3 Spacing

Scale (px): `4, 8, 12, 16, 24, 32, 48, 64` as `--space-1` to `--space-8`. Use only these.

- Page container: max width 1120px, side padding 24px (16px mobile).
- Form pages (survey, trip form, rating): single column, max width 560px, centered.
- Section gap 48px. Field gap 24px. Gap inside a card 16px.
- Breakpoints: 640px and 1024px.

### 3.4 Borders, radius, elevation

- Cards, inputs, chips: 2px solid `--color-border`. Emphasis outlines (destination box, avatar, primary button): 2px solid `--color-text`.
- Radius: inputs 8px, buttons and chips 12px, cards 20px, arch images `999px 999px 16px 16px`.
- No soft or blurred shadows anywhere. The only shadow allowed is the flat offset under a primary button: `box-shadow: 0 3px 0 var(--color-text)`.
- Focus ring on every interactive element: 2px solid `--color-primary`, 2px offset.

### 3.5 Icons and imagery

- Icons: Lucide, 20px, stroke 1.5, muted (primary when selected). No emoji, no filled icons except the map pin.
- Category icons: `hotel` = BedDouble, `food` = Utensils, `activities` = Compass, `transport` = CarTaxiFront. Flights use `Plane`.
- Photos: real photographs for hotels (`image_url`) and home slides. No filters, no text on top of photos.

### 3.6 Illustration kit

- **People:** small flat figures (about 48 x 77px) with simple shapes: round head, rounded body, two legs. Three variants: hat, backpack, camera. Colors only from the tokens plus skin tones. They stand on the bottom edge of sky bands or sit beside text. Never over text, never more than 3 per band, never photos of real people.
- **Clouds:** white rounded blobs (circles plus a rounded base), 100 to 210px wide, 2 or 3 per sky band, never animated more than a slow drift.
- **Arch:** the arch shape is used for feature cards and hotel images.
- **Scenes (placeholders):** flat illustrations of pyramids, Nile with a sailboat, Red Sea coast, Luxor columns.
- **Egypt map:** a static flat outline of Egypt (terracotta 22% fill, 1.5px terracotta stroke), with no pins, labels or interaction. The shape in the preview page is approximate; replace it with a proper outline from a public-domain source (for example Natural Earth).

## 4. Components

Each lists: purpose, anatomy, sizes, tokens, states, data mapping, and a "never" line.

### 4.1 Button
- **Variants:** primary (fill `--color-primary`, text `--color-on-primary`), secondary (transparent, 1px `--color-border`, text `--color-text`), text (no border, primary text, low-priority like "Remove").
- **Size:** height 44px, padding 0 20px, radius 12px, 2px border, Nunito 14/20 weight 600. Full width on mobile in forms.
- **States:** hover = `--color-primary-hover` fill (secondary: border `--color-text`); focus = focus ring; disabled = 40% opacity; loading = label replaced by a short "Working..." text, button disabled.
- **Destructive** (Cancel plan): secondary variant with `--color-error` text. Never a filled red button.
- **Never:** gradients, blurred shadows, glow, uppercase labels, icon-only primary buttons. Primary has the flat offset from 3.4.

### 4.2 Input (text, number, date, select, textarea)
- **Anatomy:** label above (14/20, weight 600), control, optional helper (12/16 muted), error text (12/16 `--color-error`).
- **Size:** height 44px (textarea min 112px), padding 12px 16px, 2px border, radius 8px, fill `--color-surface`.
- **States:** hover = border `--color-text-muted`; focus = border `--color-primary` plus focus ring; error = border `--color-error` plus error text; disabled = 40% opacity.
- **Fields from the contract:** email, password (min 8, show/hide as text button); destination city and country; start and end date (show live trip length, error over 14 days); total budget (whole numbers, thousands separator on blur); currency select (prefilled from `GET /currencies/default`); `liked_last_trip` and `disliked_last_trip` (textarea, optional).
- **Never:** placeholder as label, floating labels, unstyled native date pickers.

### 4.3 Chip (multi-select and tag input)
For `personality` (pick 1 to 3 of 7), `hobbies` (1 or more of 12), `dietary_limits` (6, optional), and free-text `food_likes` / `food_dislikes` (max 10 each, removable tags).
- **Size:** height 36px, padding 0 16px, radius 8px, Nunito 14/20 weight 600, 2px border.
- **States:** unselected = surface with border; selected = 1px `--color-primary` border, primary text, 8% primary tint background, 16px Check icon; disabled (limit reached) = 40% opacity.
- **Labels:** friendly labels from the contract table (`landmark-loving` shows "Landmark lover"), never the hyphenated value.
- **Tag input:** Enter adds a chip with an X icon; counter "3 / 10".
- Chips wrap, gap 8px.
- **Never:** emoji, checkbox lists, pill radius.

### 4.4 Segmented choice
One option from 2 to 5 short options. Replaces radios and sliders.
- **Anatomy:** one row, equal-width options, 1px outer border, 1px dividers, radius 8px on the group.
- **Size:** height 44px, Nunito 14/20 weight 600, centered.
- **States:** selected = fill `--color-primary`, text `--color-on-primary`; hover = 6% primary tint; focus ring on the option; arrow keys move selection.
- **Used for:** rating score (1 to 5, caption "1 = poor, 5 = excellent"), plan view switch, time slot (3 options).
- More than 5 options or long labels: use a select.
- **Never:** sliders, star emoji, radio circles, two-line labels.

### 4.5 Stepper (travelers)
`travelers` is an integer 1 to 10. Minus button, value, plus button; 44px tall, 2px border, radius 8px, tabular numbers. Buttons disable at 1 and 10. **Never** a slider.

### 4.6 Picture card (hotels)
Only hotels have images (`hotels[].image_url`).
- **Anatomy:** image in an arch shape (4:3, `object-fit: cover`, `border-radius: 999px 999px 16px 16px`, 2px outline), body padding 16px: name (H3), area and stars (Nunito 14/20 muted; 5 small Lucide Star icons with the filled count = `stars`), details (14/20, max 2 lines), price row: `total_price` (16 weight 600) with the per-night price as small muted text.
- **Size:** grid 3 columns desktop, 1 mobile, gap 24px. 2px border, radius 20px, `--color-surface`, no shadow.
- **States:** selected (`selected_hotel_id`) = 2px `--color-primary` border and a "Selected" label (Check icon + text); hover = border `--color-text-muted`. The whole card is one button.
- **Missing image:** flat `--color-border` block, 4:3. Never a broken-image icon.
- **Never:** shadows, gradient overlays, text on photos, hover zoom or lift.

### 4.7 Flight row
Flights have no image.
- **Anatomy:** one bordered row (radius 20px). Left: `Plane` icon, airline (16 weight 600), `details` (14 muted). Middle: outbound and return as "CAI 08:30 to SSH 09:45" with date (times are local). Right: `price` (return, whole group) and a Select button.
- **Selected:** same as picture card.
- **Never:** airline logos, plane emoji.

### 4.8 Budget stacked bar
Shows `total_budget` split across `hotel`, `food`, `activities`, `transport`.
- **Anatomy:** header (H3 "Budget", total at the end: "EGP 60,000"), the bar, a 4-row legend.
- **Bar:** 12px high, full width, proportional segments in `--chart-*` colors, 2px gaps in `--color-bg`, outer ends radius 6px. No labels inside.
- **Legend row:** 12px swatch (radius 3px), category name, amount at the end (tabular), percentage muted.
- **Planned vs allocated (recommended):** under each row, muted 12/16 "Planned 8,100 of 12,000" (sum of that category's `estimated_cost`). Hotel's real cost comes from the selected hotel; transport includes the flight.
- **Edit mode:** each amount becomes a number input. A live line shows "Remaining: X". The contract requires the four amounts to sum to `total_budget` exactly, so Save is disabled until Remaining is 0. 0 shows in `--color-green`; otherwise `--color-error` with text ("Over by 2,000" / "2,000 left to assign").
- **Never:** pie or donut, 3D, gradients, sliders, labels inside the bar.

### 4.9 Day timeline card
One day of `itinerary`.
- **Header:** "Day 1" (H3), date muted ("Tue 10 Nov 2026"), day total at the end (sum of `estimated_cost`, computed in the frontend; not in the API).
- **Body:** a 1px vertical line (`--color-border`) on the left side with an 8px dot per slot group.
- **Slot groups:** caption "MORNING" / "AFTERNOON" / "EVENING". Show only slots that have activities. The data has slots, not clock times, so **never show clock times**.
- **Activity row:** category icon (20px), title (Nunito 16/24 weight 600), description (14/20 muted, up to 3 lines), cost at the end.
- **Cost:** "EGP 5,600" (code, space, thousands separator, no decimals). `estimated_cost` 0: hotel category shows nothing; other categories show "Free". Add once at the top of the plan view: "Prices are for all travelers".
- **Size:** 2px border, radius 20px, `--color-surface`, padding 24px, 24px between slot groups, 16px between activities, 24px between cards.
- **Edit mode:** each row gets text buttons "Edit" and "Remove"; the day gets an "Add activity" secondary button. Edit is inline: title, description, time slot (segmented), cost (number), category (select).
- **Never:** clock times, per-activity photos, colored category badges, shadows, nested cards.

### 4.10 Page states
- **Generating screen** (`POST /trips` stays open for seconds): centered H2 "Building your plan", one muted line, thin 2px indeterminate line in `--color-primary` at the top of the card. No spinners or chat bubbles. On `502 GENERATION_FAILED`: inline message and a "Try again" button.
- **Errors:** field errors under the field. Page-level errors as a bordered panel with `--color-error` text and a 1px error border on the left side. Never a filled red banner.
- **Status label** (draft / confirmed / cancelled): small text with a Lucide icon, no filled badge. Confirmed uses `--color-green`.

---

## 5. Navigation, pages and flow

### 5.1 Navbar and profile
Surface background, 2px bottom border, content max 1120px. Left: wordmark. Center: links "Home", "About", "Features", "Your trips" (pill, 8px 16px, bold; active = `--color-sky` background and primary text). Right: round profile icon, 42px, `--color-sun` fill, 2px `--color-text` outline, the user's first initial. Clicking it opens a menu: "My profile" (the survey in edit mode, `PUT /profile`), "Your trips", "Log out". Logged-out users see "Log in" and "Sign up" instead. On mobile the links move into a menu button.

### 5.2 Full flow
1. Home, then Sign up / Log in (skip if logged in).
2. **Survey** (first time only, `onboarding_completed` false).
3. **Destination:** hero with the big destination box and a card below. The card has the static Egypt map on the left and the details (dates, budget, currency, travelers) on the right. One search box must fill both `city` and `country`.
4. **Generating** (`POST /trips`).
5. **Options:** hotels and flights (4.6 and 4.7).
6. **Draft:** itinerary with edit controls, budget edit and the chat panel (5.3). Plan view layout: day cards on the left, chat then budget on the right.
7. **Confirm** (`POST /plans/{id}/confirm`), then the **Confirmed** screen with export (5.4).
8. **Rating** (`POST /ratings`, only for confirmed plans, once).
9. **My trips** (5.6). A trip appears here as soon as its draft is generated, not after rating.

### 5.3 Chat panel (draft screen)
Card titled "Ask Ayn to change it" with a small person illustration. Messages: the user's in a primary-blue bubble aligned to the end, Ayn's in a sky bubble (radius 16px, 4px on the corner nearest the sender, text 14/20, max 90% width). Below, an input "Describe a change" and a primary "Send" button. While Ayn works show "Updating your plan..." and disable Send. When Ayn changes the plan, the day cards and the budget update and the budget keeps adding up to `total_budget`. Manual editing stays available. The panel only exists on draft plans. It is an AI feature and not the main interface, so no avatars or typing animations.

### 5.4 Confirmed screen and export
Sky hero with people, title "Your trip is confirmed", trip name and dates. A card "Take it with you" with a primary "Save to phone" button (downloads a PDF of the plan) and a secondary "Add to calendar" (an .ics file). Below, a card "After your trip" with a secondary "Rate your trip". A text link "View my trips".

### 5.5 Toggle switch
56 x 32px track, 2px outline, thumb 22px white. On = primary track, thumb at the end. Label before and after ("Not yet" and "Yes, take me to Ayn"). Keyboard: Space toggles. Never use a toggle for anything except the home page call to action.

### 5.6 My trips
Header band "Your trips". A grid (3 columns, 1 on mobile) of text cards from `GET /trips`: destination (H3), country, dates and travelers, total budget, status label, and a rating line: "Rated" if `rated` is true, "Rate this trip" (text button) only if status is `confirmed` and not rated, nothing otherwise. The list has no score, so no stars. **Empty state (new user):** a small person illustration, H2 "No trips yet", a muted line, primary button "Plan your first trip".

---

## 6. Screens (Figma and preview checklist)

| Screen | Contents |
|---|---|
| Home | Navbar, slider hero, About, Features arches, toggle CTA |
| Survey (also "My profile") | Sky hero with people, chips, tag inputs, textareas |
| Destination | Hero with big destination box, Egypt map, details card |
| Options | Hotel arch cards (3), flight rows (2), Continue |
| Draft + chat | Day cards in edit mode, chat panel, budget edit, Save, Confirm |
| Confirmed | Export buttons, rate link |
| Rating | Segmented 1 to 5, tag inputs, comment |
| My trips | Trip cards and empty state |

Also required by the contract and described in text only: Sign up, Log in, Generating, error states (`PROFILE_REQUIRED`, `GENERATION_FAILED`, validation), cancelled plan (read-only).

---

## 7. Never-do list

- No neon, gradients, glow, glassmorphism or blurred shadows.
- No emoji as icons. No plane or swoosh in the logo.
- No unstyled native sliders, radios, checkboxes or date pickers.
- No colors outside this file. Blue is the only action color on a screen. Sun orange is never text.
- No pie or donut charts. No pins or labels on the Egypt map.
- No real photos of people. No people illustrations over text.
- No hover lift, zoom or bounce. Allowed motion: 150ms color transitions, the slider fade, slow cloud drift.
- No chat interface anywhere except the draft chat panel.

---

## 8. Decisions and contract impact

**Confirmed (Oct 6):**
1. **Egypt only.** Destinations are Egyptian cities only. `destination.country` must be `"Egypt"`, the default currency is `EGP`, and the static Egypt map is used on the Destination screen. The mock data must cover several Egyptian cities, not only Sharm El Sheikh.
2. **Chat refine.** The team adds `POST /plans/{id}/refine` to the contract. Request `{ "message": string }` (max 500 characters). Response `{ "reply": string, "changed": boolean, "plan": Plan }`. Draft plans only. The returned plan must keep the budget rules (`budget_split` sums to `total_budget`, `currency` and `total_budget` unchanged). Errors: `400 VALIDATION_ERROR`, `401`, `404`, `409 PLAN_NOT_EDITABLE`, `502 GENERATION_FAILED`. Chat history is not stored by the server; the frontend keeps messages on screen only. It is a Should-have: cut it if the MVP is not stable by Oct 13.
3. **Rename** the project to Ayn in the README, repo description and docs.

**Still open [CONFIRM]:**
1. **Supported cities.** The list is not decided. Suggested: Cairo, Alexandria, Luxor, Aswan, Sharm El Sheikh, Hurghada, Dahab. It depends on what the agent and mock data cover.
2. **Export.** Not in the README scope. Proposal (Should-have): PDF and .ics generated in the frontend, no API change.
3. **Assets needed:** home slider photos, hotel photos (`/images/hotels/...`), a proper Egypt outline SVG (Natural Earth or similar).
4. **Destination search:** one box must fill both `city` and `country` (autocomplete from the supported cities), or use two fields. With Egypt only, `country` can be fixed and only the city is chosen.

---

## 9. Change log

| Date | Change | By |
|---|---|---|
| 2026-10-05 | v1 to v3: base system, Rihla branding, English only | Manal |
| 2026-10-06 | v4: renamed to Ayn, home page, illustration kit, arches, static Egypt map, chat panel, export, My trips flow, new palette additions | Manal |
| 2026-10-06 | v4.1: Egypt-only confirmed, chat refine endpoint confirmed, open decisions updated | Manal |
