## ShipTrack – Vercel Scheduler Worker

This optional worker lets you keep using Firebase Spark (free) by moving the scheduled polling + email notifications to Vercel’s free serverless cron.

### How it works

1. Vercel Cron hits `api/poll` on the schedule you define in `vercel.json`.
2. The function reads active shipments from Firestore, calls the carrier API (logic to be implemented in `fetchCarrierStatus`), and updates documents when statuses change.
3. When a status changes, it sends an email via SendGrid and stores any tracking events.

### Deploy instructions

1. **Create a Vercel project**
   ```bash
   vercel login
   vercel link
   ```
   Link the `serverless/vercel` folder to a new Vercel project.

2. **Install dependencies & compile locally (optional)**
   ```bash
   npm install
   npm run build
   ```
   Vercel runs `npm install` automatically at deploy time, but building once locally helps catch errors.

3. **Set environment variables**

   | Key | Value |
   | --- | --- |
   | `FIREBASE_SERVICE_ACCOUNT` | Base64-encoded Firebase service account JSON |
   | `SENDGRID_API_KEY` | SendGrid API key |
   | `MAIL_FROM` | Verified sender email (e.g. `alerts@yourdomain.com`) |
   | `CRON_SECRET` | Random string that Vercel will send as a query param |
   | `MAERSK_API_KEY` / `HMM_API_KEY` | Optional carrier credentials if you call their APIs |

   Example for base64 encoding:
   ```bash
   base64 -i serviceAccount.json | tr -d '\n'
   ```
   Then add the output in Vercel dashboard → Settings → Environment Variables.

4. **Define cron schedule**

   Create `vercel.json` alongside `package.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/poll?secret=YOUR_SECRET",
         "schedule": "*/30 * * * *"
       }
     ]
   }
   ```

5. **Deploy**
   ```bash
   vercel deploy --prod
   ```

6. **Implement carrier lookups**

   Replace the TODO in `api/poll.ts` with real integrations. You can lift the logic from `functions/src/tracking.ts` or call another microservice.

### Firestore security

The worker uses a full Firebase service account, so Firestore security rules do not block it. Create a dedicated service account with minimal permissions (Firestore User, Cloud Functions Invoker) to reduce risk.

### Testing locally

Vercel CLI lets you run the function:
```bash
vercel dev
# in another terminal:
curl "http://localhost:3000/api/poll?secret=YOUR_SECRET"
```

Ensure you export the same environment variables locally or add them to a `.env` file (not committed).
