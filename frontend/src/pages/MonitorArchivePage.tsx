import { ChangeEvent, useEffect, useState } from 'react';
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

const createFilterDefaults = () => ({
  tracking: '',
  carrier: 'all' as 'all' | CarrierCode,
  status: 'all' as 'all' | ShipmentStatus,
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
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  if (loading) {
    return <Spinner />;
  }

  useEffect(() => {
    const handleClickAway = () => setOpenActionsId(null);
    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
  }, []);
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

  const formatDateOnly = (value?: string) => {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString();
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
    const matchesStatus = filters.status === 'all' || shipment.status === filters.status;
    const matchesCreated = isWithinRange(shipment.createdAt, filters.createdStart, filters.createdEnd);
    const matchesUpdated = isWithinRange(shipment.lastUpdatedAt, filters.updatedStart, filters.updatedEnd);
    return matchesTracking && matchesCarrier && matchesStatus && matchesCreated && matchesUpdated;
  });

  const handleExportCsv = () => {
    if (filteredShipments.length === 0) {
      window.alert('No shipments to export.');
      return;
    }

    const header = [
      'TrackingNumber',
      'Carrier',
      'Status',
      'Origin',
      'Destination',
      'Departure',
      'Arrival',
      'Price',
      'Weight',
      'CreatedAt',
      'LastUpdatedAt'
    ];
    const rows = filteredShipments.map(item => [
      item.trackingNumber,
      item.carrier.toUpperCase(),
      item.status,
      item.portOfLoading ?? '',
      item.portOfDischarge ?? '',
      toIsoDate(item.departureDate ?? ''),
      toIsoDate(item.arrivalDate ?? ''),
      item.price ?? '',
      item.weight ?? '',
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
              <label className={styles.filterSelect}>
                <span>Status</span>
                <select value={filterInputs.status} onChange={handleFilterInputChange('status')}>
                  <option value="all">All statuses</option>
                  {statuses.map(option => (
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
        <div className={styles.tableWrapper}>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Tracking #</span>
              <span>Carrier</span>
              <span>Status</span>
              <span>Origin</span>
              <span>Destination</span>
              <span className={styles.nowrap}>Departure</span>
              <span className={styles.nowrap}>Arrival</span>
              <span className={styles.nowrap}>Price</span>
              <span className={styles.nowrap}>Weight</span>
              <span className={styles.nowrap}>Created</span>
              <span className={styles.nowrap}>Updated</span>
              <span className={styles.alignRight}>Actions</span>
            </div>
            {filteredShipments.length === 0 ? (
              <div className={styles.empty}>No shipments match your filters.</div>
            ) : (
              filteredShipments.map(shipment => (
                <div key={shipment.id} className={styles.tableRow}>
                  <span>{shipment.trackingNumber}</span>
                  <span className={styles.carrier}>{shipment.carrier.toUpperCase()}</span>
                  <span className={styles.nowrap}>{shipment.status}</span>
                  <span className={styles.locationCell}>
                    <span className={styles.locationIcon} aria-hidden="true">📍</span>
                    {shipment.portOfLoading || '-'}
                  </span>
                  <span className={styles.locationCell}>
                    <span className={styles.locationIcon} aria-hidden="true">🎯</span>
                    {shipment.portOfDischarge || '-'}
                  </span>
                  <span className={styles.nowrap}>{formatDateOnly(shipment.departureDate)}</span>
                  <span className={styles.nowrap}>{formatDateOnly(shipment.arrivalDate)}</span>
                  <span className={styles.nowrap}>
                    {shipment.price != null
                      ? `$${shipment.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                  </span>
                  <span className={styles.nowrap}>
                    {shipment.weight != null
                      ? `${shipment.weight.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`
                      : '-'}
                  </span>
                  <span className={styles.nowrap}>{formatDateOnly(shipment.createdAt)}</span>
                  <span className={styles.nowrap}>{formatDateTime(shipment.lastUpdatedAt)}</span>
                  <span className={styles.actionsCell}>
                    <button
                      type="button"
                      className={styles.actionToggle}
                      onClick={event => {
                        event.stopPropagation();
                        setOpenActionsId(prev => (prev === shipment.id ? null : shipment.id));
                      }}
                    >
                      ⋮
                    </button>
                    {openActionsId === shipment.id && (
                      <div className={styles.actionsMenu} onClick={event => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            toggleArchive(shipment.id, false);
                            setOpenActionsId(null);
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className={styles.tableHint}>Drag horizontally to view all columns</div>
      </section>
    </div>
  );
};

export default MonitorArchivePage;
