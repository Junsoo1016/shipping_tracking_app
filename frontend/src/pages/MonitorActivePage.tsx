import { FormEvent, useState } from 'react';
import Spinner from '../components/Spinner';
import { useShipments } from '../context/ShipmentsContext';
import { CarrierCode, ShipmentStatus } from '../types/shipment';
import styles from './MonitorPage.module.css';

const carriers: { label: string; value: CarrierCode }[] = [
  { label: 'Maersk', value: 'maersk' },
  { label: 'HMM', value: 'hmm' },
  { label: 'Other', value: 'other' }
];

const statuses: { label: string; value: ShipmentStatus }[] = [
  { label: 'Created', value: 'created' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Arrived Port', value: 'arrived_port' },
  { label: 'Out for Delivery', value: 'out_for_delivery' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Exception', value: 'exception' }
];

const MonitorActivePage = () => {
  const { loading, activeShipments, createShipment, toggleArchive } = useShipments();
  const [carrier, setCarrier] = useState<CarrierCode>('maersk');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [status, setStatus] = useState<ShipmentStatus>('created');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <Spinner />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createShipment({
        carrier,
        trackingNumber: trackingNumber.trim(),
        status,
        vesselName: '',
        eta: '',
        portOfLoading: '',
        portOfDischarge: ''
      });
      setTrackingNumber('');
      setStatus('created');
      setCarrier('maersk');
    } catch (err) {
      console.error(err);
      setError('Unable to create shipment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header>
        <h2>Active Shipments</h2>
        <p>Track live shipments and view their current status.</p>
      </header>

      <section className={styles.formCard}>
        <h3>Register Tracking Number</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Carrier
            <select value={carrier} onChange={event => setCarrier(event.target.value as CarrierCode)}>
              {carriers.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tracking / B.L Number
            <input
              required
              value={trackingNumber}
              onChange={event => setTrackingNumber(event.target.value)}
              placeholder="Enter container or B/L number"
            />
          </label>

          <label>
            Initial Status
            <select value={status} onChange={event => setStatus(event.target.value as ShipmentStatus)}>
              {statuses.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Registering…' : 'Add Shipment'}
          </button>
        </form>
      </section>

      <section>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Tracking #</span>
            <span>Carrier</span>
            <span>Status</span>
            <span>Last Updated</span>
            <span>Actions</span>
          </div>
          {activeShipments.length === 0 ? (
            <div className={styles.empty}>No active shipments.</div>
          ) : (
            activeShipments.map(shipment => (
              <div key={shipment.id} className={styles.tableRow}>
                <span>{shipment.trackingNumber}</span>
                <span className={styles.carrier}>{shipment.carrier.toUpperCase()}</span>
                <span>{shipment.status}</span>
                <span>{new Date(shipment.lastUpdatedAt).toLocaleString()}</span>
                <span>
                  <button type="button" onClick={() => toggleArchive(shipment.id, true)}>
                    Archive
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default MonitorActivePage;
