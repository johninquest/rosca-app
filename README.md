# Mocotr — Community Money Contribution Tracker

A lightweight, mobile-first web application that lets a family organizer create and manage financial contribution rounds for events such as funerals, medical emergencies, or celebrations. The organizer tracks contributions in real time and can share live progress directly to WhatsApp with a single tap.

Built for families in Cameroon and the diaspora (Europe / USA), with a clean off-black/off-white design and Public Sans typography optimised for readability on mobile screens.

---

## Features

### Authentication
- Google OAuth sign-in (one tap, no password)
- Session persists across browser refreshes
- Sign-out from the navigation bar

### Collection Events
- Create a fundraising round with a title, optional description, currency (XAF / USD / EUR), optional target amount, and optional deadline
- Edit or delete an event at any time (deletion cascades to all contributions)
- Open / close an event to stop new contributions being added
- Public shareable link — anyone with the URL can view an event without logging in

### Contributions
- Add, edit, and delete contributions (owner only)
- Fields: contributor name, amount, date (native date picker, defaults to today), optional note
- Amount validated: min 1, max 1,000,000
- Listed newest-first; total collected computed live from all contributions

### WhatsApp Sharing
- One-tap share button on every event page (visible to all viewers)
- Pre-filled message includes event name, target, collected, remaining, progress %, and the most recent contributions
- Target / remaining / progress lines are omitted automatically when no target is set
- Works on mobile (native WhatsApp) and desktop (WhatsApp Web)

### Export (owner only)
- **PDF** — clean printable summary with event details and full contribution table; saved as `[event-title]-contributions.pdf`
- **CSV** — contribution list with columns: Contributor Name, Amount, Currency, Date, Note; saved as `[event-title]-contributions.csv`

### Display
- All amounts displayed as `1,000,000.00 XAF` / `1,000.00 USD` / `1,000.00 EUR`
- Unavailable data renders as **N/A**
- Progress bar shown when a target amount is set

---

## Tech Stack

| Concern | Choice |
|---|---|
| Frontend | React 19 + Vite 8 |
| Routing | React Router v7 (SPA mode, lazy-loaded pages) |
| Styling | Tailwind CSS v4 |
| Auth | Firebase Authentication — Google OAuth |
| Database | Firebase Firestore (real-time `onSnapshot` listeners) |
| Forms | React Hook Form |
| PDF export | jsPDF + jspdf-autotable |
| CSV export | Native JS (Blob + download link) |
| WhatsApp | `wa.me` deep link |
| Testing | Vitest + React Testing Library + jsdom |
| Hosting | Firebase Hosting or Vercel |

---

## Design

- **Font:** Public Sans (Google Fonts), 16 px minimum body size
- **Palette (augenschonend — easy on the eyes):**
  - Page background: `#F9F9F9`
  - Card / surface: `#FFFFFF`
  - Primary text: `#1A1A1A`
  - Secondary text: `#555555`
  - Borders: `#E0E0E0`
- No accent colours — interactivity is conveyed through weight and contrast within the black/white palette
- Mobile-first layout, max content width 672 px, large tap targets

---

## Project Structure

```
src/
  context/
    AuthContext.jsx          # Google OAuth, session persistence, sign-out
  components/
    ProtectedRoute.jsx       # Redirects unauthenticated users to /
    Navbar.jsx               # Sticky top bar
    Spinner.jsx              # Full-page loading indicator
    ConfirmDialog.jsx        # Reusable modal confirmation dialog
    EventForm.jsx            # Shared create/edit event form
    ContributionForm.jsx     # Add/edit contribution modal
  pages/
    LoginPage.jsx            # Google sign-in
    DashboardPage.jsx        # Event list with live totals and progress bars
    CreateEventPage.jsx      # New event form
    EditEventPage.jsx        # Edit event (owner only)
    EventDetailPage.jsx      # Public event page — summary, contributions, all actions
  utils/
    format.js                # formatAmount(), formatDate(), todayISO()
    whatsapp.js              # buildWhatsAppUrl() — pre-filled message generator
    export.js                # exportPDF(), exportCSV()
  lib/
    firebase.js              # Firebase app, auth, db instances
  test/
    setup.js                 # @testing-library/jest-dom
    format.test.js           # 12 unit tests for formatting utilities
    whatsapp.test.js         # 6 unit tests for WhatsApp message builder
  App.jsx                    # Router with lazy-loaded pages
  index.css                  # Tailwind v4 + theme tokens
public/
  manifest.json              # PWA manifest (groundwork for future activation)
  icons/
    icon-192.png             # App icon 192×192
    icon-512.png             # App icon 512×512
  favicon.svg                # Browser tab icon (replace with your own)
firestore.rules              # Firestore security rules
.env.example                 # Firebase config template
```

---

## Routes

| Path | Access | Description |
|---|---|---|
| `/` | Public | Login page |
| `/dashboard` | Authenticated | List of the user's events |
| `/event/new` | Authenticated | Create a new event |
| `/event/:eventId` | Public | Event detail page (shareable link) |
| `/event/:eventId/edit` | Authenticated (owner) | Edit event |

---

## Data Model

### `events`
| Field | Type | Notes |
|---|---|---|
| `title` | string | Required |
| `description` | string | Optional |
| `currency` | `XAF` \| `USD` \| `EUR` | Required |
| `targetAmount` | number | Optional |
| `deadline` | date string | Optional |
| `status` | `open` \| `closed` | Default: `open` |
| `ownerId` | string | Firebase Auth UID |
| `createdAt` | timestamp | Auto |
| `updatedAt` | timestamp | Auto |

> `totalCollected` is **not stored** — it is always computed on the fly by summing contributions.

### `contributions`
| Field | Type | Notes |
|---|---|---|
| `eventId` | string | Reference to parent event |
| `contributorName` | string | Required |
| `amount` | number | Required, min 1, max 1,000,000 |
| `date` | date string | Required, defaults to today |
| `note` | string | Optional |
| `createdAt` | timestamp | Auto |
| `updatedAt` | timestamp | Auto |

### `users`
| Field | Type |
|---|---|
| `displayName` | string |
| `email` | string |
| `photoURL` | string |

---

## Security Rules

- **Events / Contributions:** anyone with the document ID can read (public shareable link, protected by Firestore's unguessable auto-IDs)
- **Events:** only the authenticated owner can create, update, or delete
- **Contributions:** only the authenticated owner of the parent event can write, edit, or delete; amount is validated server-side (min 1, max 1,000,000)
- **Users:** each user can only read and write their own document

---

## Getting Started

### 1. Firebase setup
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Google** sign-in under Authentication → Sign-in method
3. Create a **Firestore** database (start in production mode)
4. Register a **Web app** and copy the SDK config

### 2. Environment variables
```bash
cp .env.example .env.local
```
Fill in `.env.local` with your Firebase project values:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 3. Deploy Firestore security rules
```bash
npm install -g firebase-tools
firebase login
firebase use --add          # select your project
firebase deploy --only firestore:rules
```

### 4. Run locally
```bash
npm install
npm run dev
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run unit tests in watch mode |
| `npx vitest run` | Run unit tests once |
| `npm run coverage` | Test coverage report |

---

## Out of Scope (v1)

- Payment / mobile money integration (MTN, Orange Money)
- SMS notifications
- Multiple admins per event
- Native iOS / Android app
- Multi-language support
- Push notifications
- Offline contribution queuing
- Full PWA activation (groundwork — manifest, icons, meta tags — is already in place)
