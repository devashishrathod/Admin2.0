# Trydood Admin Panel: Frontend Architecture

| | |
|---|---|
| **App** | Trydood 2.0 Super Admin Panel (web, internal) |
| **Code** | `Admin/` |
| **Version** | Draft 1.0, 2026-11-23 |
| **Stack** | React 19 · Vite 8 · Tailwind CSS 4 · TanStack Query 5 · Zustand 5 · React Router 7 |
| **Related docs** | [PRD](./PRD.md) · [Super admin API doc](./super_admin_panel_api_doc.md) · [Firebase push setup](../FIREBASE_PUSH_SETUP.md) |

---

## 1. Overview

A single-page React app, built with Vite, that talks to the Trydood 2.0 REST API. There is no server-side rendering and no backend-for-frontend: the browser calls the API directly with the admin's JWT.

```
 Browser
 ┌──────────────────────────────────────────────────────────────────────┐
 │  main.jsx                                                            │
 │   └─ QueryClientProvider (TanStack Query cache: all server data)     │
 │       └─ ThemeProvider (light/dark, theme colour)                    │
 │           └─ App: BrowserRouter → BrandProvider → Routes             │
 │                └─ <Layout> (route guard, sidebar, header) → page     │
 │                                                                      │
 │  features/<name>/                                                    │
 │    Page.jsx ── useXxx() hooks (queries/) ── XxxApi.js (services/)    │
 │                                                  │ axios instance    │
 │  Zustand authStore (token, sessionStorage)  ─────┤ + Bearer token    │
 │                                                  │ + 401 → logout    │
 │                                                  │ + write → refresh │
 └──────────────────────────────────────────────────┼───────────────────┘
                                                    ▼
                         Trydood API  {VITE_API_BASE_URL}  (/trydood/v1)
                         Firebase Cloud Messaging (web push)
```

Main ideas:

- **Feature folders.** Each screen area lives in `src/features/<name>/` with its own pages, API service and query hooks.
- **Server data lives in TanStack Query**, not in component state or a global store. A successful write automatically refreshes every screen showing that data.
- **Only the login is global client state** (Zustand). Theme and the brand list use React Context.
- **One error shape** (`ApiError`) for every API call; screens branch on `error.code`.
- **Tailwind CSS v4, CSS-first** (no `tailwind.config.js`). The theme colour picker recolours the whole app by redefining Tailwind's `emerald` / `teal` palettes.

## 2. Packages

From `Admin/package.json` (the package is still named `venderpanel`, see [Tech debt](#15-known-tech-debt)).

### Runtime dependencies

| Package | Version | What it does here | Where |
|---|---|---|---|
| `react`, `react-dom` | ^19.2.6 | UI library and DOM renderer | everywhere |
| `react-router-dom` | ^7.15.1 | Client-side routing (`BrowserRouter`, `Routes`, `Navigate`, `useNavigate`) | `App.jsx`, `Layout.jsx`, pages |
| `@tanstack/react-query` | ^5.104.5 | Server-state cache: fetching, caching, background refresh, invalidation | `src/lib/query/`, `features/*/queries/` |
| `zustand` | ^5.0.13 | Small global store for the login session (with `persist` to sessionStorage) | `features/auth/store/authStore.js` |
| `axios` | ^1.19.0 | HTTP client; one instance per service file with shared interceptors | `features/*/services/*Api.js` |
| `tailwindcss` | ^4.3.0 | Utility-first CSS | all components, `src/index.css` |
| `@tailwindcss/vite` | ^4.3.0 | Tailwind v4 Vite plugin (no PostCSS config needed) | `vite.config.js` |
| `lucide-react` | ^1.23.0 | Icon set | everywhere |
| `recharts` | ^3.9.1 | Charts (dashboard, finance overviews, brand and banner stats) | `components/common/Overview.jsx`, `FinanceOverviewParts.jsx`, `features/brand`, `features/banner` |
| `firebase` | ^12.18.0 | Firebase Cloud Messaging for web push to admins | `src/config/firebase.js`, `firebaseMessaging.js`, `public/firebase-messaging-sw.js` |
| `@dnd-kit/react`, `@dnd-kit/helpers` | ^0.5.0 | Drag-and-drop reordering of showcase albums and media | `features/brand/ShowcaseAlbums.jsx` |
| `read-excel-file` | 9.3.10 (pinned) | Reads `.xlsx` files for bulk import | `src/utils/importSheet.js` |
| `vite-plugin-svgr` | ^5.2.0 | Lets SVGs be imported as React components (`*.svg?react`) | `vite.config.js` (no `?react` import found in `src/` today) |
| `@lottiefiles/react-lottie-player` | ^3.6.0 | Lottie animation player | **not imported anywhere in `src/`** |

### Dev dependencies

| Package | Version | What it does |
|---|---|---|
| `vite` | ^8.0.12 | Dev server and production bundler |
| `@vitejs/plugin-react` | ^6.0.1 | React support for Vite (JSX, Fast Refresh) |
| `eslint` | ^10.3.0 | Linter (flat config, `eslint.config.js`) |
| `@eslint/js` | ^10.0.1 | ESLint's recommended JS rules |
| `eslint-plugin-react-hooks` | ^7.1.1 | Rules of Hooks and dependency checks |
| `eslint-plugin-react-refresh` | ^0.5.2 | Warns when a file breaks Fast Refresh (e.g. exports non-components alongside components) |
| `globals` | ^17.6.0 | Browser globals for ESLint |
| `@types/react`, `@types/react-dom` | ^19.2.x | Editor type hints only (the code is plain JavaScript) |

There is **no test runner** and **no TypeScript** in the project.

## 3. Tooling and scripts

| Command | What it runs |
|---|---|
| `npm run dev` | `vite`: dev server with Fast Refresh |
| `npm run build` | `vite build`: production bundle in `dist/` |
| `npm run preview` | `vite preview`: serves `dist/` locally |
| `npm run lint` | `eslint .` |

**`vite.config.js`**

```js
plugins: [react(), tailwindcss(), svgr()],
resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
```

- `@/…` points at `src/…` (also declared in `jsconfig.json` for the editor). Most files still use relative imports; `@/` appears in newer code (e.g. `ThemeContext.jsx`).

**`eslint.config.js`**: flat config with `js.configs.recommended`, `react-hooks` (recommended) and `react-refresh` (Vite preset), browser globals, `dist/` ignored.

**`vercel.json`**: rewrites every path to `/index.html` so client-side routes survive a reload.

## 4. Environment variables

Read through `import.meta.env` (Vite exposes only `VITE_*`). Files: `.env` (local / stage) and `.env.production`.

| Variable | Used for |
|---|---|
| `VITE_API_BASE_URL` | API base URL, e.g. `https://staging-api.trydood.com/trydood/v1` |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` | Firebase app config |
| `VITE_FIREBASE_VAPID_KEY` | Web push key; without it the browser registers a placeholder token |

`VITE_*` values end up in the public bundle, so never put secrets there.

## 5. Folder structure

```
Admin/
├── index.html                 # fonts, pre-paint dark-mode script, #root
├── vite.config.js · eslint.config.js · jsconfig.json · vercel.json
├── public/
│   └── firebase-messaging-sw.js   # service worker for background push
├── docs/                      # PRD, this file, API doc, Postman collection
└── src/
    ├── main.jsx               # bootstrap: tab session → providers → <App/>
    ├── App.jsx                # every route
    ├── index.css              # Tailwind import, theme tokens, global rules
    ├── assets/                # images, Lottie JSON, onboarding icons
    ├── components/
    │   ├── layout/            # Layout (route guard), Sidebar, Header, NotificationBell, Footer
    │   ├── common/            # Table, Loader, EmptyState, ConfirmActionModal, BulkActionModal,
    │   │                      # BulkSelectBar, DateRangeFilter, SelectDropdown, StatTile, Overview,
    │   │                      # FinanceOverviewParts, ToggleSwitch, ThemeToggle, ValueOr, NotFoundPage …
    │   └── ui/                # Button, Input, Modal
    ├── config/                # firebase.js, firebaseMessaging.js
    ├── constants/             # navGroups.js (sidebar), backgroundThemes.js (theme colours)
    ├── context/               # ThemeContext.jsx
    ├── lib/
    │   ├── apiError.js        # ApiError + throwApiError
    │   ├── useBackLayer.js    # browser Back closes the top overlay first
    │   └── query/             # queryClient, queryKeys, invalidateAfterWrite
    ├── utils/                 # exportTable (CSV / print-PDF), importSheet (xlsx), formatDate, helpers …
    └── features/              # one folder per area (below)
```

**Feature folders** (`src/features/`): `accountDeletion`, `auth`, `banner`, `brand`, `category`, `coupon`, `customer`, `dashboard`, `faq`, `featurecampaign`, `legal`, `newOnboarding` (onboarding lists, Brand Waiting, review), `notification`, `onboarding` (admin onboarding wizard), `plan`, `profile`, `promoCode`, `promotionalTicker`, `refund`, `settings`, `settlement`, `subcategory`, `subscriptions`, `transaction`, `voucher`.

**Empty placeholder files** (0 bytes, safe to delete or fill): `src/routes/index.jsx`, `src/services/api.js`, `src/services/axios.js`, `src/store/index.js`, `src/config/index.js`, `src/constants/index.js`, `src/styles/globals.css`, `src/styles/variables.css`, `src/App.css`. The folders `src/hooks/` and `src/types/` are empty.

## 6. Startup

`src/main.jsx`, in order:

1. `startSessionSharing(useAuthStore)`: this tab starts answering other admin tabs and follows their logout.
2. `restoreSessionFromOpenTabs(useAuthStore)`: a fresh tab asks open admin tabs for their session (waits up to 300 ms). No answer means no open admin tab, so the login screen shows.
3. Render:

```jsx
<StrictMode>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <App />          {/* BrowserRouter → BrandProvider → Routes */}
    </ThemeProvider>
  </QueryClientProvider>
</StrictMode>
```

`index.html` adds the `dark` class to `<html>` **before** React loads when the saved theme is dark, so dark-mode users don't see a white flash.

## 7. Routing and layout

- All routes are declared in `src/App.jsx` (the route list is in the [PRD, section 4](./PRD.md#4-information-architecture)).
- `/` is the login page. Every other page is wrapped in `<Layout>`:

```jsx
<Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
```

- **`Layout` is the route guard.** No token, or an expired one, redirects to `/?from=<path>` (plus `session=expired` when a token existed). It also sets a timer that logs out exactly when the JWT's `exp` passes.
- `Layout` draws the app shell: themed gradient background with blurred glow blobs, `Sidebar` (built from `constants/navGroups.js`), `Header` (profile menu, `ThemeToggle`, `NotificationBell`) and a `<main>` region, **the only part that scrolls**.
- `Layout` also mounts `NotificationScheduler` (see [section 12](#12-push-and-scheduled-notifications)).
- Unknown paths render `NotFoundPage` inside `Layout`.
- Pages are imported eagerly (no `React.lazy`), so the whole app is one large chunk (Vite warns about chunk size on build).

## 8. Feature module pattern

```
features/promoCode/
├── PromoCode.jsx            # page (route element)
├── PromoCodeDetails.jsx     # sub-page / panel
├── PromoCodeReports.jsx
├── promoCodeEnums.js        # feature constants and helpers
├── services/PromoCodeApi.js # all HTTP calls for this feature
└── queries/promoCodeQueries.js  # useQuery hooks over the service
```

### Service files (`services/*Api.js`)

Each service creates its own axios instance and wires the same three things:

```js
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL,
                           headers: { "Content-Type": "application/json" } });

attachSessionHandling(api);            // 401 → log out; successful write → refresh cache

api.interceptors.request.use(async (config) => {
  const { useAuthStore } = await import("../../auth/store/authStore"); // lazy: avoids an import cycle
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function getBrandDetails(brandId) {
  try {
    const { data } = await api.get("/brands/get", { params: { brandId } });
    return data;
  } catch (error) {
    throwApiError(error);              // always rethrow as ApiError
  }
}
```

Rules:

- Admin calls carry `brandId` explicitly (query param for onboarding APIs, body for older APIs); the admin has no brand of their own.
- Multipart uploads set `Content-Type: undefined` so the browser adds the boundary.
- A bare `axios` call (not the shared instance) is used only where a `401` must **not** log the admin out, e.g. checking an outlet manager's OTP (`verifyOutletOtp`).

### Query files (`queries/*Queries.js`)

Thin `useQuery` wrappers so screens never build keys or call services directly:

```js
export function useOnboardingStatus(brandId, options = {}) {
  return useQuery({
    queryKey: queryKeys.brands.view("onboarding-status", { brandId }),
    queryFn: () => getOnboardingStatus(brandId),
    enabled: Boolean(brandId),
    ...options,
  });
}
```

### Adding a feature

1. Create `src/features/<name>/` with the page, `services/<Name>Api.js` and `queries/<name>Queries.js`.
2. Add a key family in `src/lib/query/queryKeys.js` named after the URL's first segment.
3. If a write to one resource changes another, add it to `RELATED_RESOURCES` in `invalidateAfterWrite.js`.
4. Add the route in `App.jsx` wrapped in `<Layout>`, and the sidebar entry in `constants/navGroups.js`.
5. Use theme classes (`emerald-*`, `neutral-*`), not hex colours, and `normal-case` on text blocks with sentences.

## 9. State management

| Kind of state | Where | Notes |
|---|---|---|
| Server data | TanStack Query | Lists, details, settings, everything from the API |
| Login session | Zustand `authStore` | Token + user, persisted to **sessionStorage** |
| Theme | `ThemeContext` | Light/dark, theme colour, plain background; persisted to localStorage |
| Brand list / detail helpers | `BrandContext` | Brand list and detail over TanStack Query, plus brand mutations (access, "coming soon", top brand) |
| Wizard step info | `StepProvider` (onboarding `ui.jsx`) | Current step's icon, number and group for the screen header |
| Form and UI state | `useState` in components | Local only |

### TanStack Query (`src/lib/query/`)

**`queryClient.js`**: one client for the app:

```js
staleTime: 30_000,           // fresh for 30 s: page switches show the cache with no request
refetchOnWindowFocus: true,  // stale data refreshes when the admin returns to the tab
retry: 1,
```

**`queryKeys.js`**: every key starts with the API resource (the URL's first segment). Each resource gets four shapes:

| Helper | Key | Use |
|---|---|---|
| `all` | `["brands"]` | invalidate everything for the resource |
| `list(params)` | `["brands", "list", {…}]` | a page of rows |
| `detail(id)` | `["brands", "detail", id]` | one row |
| `view(name, params)` | `["brands", "onboarding-status", {…}]` | any other read |

Keys are always built through these helpers, never as inline arrays.

**`invalidateAfterWrite.js`**: called from the shared response interceptor. A successful `POST` / `PUT` / `PATCH` / `DELETE` invalidates the key root matching the URL's resource, plus related roots:

| Write to | Also refreshes |
|---|---|
| `subBrands`, `brandFeatures`, `subscribeds` | `brands` |
| `refunds`, `transactions` | `voucher-claims`, `settlements` |
| `settlements` | `voucher-claims` |
| `categories` | `subCategories` |
| `users` | `customers`, `voucher-claims` |

`uploads` is ignored. Reads and failed requests never invalidate. Screens on show refetch at once; others refetch when next opened.

### Auth (`src/features/auth/`)

| File | Job |
|---|---|
| `store/authStore.js` | Zustand store. Login is **WhatsApp number + OTP** (`/auth/loginOrSignUp-with-whatsapp`, `/auth/verify-otp-whatsapp`, `role: ADMIN`). Persists to sessionStorage key `trydood-auth`; the token is mirrored to `trydood-token`. On login it registers the browser for push (best effort); logout clears the query cache, tells other tabs and unregisters push |
| `session.js` | Reads `exp` from the JWT, `isTokenValid`, `expireSession()` (log out once, go to `/?session=expired&from=…`), and `attachSessionHandling(api)` (401 handler + write invalidation) |
| `tabSession.js` | `BroadcastChannel("trydood-admin-auth")`: new tabs borrow the session of an open tab; logout in one tab logs out all |

Closing the last admin tab ends the session (sessionStorage is cleared by the browser). There is no refresh token: the JWT lives for the backend's `JWT_EXPIRY`.

## 10. Errors

`src/lib/apiError.js`:

```js
class ApiError extends Error { status; code; details; }   // code = details.code from the server
throwApiError(error)     // in every service catch block
isApiErrorCode(err, "SUBMIT_REQUIRED", "DEED_NOT_ACCEPTED")
```

- Screens branch on `err.code`, never on the message text.
- `err.details` carries extras such as `missing[]`, `suggestedAddress`, `badgeBlockers`, `retryAfterSeconds`.
- Features may map codes to friendly text (e.g. `ERROR_HELP` and `errorText()` in `features/onboarding/onboardingFlow.js`).
- Load failures show `EmptyState` with a "Try again" action; inline save errors show next to the form.

## 11. Styling

### Tailwind CSS v4 setup

- Installed through the Vite plugin `@tailwindcss/vite`; there is **no `tailwind.config.js` and no PostCSS config**.
- `src/index.css` starts with:

```css
@import "tailwindcss";

/* dark: keys off a .dark class on <html> (ThemeContext), not the OS setting */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: "DM Serif Display", ui-serif, serif;
}
```

- Fonts load from Google Fonts in `index.html`.
- The root font size scales with the viewport: `font-size: clamp(14px, 10px + 0.3125vw, 16px)`, so every `rem` utility grows from laptop to desktop.
- `body` sets `text-transform: capitalize` **app-wide**. Blocks with sentences opt out with `normal-case` (the onboarding wizard and brand pages do).

### Global rules in `index.css`

| Rule | Effect |
|---|---|
| Glass cards | Inside `<main>`, any element with `bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]` becomes a frosted glass card (blur, translucent white, light border); dark variant included. Not applied inside fixed overlays; opt out with `no-glass` |
| Scrollbars | Slim themed scrollbars; `.no-scrollbar` hides one but keeps scrolling |
| Print | Wrap printable content in `.print-area`, hide controls with `.no-print`; used by `printAsPdf()` |
| Theme colours | See below |

### Theme colour system

Settings → Appearance lets the admin pick a **theme colour** (Trydood Green, Violet, Ocean Blue, Sky, Lavender, Rose, Peach, Sunshine, Soft Gray, Silver) and optionally a **plain background**.

```
ThemeContext ──writes──▶ <html data-bg="violet" style="--accent-h:280; --accent-c:1.05; --shell-top:…">
index.css    ──html[data-bg] { --color-emerald-50 … 950: oklch(… var(--accent-h)) ;
                               --color-teal-50 … 950: … }
```

- Tailwind v4 utilities read `var(--color-emerald-*)` / `var(--color-teal-*)`, so redefining those palettes recolours every button, badge, ring and icon at once.
- The default green sets nothing, so the original CSS applies.
- **Rule for contributors:** use `emerald-*` / `teal-*` for the accent and `neutral-*` for greys. Hex colours (e.g. `#0B6E5A`) won't follow the theme.
- The app shell background and glows (`app-shell-bg`, `app-glow-1..3` in `Layout.jsx`) follow the preset too.
- Shared card recipes for detail pages: `features/brand/BrandDetails/components/bentoStyles.js` (`glassClass`, `cardClass`, `heroClass`, `innerTile`, `tints`).

### Dark mode

Class-based (`.dark` on `<html>`), toggled by `ThemeToggle` in the header, saved under `trydood-admin-theme`. Every component writes its `dark:` variants.

## 12. Push and scheduled notifications

- **Web push (Firebase Cloud Messaging):** `config/firebase.js` initialises the app; `config/firebaseMessaging.js` gets the FCM token and a stable browser device id; `public/firebase-messaging-sw.js` handles background messages. On login the browser registers with `POST /deviceTokens/register` (best effort: a denied permission or missing VAPID key never blocks login). Setup steps: [`FIREBASE_PUSH_SETUP.md`](../FIREBASE_PUSH_SETUP.md).
- **Scheduled broadcasts run in the browser.** The API has no scheduling endpoint, so `features/notification/NotificationScheduler.jsx` (mounted in `Layout`) checks on an interval and sends due items through `POST /notifications/broadcast`. With several tabs open only one claims each send. If the panel was closed past a grace period, the item is marked "missed" for the admin to send by hand.

## 13. Shared utilities

| File | What it gives |
|---|---|
| `lib/useBackLayer.js` | `useBackLayer(active, onBack)`: an overlay (gallery, viewer, modal) gets a history entry, so the browser Back button closes it first; layers stack |
| `utils/exportTable.js` | `downloadCsv(filename, columns, rows)`, `printAsPdf()` |
| `utils/importSheet.js` | `readSheetRows(file)` over `read-excel-file` |
| `utils/formatDate.js`, `utils/helpers.js` | Date formatting, "missing value" helpers, batch formatting |
| `components/common/Table.jsx` | Shared table with horizontal scroll inside its own container |
| `components/common/EmptyState.jsx`, `Loader.jsx` | Empty / error / loading states (`Loader variant="page" | "inline"`) |
| `features/onboarding/ui.jsx` | Wizard kit: `ScreenShell`, `StepFooter`, `Section`, `Field`, `RadioCard`, `ChoiceChip`, `FileDrop`, `StatusBadge`, `Note`, buttons |

## 14. Build and deploy

1. `npm run build` → static files in `dist/`.
2. Deploy `dist/` as a static site. On Vercel, `vercel.json` sends every path to `index.html`.
3. Set the `VITE_*` variables per environment (`.env` for local / stage, `.env.production` for production). They are baked in at build time, so changing one needs a rebuild.

The app is marked `noindex, nofollow` in `index.html` (internal tool).

## 15. Known tech debt

| # | Item | Suggestion |
|---|---|---|
| T1 | Every page is imported eagerly; one large JS chunk | Lazy-load routes with `React.lazy` + `Suspense` |
| T2 | One axios instance per service file, each repeating the same interceptors | One shared `apiClient` in `src/services/` (the empty `api.js` / `axios.js` were probably meant for this) |
| T3 | Empty placeholder files and folders (section 5) | Delete or fill |
| T4 | `@lottiefiles/react-lottie-player` unused; `vite-plugin-svgr` configured but unused | Remove, or start using them |
| T5 | `package.json` name is `venderpanel` | Rename to the admin panel |
| T6 | No tests | Add Vitest + React Testing Library, starting with `lib/query` and `auth` |
| T7 | `console.log` calls in the auth store (push registration) | Remove or put behind a debug flag |
| T8 | `GET /subBrands/get-all` ignores the admin's `brandId`, so outlet lists fetch every page and filter on the client | Fix on the backend, then drop the client filter in `getBrandOutlets` |
| T9 | Typos in file names (`Dashbaord.jsx`, route `/assebility`) | Rename in one pass with the imports |
| T10 | `@/` alias exists but most imports are relative | Pick one style for new code |
