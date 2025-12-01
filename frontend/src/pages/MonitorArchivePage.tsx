import { ChangeEvent, useState } from 'react';
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
          <table className={styles.tableElement}>
            <colgroup>
              <col className={styles.colTracking} />
              <col className={styles.colCarrier} />
              <col className={styles.colStatus} />
              <col className={styles.colLocation} />
              <col className={styles.colLocation} />
              <col className={styles.colDate} />
              <col className={styles.colDate} />
              <col className={styles.colNumeric} />
              <col className={styles.colNumeric} />
              <col className={styles.colDateLong} />
              <col className={styles.colDateLong} />
              <col className={styles.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Tracking #</th>
                <th scope="col">Carrier</th>
                <th scope="col">Status</th>
                <th scope="col">Origin</th>
                <th scope="col">Destination</th>
                <th scope="col">Departure</th>
                <th scope="col">Arrival</th>
                <th scope="col">Price</th>
                <th scope="col">Weight</th>
                <th scope="col">Created</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.length === 0 ? (
                <tr>
                  <td className={styles.emptyRow} colSpan={12}>
                    No archived shipments.
                  </td>
                </tr>
              ) : (
                filteredShipments.map(shipment => (
                  <tr key={shipment.id} className={styles.tableBodyRow}>
                    <td><span className={styles.cellContent}>{shipment.trackingNumber}</span></td>
                    <td><span className={`${styles.cellContent} ${styles.carrier}`}>{shipment.carrier.toUpperCase()}</span></td>
                    <td><span className={styles.cellContent}>{shipment.status}</span></td>
                    <td>
                      <span className={styles.cellContent}>
                        <span className={styles.locationIcon} aria-hidden="true">📍</span>
                        {shipment.portOfLoading || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.cellContent}>
                        <span className={styles.locationIcon} aria-hidden="true">🎯</span>
                        {shipment.portOfDischarge || '-'}
                      </span>
                    </td>
                    <td><span className={styles.cellContent}>{formatDateOnly(shipment.departureDate)}</span></td>
                    <td><span className={styles.cellContent}>{formatDateOnly(shipment.arrivalDate)}</span></td>
                    <td>
                      <span className={`${styles.cellContent} ${styles.priceCell}`}>
                        {shipment.price != null
                          ? `$${shipment.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.cellContent} ${styles.weightCell}`}>
                        {shipment.weight != null
                          ? `${shipment.weight.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`
                          : '-'}
                      </span>
                    </td>
                    <td><span className={styles.cellContent}>{formatDateOnly(shipment.createdAt)}</span></td>
                    <td><span className={styles.cellContent}>{formatDateTime(shipment.lastUpdatedAt)}</span></td>
                    <td className={styles.actionsCell} onClick={event => event.stopPropagation()}>
                      <button type="button" onClick={() => toggleArchive(shipment.id, false)}>
                        Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.tableHint}>Drag horizontally to view all columns</div>
      </section>
    </div>
  );
};

export default MonitorArchivePage;
