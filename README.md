# ShipTrack – Ocean Freight Tracking

ShipTrack lets you register Maersk, HMM, or custom container numbers once and receive automated status updates by email. The frontend is a React (Vite + TypeScript) dashboard and the backend uses Firebase (Auth, Firestore, Cloud Functions, Cloud Scheduler).

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React SPA with dashboard, Monitor (active/archive), and admin user management |
| `functions/` | Firebase Cloud Functions for role management, carrier polling, and email notifications |
| `firebase/` | Firestore security rules and indexes |
| `docs/` | Architecture notes |

## Prerequisites

- Node.js 18+
- npm or pnpm
- Firebase CLI (`npm install -g firebase-tools`)
- SendGrid (or another email provider) API key
- Carrier tracking API keys or scraping proxy (Maersk + HMM placeholders included)

## Frontend setup (`frontend/`)

1. Install packages:
   ```bash
   cd frontend
   npm install
   ```
2. Create `.env.local`:
   ```bash
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```

### Frontend features

- Email/password authentication (Firebase Auth).
- Dashboard with KPI cards + recent updates.
- Monitor → Active: register new shipments, view live statuses, archive.
- Monitor → Archive: view delivered shipments, restore if needed.
- Admin → Users: manage roles via callable function (visible to admins only).

## Firebase setup

1. Initialize your Firebase project and set the default project for this repo:
   ```bash
   firebase use <your-project-id>
   ```
2. Install dependencies:
   ```bash
   cd functions
   npm install
   ```
3. Set required secrets (SendGrid + carrier APIs):
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   firebase functions:secrets:set MAERSK_API_KEY
   firebase functions:secrets:set HMM_API_KEY
   ```
4. (Optional) Add Firestore Indexes & Rules locally first:
   ```bash
   firebase emulators:start
   ```
5. Deploy:
   ```bash
   npm run deploy
   ```

## Cloud Functions

| Function | Trigger | Description |
| --- | --- | --- |
| `setUserRole` | Callable (HTTPS) | Admin-only role updates and Firestore user doc sync |
| `pollCarrierUpdates` | Scheduled (every 30 min) | Fetches latest status via carrier APIs and updates Firestore |
| `handleShipmentStatusChange` | Firestore trigger | Sends email notification when shipment status changes |

- Carrier integrations live in `functions/src/tracking.ts`. Replace stub endpoints with your provider or scraping service.
- Emails are sent via SendGrid using the `SENDGRID_API_KEY` secret; update `from` address to match your verified sender.

## Firestore data model

- `users/{uid}`: `{ email, role }`
- `shipments/{id}`:
  ```json
  {
    "ownerUid": "firebase auth uid",
    "carrier": "maersk|hmm|other",
    "trackingNumber": "MSKU1234567",
    "status": "in_transit",
    "archived": false,
    "lastUpdatedAt": "ISO string",
    "eta": "...",
    "vesselName": "...",
    "portOfLoading": "...",
    "portOfDischarge": "..."
  }
  ```
- `shipments/{id}/trackingEvents/{eventId}`: `{ status, description, location, timestamp }`

## Authentication and roles

- New accounts register with email/password.
- `shipments` reads/writes are limited to the owner or admins using security rules in `firebase/firestore.rules`.
- Admins are identified via custom claims (`role == 'admin'`), set through the `setUserRole` callable function.

## Notifications + Archiving flow

1. `pollCarrierUpdates` fetches live data (replace with actual APIs).  
2. If status changes, Firestore doc updates.  
3. `handleShipmentStatusChange` sends the email and the frontend moves delivered shipments to Archive by toggling `archived = true`.  
4. Archived shipments are skipped by the scheduler to avoid redundant polling.

## Next steps

- Replace the mock carrier integrations with real API calls or a scraping microservice.
- Add background jobs or webhooks for providers offering push updates.
- Expand authentication (e.g., Google SSO) via Firebase Auth providers.
- Harden UI with optimistic updates, pagination, and charts.
