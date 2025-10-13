import sgMail from '@sendgrid/mail';
import { logger } from 'firebase-functions';
import { getSecret } from 'firebase-functions/params';

const sendgridApiKey = getSecret('SENDGRID_API_KEY');

type StatusEmailPayload = {
  to: string;
  trackingNumber: string;
  carrier: string;
  previousStatus: string;
  currentStatus: string;
};

const getApiKey = async () => {
  try {
    return await sendgridApiKey.value();
  } catch (err) {
    logger.warn('SendGrid API key not configured', err);
    return undefined;
  }
};

export const sendStatusEmail = async (payload: StatusEmailPayload) => {
  const apiKey = await getApiKey();

  if (!apiKey) {
    logger.warn('Skipping email notification because SendGrid API key is missing', payload);
    return;
  }

  sgMail.setApiKey(apiKey);

  const msg = {
    to: payload.to,
    from: 'no-reply@shiptrack.app',
    subject: `Shipment ${payload.trackingNumber} status update`,
    html: `
      <h2>New status update</h2>
      <p><strong>Carrier:</strong> ${payload.carrier.toUpperCase()}</p>
      <p><strong>Tracking number:</strong> ${payload.trackingNumber}</p>
      <p><strong>Previous status:</strong> ${payload.previousStatus}</p>
      <p><strong>Current status:</strong> ${payload.currentStatus}</p>
      <p>You can view full details in the ShipTrack dashboard.</p>
    `
  };

  try {
    await sgMail.send(msg);
  } catch (err) {
    logger.error('Failed to send email', { error: (err as Error).message, payload });
    throw err;
  }
};
