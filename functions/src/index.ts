import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { sendStatusEmail } from './mail';
import { fetchCarrierStatus } from './tracking';

setGlobalOptions({ region: 'asia-northeast3', maxInstances: 5 });

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

type ShipmentDoc = {
  carrier: 'maersk' | 'hmm' | 'other';
  trackingNumber: string;
  status: string;
  ownerUid: string;
  archived: boolean;
  lastUpdatedAt: string;
};

export const setUserRole = onCall(async request => {
  if (!request.auth) {
    throw new Error('Unauthenticated request');
  }

  if (request.auth.token.role !== 'admin') {
    throw new Error('Only administrators can update roles');
  }

  const { userId, role } = request.data as { userId: string; role: 'user' | 'admin' };

  if (!userId || !role) {
    throw new Error('Missing parameters: userId, role');
  }

  await auth.setCustomUserClaims(userId, { role });
  await db.collection('users').doc(userId).set({ role }, { merge: true });

  logger.info(`Role updated`, { userId, role, executor: request.auth.uid });

  return { success: true };
});

export const pollCarrierUpdates = onSchedule(
  {
    schedule: 'every 30 minutes',
    timeZone: 'Asia/Seoul'
  },
  async () => {
    const snapshot = await db
      .collection('shipments')
      .where('archived', '==', false)
      .get();

    const jobs = snapshot.docs.map(async docSnap => {
      const shipment = docSnap.data() as ShipmentDoc;
      try {
        const liveStatus = await fetchCarrierStatus(shipment.carrier, shipment.trackingNumber);

        if (!liveStatus) {
          return;
        }

        const updates: Partial<ShipmentDoc> = {};

        if (liveStatus.status && liveStatus.status !== shipment.status) {
          updates.status = liveStatus.status;
          updates.lastUpdatedAt = new Date().toISOString();
        }

        if (Object.keys(updates).length > 0) {
          await docSnap.ref.set(
            {
              ...updates
            },
            { merge: true }
          );

          if (liveStatus.events?.length) {
            const eventsCollection = docSnap.ref.collection('trackingEvents');
            for (const event of liveStatus.events) {
              await eventsCollection.doc(event.id).set(event, { merge: true });
            }
          }
        }
      } catch (err) {
        logger.error('Failed to sync shipment', {
          shipmentId: docSnap.id,
          carrier: shipment.carrier,
          trackingNumber: shipment.trackingNumber,
          error: (err as Error).message
        });
      }
    });

    await Promise.all(jobs);
  }
);

export const handleShipmentStatusChange = onDocumentWritten('shipments/{shipmentId}', async event => {
  const before = event.data?.before?.data() as ShipmentDoc | undefined;
  const after = event.data?.after?.data() as ShipmentDoc | undefined;

  if (!before || !after) {
    return;
  }

  if (before.status === after.status) {
    return;
  }

  const ownerDoc = await db.collection('users').doc(after.ownerUid).get();
  const ownerEmail = ownerDoc.data()?.email;

  if (!ownerEmail) {
    logger.warn('Owner email not found for shipment', { shipmentId: event.params.shipmentId });
    return;
  }

  await sendStatusEmail({
    to: ownerEmail,
    trackingNumber: after.trackingNumber,
    carrier: after.carrier,
    previousStatus: before.status,
    currentStatus: after.status
  });
});
