# SILKX — mobile app

AI-powered real estate app for Tashkent: new developments, rentals, 3D-ready property pages,
chat with sellers, viewing bookings and a listing wizard. iOS · Android · Web (Expo).

**Stack:** Expo SDK 58 · React Native 0.88 · Expo Router (typed routes) · TypeScript (strict) ·
TanStack Query (offline-first) · Zustand · Reanimated 4 · Gesture Handler · react-native-maps ·
i18next (RU / UZ / EN) · zod + React Hook Form · expo-secure-store.

## Run locally

```bash
npm install
npx expo start
```

- **Phone:** install **Expo Go** (App Store / Google Play) and scan the QR code from the terminal.
- **Android emulator:** press `a` · **iOS simulator (macOS):** press `i` · **Browser:** press `w`.

## Demo accounts

The app runs on a built-in mock server, so no backend is needed to try it.
Password for all accounts: `Silkx2026!`

| Role | Email |
|---|---|
| Buyer | `buyer@silkx.uz` |
| Developer / seller | `developer@silkx.uz` |
| Admin | `admin@silkx.uz` |

## Useful scripts

| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript check (must be 0 errors) |
| `npm run lint` | ESLint |
| `npm run doctor` | Checks Expo dependency versions |
| `npm run export:web` | Static web build into `dist/` |

## Configuration

Copy `.env.example` → `.env.local` and fill in values. `.env*.local` is never committed.

- `API_URL` — real backend (currently the in-app mock server is used).
- `GOOGLE_MAPS_ANDROID_KEY` / `GOOGLE_MAPS_IOS_KEY` — needed only for production builds.
- `EAS_PROJECT_ID` — set after `npx eas-cli@latest init`; enables OTA updates.

## Builds & updates (EAS)

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:preview      # installable test build (Android APK / iOS internal)
npm run build:prod         # store builds
npm run update:prod        # over-the-air JS update without a store release
```

## Project structure

```
src/
  app/          screens (Expo Router: tabs, auth, property, chats, listing wizard, admin…)
  components/   UI kit + feature components (catalog, property, chat, listing, profile)
  features/     form schemas and domain logic
  hooks/        data hooks (React Query) and helpers
  services/     API client + mock server
  store/        Zustand stores (persisted)
  i18n/         translations — ru.ts is the source of truth, uz/en must match
  theme/        design tokens (graphite / gold #BCA37F, Cormorant Garamond + Inter)
```

## Security

- Tokens and sessions are stored **only** in `expo-secure-store` (Keychain / Keystore), never in AsyncStorage.
- On web there is no secure storage, so the session lives in memory and a page reload signs you out (by design).

## Backend contract (for the API team)

The app talks to the backend through `src/services/api`. The mock server in `src/services/mock`
implements the same endpoints and data shapes; use it as the reference when building the real API.
