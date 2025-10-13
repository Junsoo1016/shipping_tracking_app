import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

type TrackingEvent = {
  id: string;
  status: string;
  description: string;
  location?: string;
  timestamp: string;
};

type TrackingPayload = {
  status: string;
  events: TrackingEvent[];
};

type ShipmentDoc = {
  carrier: 'maersk' | 'hmm' | 'other';
  trackingNumber: string;
  status: string;
  ownerUid: string;
  archived: boolean;
  lastUpdatedAt: string;
};

const getServiceAccount = () => {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var missing');
  }
  const json = Buffer.from(encoded, 'base64').toString('utf8');
  return JSON.parse(json);
};

const initFirebase = () => {
  if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  return admin.firestore();
};

const getSendGrid = () => {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) {
    throw new Error('SENDGRID_API_KEY env var missing');
  }
  sgMail.setApiKey(key);
  return sgMail;
};

const fetchCarrierStatus = async (
  carrier: ShipmentDoc['carrier'],
  trackingNumber: string
): Promise<TrackingPayload | null> => {
  // Reuse the logic from functions/src/tracking.ts, or call a custom API/microservice.
  // For now we return null to skip updates.
  console.info(`TODO: implement carrier sync for ${carrier} ${trackingNumber}`);
  return null;
};

const sendStatusEmail = async (payload: {
  to: string;
  trackingNumber: string;
  carrier: string;
  previousStatus: string;
  currentStatus: string;
}) => {
  const mail = getSendGrid();
  await mail.send({
    to: payload.to,
    from: process.env.MAIL_FROM ?? 'no-reply@shiptrack.app',
    subject: `Shipment ${payload.trackingNumber} status update`,
    html: `
      <h2>New status update</h2>
      <p><strong>Carrier:</strong> ${payload.carrier.toUpperCase()}</p>
      <p><strong>Tracking number:</strong> ${payload.trackingNumber}</p>
      <p><strong>Previous status:</strong> ${payload.previousStatus}</p>
      <p><strong>Current status:</strong> ${payload.currentStatus}</p>
      <p>View all details in the ShipTrack dashboard.</p>
    `
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }
  if (req.query.secret !== cronSecret) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  const db = initFirebase();
  const shipmentsSnapshot = await db
    .collection('shipments')
    .where('archived', '==', false)
    .get();

  if (shipmentsSnapshot.empty) {
    return res.status(200).json({ message: 'No active shipments' });
  }

  const updates = [];

  for (const docSnap of shipmentsSnapshot.docs) {
    const shipment = docSnap.data() as ShipmentDoc;
    try {
      const liveStatus = await fetchCarrierStatus(shipment.carrier, shipment.trackingNumber);
      if (!liveStatus || liveStatus.status === shipment.status) {
        continue;
      }

      const owner = await db.collection('users').doc(shipment.ownerUid).get();
      const ownerEmail = owner.data()?.email;

      updates.push(
        docSnap.ref.set(
          {
            status: liveStatus.status,
            lastUpdatedAt: new Date().toISOString()
          },
          { merge: true }
        )
      );

      if (liveStatus.events?.length) {
        const eventsCollection = docSnap.ref.collection('trackingEvents');
        for (const event of liveStatus.events) {
          updates.push(eventsCollection.doc(event.id).set(event, { merge: true }));
        }
      }

      if (ownerEmail) {
        await sendStatusEmail({
          to: ownerEmail,
          trackingNumber: shipment.trackingNumber,
          carrier: shipment.carrier,
          previousStatus: shipment.status,
          currentStatus: liveStatus.status
        });
      }
    } catch (err) {
      console.error('Failed to process shipment', docSnap.id, err);
    }
  }

  await Promise.all(updates);

  return res.status(200).json({ message: 'Sync complete', processed: shipmentsSnapshot.size });
}
