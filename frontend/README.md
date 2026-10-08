# Ayn — Frontend

React + Vite frontend for the Ayn travel planner. All visual rules follow [`DESIGN.md`](../DESIGN.md).

## Stack

| Dependency | Version | Role |
|---|---|---|
| React | 19.2 | UI library |
| Vite | 8.3 | Build tool and dev server |
| Lucide React | 1.53 | Icon set (20 px, stroke 1.5) |
| ESLint | 10 | Linting (react-hooks, react-refresh plugins) |

Styling is vanilla CSS with custom properties. No CSS framework. Fonts are loaded via Google Fonts in `index.html`:

- **Bricolage Grotesque** 600, 800 — headings and wordmark
- **Nunito** 400, 600, 700 — body text, UI, and numbers
- **Cairo** 800 — Arabic wordmark only

## Project Structure

```
frontend/
├── index.html               # Google Fonts preconnect, entry point
├── vite.config.js            # React plugin only, no custom config
├── package.json
├── eslint.config.js
├── public/
└── src/
    ├── main.jsx              # Root mount
    ├── index.css             # CSS custom properties (design tokens)
    ├── App.jsx               # Layout shell, state-based routing
    ├── App.css
    ├── components/
    │   ├── index.js          # Barrel export for all components
    │   ├── Button/
    │   ├── Input/
    │   ├── SegmentedChoice/
    │   ├── PictureCard/
    │   ├── BudgetStackedBar/
    │   ├── DayTimelineCard/
    │   ├── ToggleSwitch/
    │   ├── FeatureArchCard/
    │   ├── Illustration/
    │   ├── Navbar/
    │   └── Footer/
    └── pages/
        ├── Home/
        └── ComponentsTest/
```

Every component folder contains `ComponentName.jsx`, `ComponentName.css`, and `index.js`.

## Design System

`DESIGN.md` is the single source of truth. The design system is implemented in `src/index.css` as CSS custom properties on `:root`.

### Tokens

**Colors** — 12 semantic tokens (`--color-bg`, `--color-surface`, `--color-primary`, `--color-terracotta`, etc.) plus 4 chart-specific tokens (`--chart-hotel`, `--chart-food`, `--chart-activities`, `--chart-transport`). Blue (`--color-primary`) is the only action color. Sun orange is never used for text.

**Spacing** — 8-step scale: `--space-1` (4 px) through `--space-8` (64 px).

**Typography** — `--font-heading`, `--font-body`, `--font-arabic`. Global heading styles set size, line-height, and weight for `h1`–`h3`. Money and dates use `.tabular-nums` (`font-variant-numeric: tabular-nums`).

**Borders & Radius** — `--radius-input` (8 px), `--radius-button` (12 px), `--radius-card` (20 px), `--radius-arch` (999 px 999 px 16 px 16 px). All component borders are 2 px solid `--color-border`.

**Shadows** — Only one allowed: `--btn-shadow: 0 3px 0 var(--color-text)` on primary buttons. No blurred or soft shadows anywhere.

**Focus** — Every interactive element: `outline: 2px solid var(--color-primary); outline-offset: 2px`.

**Motion** — 150 ms color transitions only. No hover lift, zoom, or bounce.

## Components

All components are exported from `src/components/index.js`:

```jsx
import { Button, Input, PictureCard } from './components';
```

| Component | DESIGN.md | Props / Purpose |
|---|---|---|
| `Button` | §4.1 | `variant` (primary / secondary / text), `destructive`, `loading`, `disabled`, `fullWidth`, `icon` |
| `Input` | §4.2 | `as` (text / number / date / select / textarea / password), `label`, `error`, `helperText`, `formatThousands`. Password variant has built-in show/hide toggle |
| `SegmentedChoice` | §4.4 | `options` (2–5 items), `value`, `onChange`, `label`, `caption`. Arrow-key navigation, `role="radiogroup"` |
| `PictureCard` | §4.6 | `name`, `imageUrl`, `area`, `stars`, `details`, `totalPrice`, `pricePerNight`, `selected`. Arch-shaped image (4:3), flat border fallback on missing/broken image. Whole card is a `<button>` |
| `BudgetStackedBar` | §4.8 | `totalBudget`, `budgetSplit`, `planned`, `editMode`, `currency`, `onSave`, `onCancel`. 12 px stacked bar with chart-color segments, 4-row legend, inline number inputs in edit mode with live balance validation |
| `DayTimelineCard` | §4.9 | `dayNumber`, `date`, `activities`, `editMode`, `currency`, `onAddActivity`, `onUpdateActivity`, `onRemoveActivity`. Vertical timeline with slot groups (MORNING / AFTERNOON / EVENING), Lucide category icons, inline edit forms |
| `ToggleSwitch` | §5.5 | `checked`, `onChange`, `labelBefore`, `labelAfter`. 56 × 32 px track, 22 px thumb, `role="switch"` |
| `FeatureArchCard` | §2 | `title`, `description`, `sceneType`. Arch-topped container with SVG scene illustration |
| `Illustration` | §3.6 | `PersonIllustration` (variants: hat / backpack / camera), `CloudIllustration` (configurable width), `ArchSceneIllustration` (types: pyramids / nile / redsea / luxor). All inline SVG |
| `Navbar` | §5.1 | `activeLink`, `onNavigate`, `user`, `onLogout`. Wordmark (MapPin + "Ayn" + "أين"), nav links with active pill styling, 42 px profile avatar with dropdown menu. Mobile hamburger |
| `Footer` | — | `onNavigate`. Wordmark, tagline, link columns, copyright |

### Component Conventions

- **Props** are documented with JSDoc at the top of each `.jsx` file.
- **CSS classes** use `ayn-<component>__<element>--<modifier>` naming.
- **Styles are scoped** — each component imports only its own `.css` file and does not leak selectors.
- Components reference only CSS custom properties from `index.css`. No hardcoded colors, spacing, or font values.

## Pages

| Route key | Component | Description |
|---|---|---|
| `home` | `Home` | Landing page: hero slider (4 slides, 600 ms fade, 4 s auto-advance, pause on hover, `prefers-reduced-motion` respected), About section, Features grid (4 arch cards), CTA sky band with toggle and clouds/people illustrations |
| `components` | `ComponentsTestPage` | Interactive showcase: renders every component with working state to verify all variants, states, and props |
| `about`, `features`, `trips`, `destination`, `survey` | — | Placeholder screens (heading + back button). Not implemented yet |

Routing is state-based in `App.jsx` (`useState` + conditional rendering). No router library is installed.

## Development

### Requirements

- Node.js ≥ 18
- npm ≥ 9

### Setup

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

### Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Dev server with HMR |
| `build` | `vite build` | Production build → `dist/` |
| `preview` | `vite preview` | Serve the `dist/` build locally |
| `lint` | `eslint .` | Run linter |

No environment variables are used.

## Deployment

Vercel with these settings:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Framework | Auto-detected (Vite) |

No environment variables or additional configuration required.

## Guidelines

1. **Follow DESIGN.md** — do not introduce colors, fonts, spacing, or shadows outside the token system.
2. **Reuse existing components** — check `src/components/` before building new UI.
3. **Create reusable components** — new UI patterns go in `src/components/NewComponent/` with `.jsx`, `.css`, and `index.js`. Add the export to `src/components/index.js`.
4. **Keep styles scoped** — one `.css` file per component, namespaced classes, no global overrides.
5. **Document props** — JSDoc comment block at the top of each component.
6. **No `.env` files** — the frontend currently has no environment-dependent configuration.

## Implementation Status

**Implemented:**
- Design token system in `index.css` (all DESIGN.md §3 tokens)
- 11 reusable components with full state coverage
- Home / landing page (hero slider, about, features, CTA band)
- Navbar and Footer (reusable across pages)
- Component test page

**Not implemented:**
- API integration (no fetch calls, no backend connection)
- Client-side router
- Remaining pages (Survey, Destination, Options, Draft, Confirmed, Rating, My Trips)
- Authentication
