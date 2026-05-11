# Family Contribution Tracker — Product Requirements Document

## 1. Overview

A lightweight, mobile-first web application that allows family members to create and manage financial contribution rounds for events such as funerals, medical emergencies, or celebrations. The organizer tracks contributions in real time and shares progress updates directly to WhatsApp with a single tap.

---

## 2. Target Users

- **Primary user (Organizer):** A family member who creates and manages a collection round. Authenticates via Google. Likely based in Cameroon or the diaspora (Europe/USA).
- **Viewers:** Family members who receive a read-only link to see live progress. No login required to view.

---

## 3. Authentication

- Google OAuth sign-in only (via Firebase Authentication).
- Any person with a Google account can sign in and create collection events.
- No email/password registration.
- User session persists across browser refreshes.

---

## 4. Core Features

### 4.1 Collection Events

A **Collection Event** represents one fundraising round (e.g. "Funeral for Uncle Paul").

**Create Event**
- Fields:
  - Title (required) — e.g. "Funeral for Uncle Paul"
  - Purpose / Description (optional) — free text, a few sentences
  - Target Amount (optional) — numeric
  - Currency (required) — selected at creation time; options: XAF (CFA Franc), USD, EUR
  - Date Created — auto-populated
- The creator becomes the sole **admin/owner** of that event.

**Event States**
- Active — contributions are being collected
- Closed — marked as complete by the owner; no new contributions can be added

**Event List (Dashboard)**
- After login, users see a list of all events they have created.
- Each event card shows: title, currency, total collected, target (if set), progress bar, status (active/closed), and date created.
- Option to create a new event via a prominent button.

**Event Detail Page**
- Publicly accessible via a shareable read-only link (no login required to view).
- Shows:
  - Event title and description
  - Currency
  - Target amount (if set)
  - Total collected
  - Remaining to target (if target is set)
  - Progress bar (if target is set)
  - Full contribution list (name, amount, date, note)
  - WhatsApp share button (visible to everyone)
- Edit/delete controls visible only to the event owner (when logged in).

---

### 4.2 Contributions

A **Contribution** is a single entry logged against a collection event.

**Add Contribution** (owner only)
- Fields:
  - Contributor Name (required) — free text, e.g. "Aunt Marie"
  - Amount (required) — numeric, in the event's currency
  - Date (required) — defaults to today, editable
  - Note / Comment (optional) — free text, e.g. "Sent via Orange Money"
- Contributions are listed in reverse chronological order (newest first).

**Edit Contribution** (owner only)
- Owner can edit any existing contribution on their event.

**Delete Contribution** (owner only)
- Owner can delete a contribution with a confirmation prompt.

**Totals**
- Total collected auto-updates whenever a contribution is added, edited, or deleted.
- If a target is set: remaining amount and percentage progress are recalculated automatically.

---

### 4.3 WhatsApp Sharing

- A **"Share to WhatsApp"** button is present on every event detail page.
- Tapping it opens WhatsApp with a pre-filled message using a `wa.me` link.
- The message is auto-generated from live event data.

**Example pre-filled message format:**
```
🙏 *Family Contribution Update*

📋 *Event:* Funeral for Uncle Paul
💰 *Target:* XAF 500,000
✅ *Collected:* XAF 320,000
⏳ *Remaining:* XAF 180,000
📊 *Progress:* 64%

👥 *Recent contributions:*
• Aunt Marie — XAF 50,000 (12 May 2026)
• Jean-Pierre — XAF 30,000 (11 May 2026)
• Uncle Brice — XAF 20,000 (10 May 2026)

🔗 View full details: [link to event page]

Thank you all for your generosity 🙏
```

- If no target is set, the target/remaining/progress lines are omitted.
- The link included in the message is the public read-only event URL.
- Works on both mobile and desktop (desktop opens WhatsApp Web).

---

### 4.4 Export

Available to the event owner only, from the event detail page.

**Export to PDF**
- Generates a clean, printable PDF summary of the event.
- Includes: event title, description, currency, target, total collected, remaining, and the full contribution list (name, amount, date, note).
- File named: `[event-title]-contributions.pdf`

**Export to Excel/CSV**
- Generates a `.csv` file of the contribution list.
- Columns: Contributor Name, Amount, Currency, Date, Note
- File named: `[event-title]-contributions.csv`

---

## 5. Data Model

### Users
```
users
  └── uid (from Google Auth)
       ├── displayName
       ├── email
       └── photoURL
```

### Collection Events
```
events
  └── eventId (auto-generated)
       ├── title              (string, required)
       ├── description        (string, optional)
       ├── targetAmount       (number, optional)
       ├── currency           (enum: XAF | USD | EUR)
       ├── totalCollected     (number, auto-calculated)
       ├── status             (enum: active | closed)
       ├── ownerId            (uid of creator)
       ├── createdAt          (timestamp)
       └── updatedAt          (timestamp)
```

### Contributions
```
contributions
  └── contributionId (auto-generated)
       ├── eventId            (reference to event)
       ├── contributorName    (string, required)
       ├── amount             (number, required)
       ├── date               (date, required)
       ├── note               (string, optional)
       └── createdAt          (timestamp)
```

---

## 6. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) | Fast builds, large ecosystem, good mobile perf |
| Styling | Tailwind CSS | Utility-first, small bundle, rapid iteration |
| Backend / DB | Firebase Firestore | Real-time, no server to manage, generous free tier |
| Auth | Firebase Authentication (Google) | One-tap Google sign-in, secure |
| Hosting | Firebase Hosting or Vercel | Free tier, global CDN, fast for African users |
| PDF Export | `jsPDF` + `jspdf-autotable` | Client-side, no server needed |
| CSV Export | Native JS (Blob + download) | No library needed |
| WhatsApp | `wa.me` deep link | Zero setup, works immediately |

---

## 7. Design & UX

- **Style:** Clean and minimal — Google/WhatsApp aesthetic. White backgrounds, clear typography, subtle shadows.
- **Mobile-first:** Designed for smartphone use. Large tap targets, minimal scrolling per screen.
- **Performance:** Optimized for slower mobile networks (Cameroon 3G/4G). Lazy loading where appropriate.
- **Offline support:** Firebase Firestore offline persistence must be enabled. The single most important offline capability is **adding a contribution while offline** — the entry should be accepted by the UI and queued locally, then automatically synced to Firestore when connectivity is restored. The user should see clear visual feedback indicating the contribution is pending sync.
- **Language:** English only (v1).
- **Accessibility:** Sufficient color contrast, readable font sizes (minimum 16px body text).

### Key Screens
1. **Login screen** — Google sign-in button, app name and tagline
2. **Dashboard** — list of user's events, "New Event" button
3. **Create Event form** — title, description, currency, optional target
4. **Event Detail page** — summary card, contribution list, add contribution button, share + export actions
5. **Add/Edit Contribution form** — modal or inline form

---

## 8. Security Rules (Firestore)

- Events: read by anyone with the event ID; write only by authenticated owner.
- Contributions: read by anyone with the event ID; write/edit/delete only by the event owner.
- Users collection: read/write only by the authenticated user themselves.

---

## 9. Out of Scope (v1)

- Payment processing or mobile money integration
- SMS notifications
- Multiple admins per event
- Comments or messaging between family members
- Native mobile app (iOS / Android)
- Multi-language support
- Push notifications
- User profile editing

---

## 10. Suggested Build Phases

### Phase 1 — Core (Week 1–2)
- Google auth
- Create / list / view events
- Add / edit / delete contributions
- Auto-calculated totals and progress bar
- Public shareable event link
- Firebase Firestore offline persistence (contribution queuing while offline, auto-sync on reconnect, pending sync indicator in UI)

### Phase 2 — Sharing & Export (Week 2–3)
- WhatsApp one-tap share with pre-filled message
- PDF export
- CSV export

### Phase 3 — Polish (Week 3–4)
- Close/reopen event
- Responsive design QA on mobile
- Loading states and empty states
- Error handling and form validation

---

## 11. Nice-to-Haves (Future Versions)

- MTN Mobile Money / Orange Money payment integration
- Africa's Talking SMS fallback for family members not on WhatsApp
- Multiple currency contributions within one event (with conversion)
- Duplicate event (reuse structure for recurring events)
- Summary dashboard across all events
- **PWA (Progressive Web App):** Installable on home screen, offline shell, push notifications. Recommended path: `vite-plugin-pwa` with Workbox. The Vite project should be scaffolded with PWA groundwork from day one (web manifest, app icons, meta tags) so the full PWA upgrade is a small step rather than a rewrite.

---

## 12. PWA — Implementation Notes (Future)

Although full PWA is out of scope for v1, the following should be in place from day one to make the future upgrade seamless:

- `vite-plugin-pwa` added to the project (can be inactive/unconfigured)
- A `manifest.json` with app name, icons, theme colour, and display mode (`standalone`)
- Correct viewport and mobile meta tags in `index.html`
- App icon set (192×192 and 512×512 PNG minimum)

When PWA is activated in a future version, the priority features are:
1. Installable on Android and iOS home screens
2. Cached app shell (loads instantly even on slow connections)
3. Push notifications for contribution updates (requires Firebase Cloud Messaging)