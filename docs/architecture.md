## Overview

The shipping tracking app combines a React frontend with Firebase services to monitor container or bill of lading numbers from multiple carriers. Users register tracking identifiers, receive email notifications when statuses change, and archive completed shipments.

## Core Requirements

- **Authentication:** Firebase Authentication with email/password (extensible to identity providers).
- **Data Storage:** Firestore collections for users, shipments, tracking history, and archived items.
- **Email Notifications:** Cloud Functions scheduled to poll carrier APIs, updating Firestore and sending notifications via Firebase Trigger + SendGrid (or similar).
- **User Interface:** React app with Dashboard, Monitor (Active/Archive), and Admin (User management).
- **Security:** Firestore security rules enforce per-user access; admin role gating for management screens.

## High-Level Architecture

```text
React (Vite) App
  └─ Firebase Web SDK
       ├─ Auth (email/password)
       ├─ Firestore (shipments, history, alerts)
       ├─ Cloud Functions (status polling, notifications)
       └─ Cloud Scheduler → HTTPS Function (carrier polling)
```

## Data Model Sketch

- `users`: profile document per Firebase auth UID with role metadata.
- `shipments`: references to carrier (`maersk`, `hmm`), tracking number, owner UID, status, archive flag.
- `trackingEvents`: sub-collection per shipment with timestamped updates.
- `alerts`: pending notification records (optional, processed by Cloud Function).

## Status Polling & Notifications

1. Cloud Scheduler triggers `pollCarrierUpdates` HTTP function on an interval.
2. Function fetches live status from external carrier APIs (requires carrier API keys or scraping layer).
3. Updates Firestore shipment status + tracking events.
4. When status changes or reaches completion, enqueue email notification (`sendStatusEmail` function using SendGrid or Mailgun).

## Frontend Navigation

- **Dashboard:** summary cards (active shipments, in-transit, delivered) and recent updates.
- **Monitor → Active:** list of current shipments with quick status view and detail modal.
- **Monitor → Archive:** delivered shipments, with restore/delete options.
- **Admin → Users:** list of registered users, role management (admins only).

## Security & Roles

- Default `user` role: can manage own shipments.
- `admin` role: can manage all shipments and user roles.
- Firestore rule snippet:

```js
match /shipments/{id} {
  allow read, write: if request.auth != null &&
    (resource.data.ownerUid == request.auth.uid ||
     request.auth.token.role == 'admin');
}
```

Role claims stored in Auth custom claims set via admin function.

## Email Workflow

- Store mail provider API key in Firebase Functions config (`firebase functions:config:set sendgrid.key="..."`).
- `sendStatusEmail` triggered when shipments updated with new status or on completion.
- Archive toggling stops further polling by marking `archived = true`.

## Next Steps

- Implement frontend pages consuming Firestore collections.
- Build Cloud Function integrating actual carrier tracking APIs.
- Configure Firebase project (Auth providers, Firestore indexes, Scheduler, Functions env).
