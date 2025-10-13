import Spinner from '../components/Spinner';
import { useShipments } from '../context/ShipmentsContext';
import styles from './MonitorPage.module.css';

const MonitorArchivePage = () => {
  const { loading, archivedShipments, toggleArchive } = useShipments();

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className={styles.container}>
      <header>
        <h2>Archive</h2>
        <p>Closed shipments are stored here for future reference.</p>
      </header>

      <section>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Tracking #</span>
            <span>Carrier</span>
            <span>Status</span>
            <span>Delivered</span>
            <span>Actions</span>
          </div>
          {archivedShipments.length === 0 ? (
            <div className={styles.empty}>No archived shipments.</div>
          ) : (
            archivedShipments.map(shipment => (
              <div key={shipment.id} className={styles.tableRow}>
                <span>{shipment.trackingNumber}</span>
                <span className={styles.carrier}>{shipment.carrier.toUpperCase()}</span>
                <span>{shipment.status}</span>
                <span>{new Date(shipment.lastUpdatedAt).toLocaleString()}</span>
                <span>
                  <button type="button" onClick={() => toggleArchive(shipment.id, false)}>
                    Restore
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

export default MonitorArchivePage;
