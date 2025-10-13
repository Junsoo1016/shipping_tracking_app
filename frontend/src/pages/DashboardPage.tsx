import { Link } from 'react-router-dom';
import { useShipments } from '../context/ShipmentsContext';
import Spinner from '../components/Spinner';
import styles from './DashboardPage.module.css';

const DashboardPage = () => {
  const { loading, shipments, activeShipments, archivedShipments } = useShipments();

  if (loading) {
    return <Spinner />;
  }

  const inTransit = activeShipments.filter(s => s.status !== 'delivered').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const exceptions = shipments.filter(s => s.status === 'exception').length;

  const recent = shipments.slice(0, 5);

  return (
    <div className={styles.container}>
      <header>
        <h2>Dashboard</h2>
        <p>Monitor critical shipment KPIs and recent events at a glance.</p>
      </header>

      <section className={styles.metrics}>
        <div className={styles.metricCard}>
          <h3>Active Shipments</h3>
          <div className={styles.metricValue}>{activeShipments.length}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>In Transit</h3>
          <div className={styles.metricValue}>{inTransit}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>Delivered</h3>
          <div className={styles.metricValue}>{delivered}</div>
        </div>
        <div className={styles.metricCardWarning}>
          <h3>Exceptions</h3>
          <div className={styles.metricValue}>{exceptions}</div>
        </div>
      </section>

      <section>
        <div className={styles.sectionHeader}>
          <h3>Recent Updates</h3>
          <Link to="/monitor/active">View all</Link>
        </div>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Tracking #</span>
            <span>Carrier</span>
            <span>Status</span>
            <span>Updated</span>
          </div>
          {recent.length === 0 ? (
            <div className={styles.empty}>No shipments yet. Add one from the Monitor page.</div>
          ) : (
            recent.map(shipment => (
              <div key={shipment.id} className={styles.tableRow}>
                <span>{shipment.trackingNumber}</span>
                <span className={styles.carrier}>{shipment.carrier.toUpperCase()}</span>
                <span>{shipment.status}</span>
                <span>{new Date(shipment.lastUpdatedAt).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
