import { ChangeEvent, useState } from 'react';
import Spinner from '../components/Spinner';
import { useShipments } from '../context/ShipmentsContext';
import { CarrierCode } from '../types/shipment';
import styles from './MonitorPage.module.css';

const carriers: { label: string; value: CarrierCode }[] = [
  { label: 'Maersk', value: 'maersk' },
  { label: 'HMM', value: 'hmm' },
  { label: 'Other', value: 'other' }
];

const createFilterDefaults = () => ({
  tracking: '',
  carrier: 'all' as 'all' | CarrierCode,
  createdStart: '',
  createdEnd: '',
  updatedStart: '',
  updatedEnd: ''
});

type FilterState = ReturnType<typeof createFilterDefaults>;

const MonitorArchivePage = () => {
  const { loading, archivedShipments, toggleArchive } = useShipments();
  const [filterInputs, setFilterInputs] = useState<FilterState>(() => createFilterDefaults());
  const [filters, setFilters] = useState<FilterState>(() => createFilterDefaults());

  if (loading) {
    return <Spinner />;
  }

  const handleFilterInputChange = <Key extends keyof FilterState>(key: Key) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value as FilterState[Key];
      setFilterInputs(prev => ({ ...prev, [key]: value }));
    };

  const applyFilters = () => {
    setFilters({ ...filterInputs });
  };

  const resetFilters = () => {
    setFilterInputs(createFilterDefaults());
    setFilters(createFilterDefaults());
  };

  const toIsoDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString();
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleString();
  };

  const isWithinRange = (value: string, start: string, end: string) => {
    if (!value) {
      return true;
    }
    const dateValue = new Date(value).getTime();
    if (Number.isNaN(dateValue)) {
      return true;
    }
    if (start) {
      const startDate = new Date(`${start}T00:00:00`).getTime();
      if (dateValue < startDate) {
        return false;
      }
    }
    if (end) {
      const endDate = new Date(`${end}T23:59:59.999`).getTime();
      if (dateValue > endDate) {
        return false;
      }
    }
    return true;
  };

  const filteredShipments = archivedShipments.filter(shipment => {
    const matchesTracking = shipment.trackingNumber
      .toLowerCase()
      .includes(filters.tracking.trim().toLowerCase());
    const matchesCarrier = filters.carrier === 'all' || shipment.carrier === filters.carrier;
    const matchesCreated = isWithinRange(shipment.createdAt, filters.createdStart, filters.createdEnd);
    const matchesUpdated = isWithinRange(shipment.lastUpdatedAt, filters.updatedStart, filters.updatedEnd);
    return matchesTracking && matchesCarrier && matchesCreated && matchesUpdated;
  });

  const handleExportCsv = () => {
    if (filteredShipments.length === 0) {
      window.alert('No shipments to export.');
      return;
    }

    const header = ['TrackingNumber', 'Carrier', 'Status', 'CreatedAt', 'LastUpdatedAt'];
    const rows = filteredShipments.map(item => [
      item.trackingNumber,
      item.carrier.toUpperCase(),
      item.status,
      toIsoDate(item.createdAt),
      toIsoDate(item.lastUpdatedAt)
    ]);

    const csvContent = [header, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `archived_shipments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <header>
        <h2>Archive</h2>
        <p>Closed shipments are stored here for future reference.</p>
      </header>

      <section className={styles.formCard}>
        <h3>Filters</h3>
        <div className={styles.utilities}>
          <div className={styles.filterStack}>
            <div className={styles.filterRow}>
              <label className={styles.searchField}>
                <span>Tracking #</span>
                <input
                  type="search"
                  value={filterInputs.tracking}
                  onChange={handleFilterInputChange('tracking')}
                  placeholder="Search tracking numbers"
                />
              </label>
              <label className={styles.filterSelect}>
                <span>Carrier</span>
                <select value={filterInputs.carrier} onChange={handleFilterInputChange('carrier')}>
                  <option value="all">All carriers</option>
                  {carriers.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.filters}>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Created At</span>
                <div className={styles.dateRange}>
                  <label>
                    <span>From</span>
                    <input
                      type="date"
                      value={filterInputs.createdStart}
                      onChange={handleFilterInputChange('createdStart')}
                    />
                  </label>
                  <label>
                    <span>To</span>
                    <input
                      type="date"
                      value={filterInputs.createdEnd}
                      onChange={handleFilterInputChange('createdEnd')}
                    />
                  </label>
                </div>
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Last Updated</span>
                <div className={styles.dateRange}>
                  <label>
                    <span>From</span>
                    <input
                      type="date"
                      value={filterInputs.updatedStart}
                      onChange={handleFilterInputChange('updatedStart')}
                    />
                  </label>
                  <label>
                    <span>To</span>
                    <input
                      type="date"
                      value={filterInputs.updatedEnd}
                      onChange={handleFilterInputChange('updatedEnd')}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.filterActions}>
              <button type="button" className={styles.primaryButton} onClick={applyFilters}>
                Search
              </button>
              <button type="button" className={styles.secondaryButton} onClick={resetFilters}>
                Reset
              </button>
              <button type="button" className={styles.secondaryButton} onClick={handleExportCsv}>
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Tracking #</span>
            <span>Carrier</span>
            <span>Status</span>
            <span>Created At</span>
            <span>Last Updated</span>
            <span>Actions</span>
          </div>
          {filteredShipments.length === 0 ? (
            <div className={styles.empty}>No shipments match your filters.</div>
          ) : (
            filteredShipments.map(shipment => (
              <div key={shipment.id} className={styles.tableRow}>
                <span>{shipment.trackingNumber}</span>
                <span className={styles.carrier}>{shipment.carrier.toUpperCase()}</span>
                <span>{shipment.status}</span>
                <span>{formatDateTime(shipment.createdAt)}</span>
                <span>{formatDateTime(shipment.lastUpdatedAt)}</span>
                <span className={styles.actionsCell}>
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
