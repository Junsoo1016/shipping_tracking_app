import axios from 'axios';
import { logger } from 'firebase-functions';

export type TrackingEvent = {
  id: string;
  status: string;
  description: string;
  location?: string;
  timestamp: string;
};

export type TrackingPayload = {
  status: string;
  events: TrackingEvent[];
};

export const fetchCarrierStatus = async (
  carrier: 'maersk' | 'hmm' | 'other',
  trackingNumber: string
): Promise<TrackingPayload | null> => {
  switch (carrier) {
    case 'maersk':
      return fetchMaerskStatus(trackingNumber);
    case 'hmm':
      return fetchHmmStatus(trackingNumber);
    default:
      logger.info('Carrier not implemented, skipping sync', { carrier, trackingNumber });
      return null;
  }
};

const fetchMaerskStatus = async (trackingNumber: string): Promise<TrackingPayload | null> => {
  if (!process.env.MAERSK_API_KEY) {
    logger.warn('MAERSK_API_KEY missing, skipping Maersk sync');
    return null;
  }

  try {
    const response = await axios.get('https://api.maersk.com/track/v1/shipments', {
      params: { referenceType: 'CONTAINER', referenceValue: trackingNumber },
      headers: {
        Accept: 'application/json',
        'x-api-key': process.env.MAERSK_API_KEY
      },
      timeout: 10000
    });

    const data = response.data;
    const status = data?.schedules?.[0]?.transportPlanStage?.[0]?.transportStatus ?? 'unknown';

    const events: TrackingEvent[] =
      data?.events?.map((event: any) => ({
        id: `${event.eventCode}-${event.eventDateTime}`,
        status: event.eventCode,
        description: event.eventDescription,
        location: event.location?.name,
        timestamp: event.eventDateTime
      })) ?? [];

    return { status, events };
  } catch (err) {
    logger.error('Maersk status sync failed', { trackingNumber, error: (err as Error).message });
    return null;
  }
};

const fetchHmmStatus = async (trackingNumber: string): Promise<TrackingPayload | null> => {
  if (!process.env.HMM_API_KEY) {
    logger.warn('HMM_API_KEY missing, skipping HMM sync');
    return null;
  }

  try {
    const response = await axios.get('https://api.hmm21.com/track', {
      params: { trackingNumber },
      headers: {
        Accept: 'application/json',
        'x-api-key': process.env.HMM_API_KEY
      },
      timeout: 10000
    });

    const data = response.data;
    const status = data?.status ?? 'unknown';
    const events: TrackingEvent[] =
      data?.events?.map((event: any) => ({
        id: `${event.code}-${event.datetime}`,
        status: event.code,
        description: event.description,
        location: event.location,
        timestamp: event.datetime
      })) ?? [];

    return { status, events };
  } catch (err) {
    logger.error('HMM status sync failed', { trackingNumber, error: (err as Error).message });
    return null;
  }
};
