# Tontine Manager — PWA Implementation Document
## PocketBase + Dexie.js Offline-First Sync Architecture

**Version:** 2.0  
**Date:** 2026-05-21  
**Prepared for:** Development Agent  
**Target:** Single-admin ROSCA management app for low-end Android in Cameroon

---

## 1. Architecture Overview

### 1.1 The Pattern: Local-First with Cloud Sync

This is a **local-first** application. Dexie.js (IndexedDB) is the **primary database** — all reads, writes, and UI interactions happen locally at native speed. PocketBase is the **cloud backup and sync target** that operates silently in the background.

```
┌─────────────────────────────────────────────────────────────┐
│                      PWA (React)                            │
│  ┌─────────────┐      ┌─────────────────────────────────┐  │
│  │  UI Layer   │◄────►│  Dexie.js (IndexedDB)           │  │
│  │  (React)    │      │  • Primary database             │  │
│  └─────────────┘      │  • Instant reads (<10ms)        │  │
│        ▲              │  • Instant writes (<50ms)       │  │
│        │              │  • Full offline functionality   │  │
│   ┌────┴────────┐     │  • Optimistic UI updates      │  │
│   │  Sync Layer │     └─────────────────────────────────┘  │
│   │  (Custom)   │                  ▲                      │
│   └────┬────────┘                  │                      │
│        │                    Background sync               │
│        │                    (batched, tolerant)           │
│        ▼                                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  PocketBase (Germany VPS)                           │  │
│  │  • SQLite database                                  │  │
│  │  • Built-in auth (single admin)                     │  │
│  │  • Real-time SSE subscriptions                      │  │
│  │  • REST API                                         │  │
│  │  • File storage (PDF/CSV exports)                   │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Core Principle

> **The app must work identically whether online or offline. PocketBase sync is invisible to the user.**

- User opens app → data loads from Dexie instantly
- User adds contribution → writes to Dexie instantly, syncs to PocketBase in background
- User exports to WhatsApp → uses local Dexie data, zero network
- User loses phone → buy new phone, login, all data restores from PocketBase

---

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Build Tool | Vite | ^5.3 | Fast builds, tree-shaking |
| Framework | React | ^19 | UI layer |
| State Management | Zustand | ^4.5 | UI state, navigation |
| **Local Database** | **Dexie.js** | **^4.0** | **Primary data store (IndexedDB)** |
| **Sync Backend** | **PocketBase** | **^0.22** | **Cloud backup, auth, real-time sync** |
| Styling | Tailwind CSS | ^3.4 | Utility-first CSS |
| PWA | vite-plugin-pwa | ^0.20 | Service worker, manifest |
| PDF Export | jspdf + jspdf-autotable | dynamic | Client-side PDF generation |
| CSV Export | papaparse | dynamic | CSV backup/export |
| i18n | i18next + react-i18next | ^23 / ^14 | French/English |
| Icons | lucide-react | ^0.400 | Tree-shaken icons |
| Date Handling | date-fns | ^3.0 | Lightweight date utilities |

**Total Initial Bundle Target:** ~100-120KB gzipped (PocketBase SDK is ~15KB).

---

## 3. Data Flow & Sync Strategy

### 3.1 Write Flow (Contribution Added)

```
User taps "Save"
    │
    ▼
┌─────────────────┐
│ 1. VALIDATE     │ ← Check required fields, amount > 0
│    (local)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. WRITE TO     │ ← Dexie.js transaction
│    DEXIE        │    Status: 'pending'
│    (instant)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. OPTIMISTIC   │ ← Zustand store updates UI
│    UI UPDATE    │    User sees success immediately
│    (instant)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. QUEUE FOR    │ ← Add to sync queue (in-memory Set)
│    SYNC         │
│    (instant)    │
└────────┬────────┘
         │
         ▼ (async, background)
┌─────────────────┐
│ 5. ATTEMPT      │ ← If online, POST to PocketBase
│    POCKETBASE   │    If success: update Dexie status → 'synced'
│    SYNC         │    If fail: keep 'pending', retry later
│    (200-300ms)  │
└─────────────────┘
```

### 3.2 Read Flow (Dashboard Load)

```
User opens Dashboard
    │
    ▼
┌─────────────────┐
│ 1. READ FROM    │ ← Dexie.js query
│    DEXIE        │    No network involved
│    (<10ms)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. RENDER UI    │ ← React renders with local data
│    (instant)    │
└────────┬────────┘
         │
         ▼ (background, non-blocking)
┌─────────────────┐
│ 3. CHECK FOR    │ ← Query PocketBase for updates
│    REMOTE       │    since last sync timestamp
│    CHANGES      │    Merge into Dexie if newer
│    (optional)   │
└─────────────────┘
```

### 3.3 Initial Load / Restore Flow (New Phone)

```
User installs app on new phone
    │
    ▼
┌─────────────────┐
│ 1. LOGIN        │ ← Auth against PocketBase
│    (required)   │    Email + password
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. FULL SYNC    │ ← Download all records from PocketBase
│    FROM SERVER  │    Write to Dexie
│    (5-10s)      │    Show progress indicator
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. APP READY    │ ← All data local, works offline
│    (normal ops) │
└─────────────────┘
```

---

## 4. Database Schema

### 4.1 Dexie.js Schema (Client-Side)

```typescript
// src/db/dexie-schema.ts

export interface Member {
  id: string;              // UUID (same as PocketBase)
  name: string;
  phone: string;           // WhatsApp number, +237 format
  joinDate: Date;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  pbId?: string;           // PocketBase record ID (for mapping)
}

export interface Cycle {
  id: string;              // UUID
  name: string;            // e.g., "Tontine Famille 2026"
  amountPerPerson: number; // XAF, integer only
  frequency: 'weekly' | 'monthly';
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed';
  memberIds: string[];     // Ordered member list
  payoutOrder: string[];   // Rotation order for payouts
  currentRound: number;    // 1-indexed
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  pbId?: string;
}

export interface Contribution {
  id: string;              // UUID
  cycleId: string;
  memberId: string;
  amount: number;          // XAF, integer
  date: Date;
  method: 'cash' | 'mtn' | 'orange' | 'other';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  pbId?: string;
}

export interface Payout {
  id: string;              // UUID
  cycleId: string;
  memberId: string;        // Who received this round
  amount: number;          // Total distributed
  roundNumber: number;     // 1st, 2nd, etc.
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  pbId?: string;
}

// Local-only settings (not synced)
export interface AppSettings {
  id: 'settings';          // Singleton
  language: 'fr' | 'en';
  lastSyncAt?: Date;       // Last successful sync timestamp
  adminEmail?: string;
  pbToken?: string;        // PocketBase auth token
}
```

```typescript
// src/db/dexie.ts
import Dexie, { type EntityTable } from 'dexie';
import type { Member, Cycle, Contribution, Payout, AppSettings } from './dexie-schema';

export const db = new Dexie('TontineDB') as Dexie & {
  members: EntityTable<Member, 'id'>;
  cycles: EntityTable<Cycle, 'id'>;
  contributions: EntityTable<Contribution, 'id'>;
  payouts: EntityTable<Payout, 'id'>;
  settings: EntityTable<AppSettings, 'id'>;
};

db.version(1).stores({
  members: 'id, name, phone, [syncStatus+updatedAt]',
  cycles: 'id, name, status, startDate, [syncStatus+updatedAt]',
  contributions: 'id, cycleId, memberId, date, [cycleId+memberId], [syncStatus+updatedAt]',
  payouts: 'id, cycleId, roundNumber, date, [syncStatus+updatedAt]',
  settings: 'id'
});
```

### 4.2 PocketBase Collections (Server-Side)

Create these collections in PocketBase Admin UI:

**Collection: `members`**
```
name        (text, required)
phone       (text, required)
joinDate    (date, required)
created     (autogenerate)
updated     (autogenerate)
owner       (relation to users, required)  ← admin only
```

**Collection: `cycles`**
```
name            (text, required)
amountPerPerson (number, required, min: 0)
frequency       (select: weekly|monthly, required)
startDate       (date, required)
endDate         (date)
status          (select: active|completed, required)
memberIds       (json, array of member IDs)
payoutOrder     (json, array of member IDs)
currentRound    (number, default: 1)
created         (autogenerate)
updated         (autogenerate)
owner           (relation to users, required)
```

**Collection: `contributions`**
```
cycleId     (relation to cycles, required)
memberId    (relation to members, required)
amount      (number, required, min: 0)
date        (date, required)
method      (select: cash|mtn|orange|other, required)
notes       (text)
created     (autogenerate)
updated     (autogenerate)
owner       (relation to users, required)
```

**Collection: `payouts`**
```
cycleId     (relation to cycles, required)
memberId    (relation to members, required)
amount      (number, required, min: 0)
roundNumber (number, required)
date        (date, required)
created     (autogenerate)
updated     (autogenerate)
owner       (relation to users, required)
```

**API Rules (all collections):**
```javascript
// List/View: @request.auth.id != "" && owner = @request.auth.id
// Create: @request.auth.id != "" 
// Update: @request.auth.id != "" && owner = @request.auth.id
// Delete: @request.auth.id != "" && owner = @request.auth.id
```

---

## 5. Sync Layer Implementation

### 5.1 PocketBase Client Setup

```typescript
// src/services/pocketbase.ts
import PocketBase from 'pocketbase';
import { db } from '../db/dexie';

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://your-pb-instance.com';

export const pb = new PocketBase(POCKETBASE_URL);

// Auto-save auth token to Dexie
pb.authStore.onChange(async (token, model) => {
  await db.settings.put({
    id: 'settings',
    language: (await db.settings.get('settings'))?.language || 'fr',
    adminEmail: model?.email,
    pbToken: token
  });
});

// Restore auth on app load
export async function restoreAuth(): Promise<boolean> {
  const settings = await db.settings.get('settings');
  if (settings?.pbToken) {
    pb.authStore.save(settings.pbToken, null as any);
    try {
      // Validate token
      await pb.collection('users').authRefresh();
      return pb.authStore.isValid;
    } catch {
      pb.authStore.clear();
      return false;
    }
  }
  return false;
}
```

### 5.2 Sync Engine

```typescript
// src/services/sync-engine.ts
import { pb } from './pocketbase';
import { db } from '../db/dexie';
import type { Member, Cycle, Contribution, Payout } from '../db/dexie-schema';

// In-memory sync queue (deduplicated)
const syncQueue = new Set<string>();
let isSyncing = false;

// ─── PUSH: Local → PocketBase ───

export function queueSync(recordId: string) {
  syncQueue.add(recordId);
  debouncedSync();
}

let syncTimeout: ReturnType<typeof setTimeout>;
function debouncedSync() {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => flushSyncQueue(), 2000);
}

export async function flushSyncQueue(): Promise<void> {
  if (isSyncing || syncQueue.size === 0) return;
  if (!navigator.onLine || !pb.authStore.isValid) return;

  isSyncing = true;
  const ids = Array.from(syncQueue);
  syncQueue.clear();

  try {
    for (const id of ids) {
      await syncRecord(id);
    }
    // Update last sync timestamp
    await db.settings.update('settings', { lastSyncAt: new Date() });
  } catch (err) {
    console.error('Sync failed:', err);
    // Re-queue failed items
    ids.forEach(id => syncQueue.add(id));
  } finally {
    isSyncing = false;
  }
}

async function syncRecord(id: string): Promise<void> {
  // Try each collection
  const member = await db.members.get(id);
  if (member) return syncMember(member);

  const cycle = await db.cycles.get(id);
  if (cycle) return syncCycle(cycle);

  const contribution = await db.contributions.get(id);
  if (contribution) return syncContribution(contribution);

  const payout = await db.payouts.get(id);
  if (payout) return syncPayout(payout);
}

async function syncMember(member: Member): Promise<void> {
  const data = {
    name: member.name,
    phone: member.phone,
    joinDate: member.joinDate.toISOString().split('T')[0],
    owner: pb.authStore.model?.id
  };

  if (member.pbId) {
    await pb.collection('members').update(member.pbId, data);
  } else {
    const record = await pb.collection('members').create(data);
    await db.members.update(member.id, { pbId: record.id, syncStatus: 'synced' });
    return;
  }

  await db.members.update(member.id, { syncStatus: 'synced' });
}

async function syncCycle(cycle: Cycle): Promise<void> {
  const data = {
    name: cycle.name,
    amountPerPerson: cycle.amountPerPerson,
    frequency: cycle.frequency,
    startDate: cycle.startDate.toISOString().split('T')[0],
    endDate: cycle.endDate?.toISOString().split('T')[0] || null,
    status: cycle.status,
    memberIds: cycle.memberIds,
    payoutOrder: cycle.payoutOrder,
    currentRound: cycle.currentRound,
    owner: pb.authStore.model?.id
  };

  if (cycle.pbId) {
    await pb.collection('cycles').update(cycle.pbId, data);
  } else {
    const record = await pb.collection('cycles').create(data);
    await db.cycles.update(cycle.id, { pbId: record.id, syncStatus: 'synced' });
    return;
  }

  await db.cycles.update(cycle.id, { syncStatus: 'synced' });
}

async function syncContribution(contribution: Contribution): Promise<void> {
  // Resolve pbIds for relations
  const member = await db.members.get(contribution.memberId);
  const cycle = await db.cycles.get(contribution.cycleId);

  if (!member?.pbId || !cycle?.pbId) {
    // Dependencies not yet synced, re-queue
    syncQueue.add(contribution.id);
    return;
  }

  const data = {
    cycleId: cycle.pbId,
    memberId: member.pbId,
    amount: contribution.amount,
    date: contribution.date.toISOString().split('T')[0],
    method: contribution.method,
    notes: contribution.notes || '',
    owner: pb.authStore.model?.id
  };

  if (contribution.pbId) {
    await pb.collection('contributions').update(contribution.pbId, data);
  } else {
    const record = await pb.collection('contributions').create(data);
    await db.contributions.update(contribution.id, { pbId: record.id, syncStatus: 'synced' });
    return;
  }

  await db.contributions.update(contribution.id, { syncStatus: 'synced' });
}

async function syncPayout(payout: Payout): Promise<void> {
  const member = await db.members.get(payout.memberId);
  const cycle = await db.cycles.get(payout.cycleId);

  if (!member?.pbId || !cycle?.pbId) {
    syncQueue.add(payout.id);
    return;
  }

  const data = {
    cycleId: cycle.pbId,
    memberId: member.pbId,
    amount: payout.amount,
    roundNumber: payout.roundNumber,
    date: payout.date.toISOString().split('T')[0],
    owner: pb.authStore.model?.id
  };

  if (payout.pbId) {
    await pb.collection('payouts').update(payout.pbId, data);
  } else {
    const record = await pb.collection('payouts').create(data);
    await db.payouts.update(payout.id, { pbId: record.id, syncStatus: 'synced' });
    return;
  }

  await db.payouts.update(payout.id, { syncStatus: 'synced' });
}

// ─── PULL: PocketBase → Local ───

export async function pullFromServer(): Promise<void> {
  if (!navigator.onLine || !pb.authStore.isValid) return;

  const settings = await db.settings.get('settings');
  const lastSync = settings?.lastSyncAt;

  const filter = lastSync 
    ? `updated >= "${lastSync.toISOString()}"` 
    : '';

  await Promise.all([
    pullCollection('members', filter),
    pullCollection('cycles', filter),
    pullCollection('contributions', filter),
    pullCollection('payouts', filter)
  ]);

  await db.settings.update('settings', { lastSyncAt: new Date() });
}

async function pullCollection(
  collectionName: string, 
  filter: string
): Promise<void> {
  const records = await pb.collection(collectionName).getFullList({
    filter,
    sort: '-updated'
  });

  for (const record of records) {
    // Map PocketBase record to Dexie schema
    const localRecord = mapToLocal(collectionName, record);

    // Upsert: only update if server version is newer
    const existing = await (db as any)[collectionName].get(record.id);
    if (!existing || new Date(record.updated) > existing.updatedAt) {
      await (db as any)[collectionName].put({
        ...localRecord,
        syncStatus: 'synced' as const
      });
    }
  }
}

function mapToLocal(collection: string, record: any): any {
  const base = {
    pbId: record.id,
    createdAt: new Date(record.created),
    updatedAt: new Date(record.updated),
    syncStatus: 'synced' as const
  };

  switch (collection) {
    case 'members':
      return {
        id: record.id, // Use PB ID as local ID for simplicity
        name: record.name,
        phone: record.phone,
        joinDate: new Date(record.joinDate),
        ...base
      };
    case 'cycles':
      return {
        id: record.id,
        name: record.name,
        amountPerPerson: record.amountPerPerson,
        frequency: record.frequency,
        startDate: new Date(record.startDate),
        endDate: record.endDate ? new Date(record.endDate) : undefined,
        status: record.status,
        memberIds: record.memberIds,
        payoutOrder: record.payoutOrder,
        currentRound: record.currentRound,
        ...base
      };
    case 'contributions':
      return {
        id: record.id,
        cycleId: record.cycleId,
        memberId: record.memberId,
        amount: record.amount,
        date: new Date(record.date),
        method: record.method,
        notes: record.notes,
        ...base
      };
    case 'payouts':
      return {
        id: record.id,
        cycleId: record.cycleId,
        memberId: record.memberId,
        amount: record.amount,
        roundNumber: record.roundNumber,
        date: new Date(record.date),
        ...base
      };
    default:
      return record;
  }
}

// ─── FULL RESTORE (New Device) ───

export async function fullRestore(): Promise<void> {
  if (!pb.authStore.isValid) throw new Error('Not authenticated');

  // Clear local data
  await db.members.clear();
  await db.cycles.clear();
  await db.contributions.clear();
  await db.payouts.clear();

  // Pull everything
  await pullFromServer();
}

// ─── REAL-TIME SUBSCRIPTIONS ───

let unsubscribeFns: (() => void)[] = [];

export function startRealtimeSync(): void {
  if (!pb.authStore.isValid) return;

  const collections = ['members', 'cycles', 'contributions', 'payouts'];

  for (const collection of collections) {
    pb.collection(collection).subscribe('*', (e) => {
      handleRealtimeEvent(collection, e);
    }).then((unsub) => {
      unsubscribeFns.push(unsub);
    });
  }
}

export function stopRealtimeSync(): void {
  unsubscribeFns.forEach(fn => fn());
  unsubscribeFns = [];
}

async function handleRealtimeEvent(collection: string, e: any): Promise<void> {
  const localRecord = mapToLocal(collection, e.record);

  switch (e.action) {
    case 'create':
    case 'update':
      await (db as any)[collection].put({
        ...localRecord,
        syncStatus: 'synced' as const
      });
      break;
    case 'delete':
      await (db as any)[collection].delete(e.record.id);
      break;
  }
}

// ─── NETWORK LISTENERS ───

window.addEventListener('online', () => {
  flushSyncQueue();
  pullFromServer();
});

// Flush before page unload
window.addEventListener('beforeunload', () => {
  if (syncQueue.size > 0) {
    // Use sendBeacon for best-effort sync
    // Or just rely on next session
  }
});
```

### 5.3 Zustand Store with Sync Integration

```typescript
// src/stores/useCycleStore.ts
import { create } from 'zustand';
import { db } from '../db/dexie';
import { queueSync, pullFromServer } from '../services/sync-engine';
import type { Cycle, Contribution, Member, Payout } from '../db/dexie-schema';

interface CycleState {
  cycles: Cycle[];
  members: Member[];
  contributions: Contribution[];
  payouts: Payout[];
  isLoading: boolean;
  isSyncing: boolean;
  pendingCount: number;

  // Actions
  loadAll: () => Promise<void>;
  addMember: (data: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'pbId'>) => Promise<void>;
  addCycle: (data: Omit<Cycle, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'pbId'>) => Promise<void>;
  addContribution: (data: Omit<Contribution, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'pbId'>) => Promise<void>;
  addPayout: (data: Omit<Payout, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'pbId'>) => Promise<void>;
  getMemberTotal: (memberId: string, cycleId: string) => number;
  getCycleTotal: (cycleId: string) => number;
  refreshFromServer: () => Promise<void>;
}

export const useCycleStore = create<CycleState>((set, get) => ({
  cycles: [],
  members: [],
  contributions: [],
  payouts: [],
  isLoading: false,
  isSyncing: false,
  pendingCount: 0,

  loadAll: async () => {
    set({ isLoading: true });
    const [cycles, members, contributions, payouts] = await Promise.all([
      db.cycles.toArray(),
      db.members.toArray(),
      db.contributions.toArray(),
      db.payouts.toArray()
    ]);

    const pendingCount = [...members, ...cycles, ...contributions, ...payouts]
      .filter(r => r.syncStatus === 'pending').length;

    set({ cycles, members, contributions, payouts, pendingCount, isLoading: false });
  },

  addMember: async (data) => {
    const id = crypto.randomUUID();
    const now = new Date();
    const member: Member = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    };

    await db.members.add(member);
    queueSync(id);
    get().loadAll();
  },

  addCycle: async (data) => {
    const id = crypto.randomUUID();
    const now = new Date();
    const cycle: Cycle = {
      ...data,
      id,
      currentRound: 1,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    };

    await db.cycles.add(cycle);
    queueSync(id);
    get().loadAll();
  },

  addContribution: async (data) => {
    const id = crypto.randomUUID();
    const now = new Date();
    const contribution: Contribution = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    };

    await db.contributions.add(contribution);
    queueSync(id);
    get().loadAll();
  },

  addPayout: async (data) => {
    const id = crypto.randomUUID();
    const now = new Date();
    const payout: Payout = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    };

    await db.payouts.add(payout);
    queueSync(id);
    get().loadAll();
  },

  getMemberTotal: (memberId, cycleId) => {
    return get().contributions
      .filter(c => c.memberId === memberId && c.cycleId === cycleId)
      .reduce((sum, c) => sum + c.amount, 0);
  },

  getCycleTotal: (cycleId) => {
    return get().contributions
      .filter(c => c.cycleId === cycleId)
      .reduce((sum, c) => sum + c.amount, 0);
  },

  refreshFromServer: async () => {
    set({ isSyncing: true });
    await pullFromServer();
    await get().loadAll();
    set({ isSyncing: false });
  }
}));
```

---

## 6. Authentication Flow

### 6.1 Auth Store

```typescript
// src/stores/useAuthStore.ts
import { create } from 'zustand';
import { pb, restoreAuth } from '../services/pocketbase';
import { fullRestore } from '../services/sync-engine';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  init: async () => {
    const isValid = await restoreAuth();
    if (isValid) {
      set({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: pb.authStore.model!.id,
          email: pb.authStore.model!.email
        }
      });
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const auth = await pb.collection('users').authWithPassword(email, password);
    set({
      isAuthenticated: true,
      user: { id: auth.record.id, email: auth.record.email }
    });
    // Restore data from server
    await fullRestore();
  },

  register: async (email, password) => {
    await pb.collection('users').create({ email, password, passwordConfirm: password });
    // Auto-login after register
    await useAuthStore.getState().login(email, password);
  },

  logout: async () => {
    pb.authStore.clear();
    // Clear local data on logout
    await db.members.clear();
    await db.cycles.clear();
    await db.contributions.clear();
    await db.payouts.clear();
    set({ isAuthenticated: false, user: null });
  }
}));
```

### 6.2 Auth Screen

```tsx
// src/screens/Auth.tsx
import { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTranslation } from 'react-i18next';

export default function Auth() {
  const { t } = useTranslation();
  const { login, register, isLoading } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-emerald-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-1">Tontine</h1>
        <p className="text-gray-500 text-center text-sm mb-6">
          {isLogin ? 'Connectez-vous' : 'Créez un compte'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isLoading ? 'Chargement...' : isLogin ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-center text-emerald-600 text-sm mt-4"
        >
          {isLogin ? 'Pas de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </div>
    </div>
  );
}
```

---

## 7. App Entry Point with Auth Guard

```tsx
// src/App.tsx
import { useEffect } from 'react';
import { useAuthStore } from './stores/useAuthStore';
import { useCycleStore } from './stores/useCycleStore';
import { startRealtimeSync, stopRealtimeSync } from './services/sync-engine';
import Layout from './components/layout/Layout';
import Auth from './screens/Auth';
import Dashboard from './screens/Dashboard';
import CycleDetail from './screens/CycleDetail';
import AddContribution from './screens/AddContribution';
import Members from './screens/Members';
import Settings from './screens/Settings';

const screens = {
  dashboard: Dashboard,
  cycleDetail: CycleDetail,
  addContribution: AddContribution,
  members: Members,
  settings: Settings
};

export default function App() {
  const { isAuthenticated, isLoading, init } = useAuthStore();
  const { screen } = useAppStore();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      startRealtimeSync();
      return () => stopRealtimeSync();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-emerald-600">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  const Screen = screens[screen] || Dashboard;

  return (
    <Layout>
      <Screen />
    </Layout>
  );
}
```

---

## 8. Updated Package.json

```json
{
  "name": "tontine-pwa",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "date-fns": "^3.6.0",
    "dexie": "^4.0.8",
    "i18next": "^23.11.5",
    "lucide-react": "^0.400.0",
    "pocketbase": "^0.21.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-i18next": "^14.1.2",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.3.1",
    "vite-plugin-pwa": "^0.20.0"
  }
}
```

---

## 9. Environment Variables

```bash
# .env
VITE_POCKETBASE_URL=https://your-pocketbase-instance.com
```

```bash
# .env.local (for development)
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

---

## 10. Deployment Checklist

### 10.1 PocketBase Server Setup

1. **Provision VPS** (Hetzner CX11, Germany)
2. **Download PocketBase:**
   ```bash
   wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_linux_amd64.zip
   unzip pocketbase_linux_amd64.zip
   chmod +x pocketbase
   ```
3. **Create systemd service:**
   ```ini
   # /etc/systemd/system/pocketbase.service
   [Unit]
   Description=PocketBase
   After=network.target

   [Service]
   Type=simple
   User=pocketbase
   WorkingDirectory=/opt/pocketbase
   ExecStart=/opt/pocketbase/pocketbase serve --http=0.0.0.0:8090
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
4. **Configure Caddy reverse proxy (auto-HTTPS):**
   ```
   your-domain.com {
     reverse_proxy localhost:8090
   }
   ```
5. **Create admin account** via web UI
6. **Create collections** (members, cycles, contributions, payouts) with API rules
7. **Enable CORS** for your PWA domain

### 10.2 PWA Build & Deploy

```bash
# Build
npm run build

# Deploy dist/ to Cloudflare Pages / Netlify / Vercel
```

### 10.3 DNS & HTTPS
- Point domain to VPS (PocketBase)
- Point app subdomain to static host (PWA)
- Ensure HTTPS on both (required for PWA + auth)

---

## 11. Testing the Sync Layer

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Offline write | Turn off WiFi, add contribution | Saves to Dexie, shows pending |
| Online sync | Turn WiFi back on | Syncs to PocketBase, status → synced |
| Conflict resolution | Edit same record on two devices | Last-write-wins (PocketBase timestamp) |
| New device restore | Login on new phone | Full data download from PocketBase |
| App kill mid-sync | Kill app during sync | Resumes on next launch |
| Large dataset | 50 members, 1000 contributions | Sync completes in <10s |

---

## 12. Cost Breakdown

| Item | Cost/Month |
|------|-----------|
| Hetzner CX11 (Germany) | €4.51 |
| Domain (optional) | €1-10 |
| Cloudflare Pages (PWA hosting) | Free |
| **Total** | **~€5-15/month** |

---

## 13. Files Changed from v1.0

| File | Change |
|------|--------|
| `package.json` | Added `pocketbase`, `date-fns` |
| `src/db/dexie-schema.ts` | Added `pbId`, `syncStatus`, `updatedAt` fields |
| `src/db/dexie.ts` | Added composite indexes for sync queries |
| `src/services/pocketbase.ts` | **NEW** — PB client, auth restore |
| `src/services/sync-engine.ts` | **NEW** — Full bidirectional sync |
| `src/stores/useCycleStore.ts` | Added sync integration, pending count |
| `src/stores/useAuthStore.ts` | **NEW** — Auth state management |
| `src/screens/Auth.tsx` | **NEW** — Login/register screen |
| `src/App.tsx` | Added auth guard, realtime sync lifecycle |
| `.env` | **NEW** — PocketBase URL config |

---

## 14. Critical Implementation Notes

1. **Always write to Dexie first.** PocketBase is secondary.
2. **Use `pbId` for mapping.** Local UUIDs and PocketBase IDs may differ.
3. **Queue syncs, don't await them.** User should never wait for network.
4. **Handle relation dependencies.** Contributions need members/cycles synced first.
5. **Show sync status subtly.** Small indicator, never blocking.
6. **Test on real 3G.** Germany latency + slow bandwidth = realistic test.
7. **Backup PocketBase SQLite.** Daily automated backups to S3/B2.

---

*Document Version: 2.0*  
*Architecture: PocketBase + Dexie.js Offline-First Sync*  
*Last Updated: 2026-05-21*
