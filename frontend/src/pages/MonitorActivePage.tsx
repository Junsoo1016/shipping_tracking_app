import { ChangeEvent, FormEvent, useState } from 'react';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import Timeline from '../components/Timeline';
import { useShipments } from '../context/ShipmentsContext';
import { CarrierCode, Shipment, ShipmentStatus } from '../types/shipment';
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

const MonitorActivePage = () => {
  const { loading, activeShipments, createShipment, updateShipment, toggleArchive, deleteShipment } =
    useShipments();
  const [carrier, setCarrier] = useState<CarrierCode>('maersk');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [status, setStatus] = useState<ShipmentStatus>('created');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterInputs, setFilterInputs] = useState<FilterState>(() => createFilterDefaults());
  const [filters, setFilters] = useState<FilterState>(() => createFilterDefaults());
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

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

  const resetForm = () => {
    setCarrier('maersk');
    setTrackingNumber('');
    setStatus('created');
    setEditingShipmentId(null);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSubmitting(false);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingShipmentId) {
        await updateShipment(editingShipmentId, {
          carrier,
          trackingNumber: trackingNumber.trim(),
          status
        });
      } else {
        await createShipment({
          carrier,
          trackingNumber: trackingNumber.trim(),
          status,
          vesselName: '',
          eta: '',
          portOfLoading: '',
          portOfDischarge: ''
        });
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      setError('Unable to save shipment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (shipmentId: string) => {
    const shipment = activeShipments.find(item => item.id === shipmentId);
    if (!shipment) {
      return;
    }
    setEditingShipmentId(shipmentId);
    setCarrier(shipment.carrier);
    setTrackingNumber(shipment.trackingNumber);
    setStatus(shipment.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openDetails = (shipment: Shipment) => {
    setSelectedShipment(shipment);
  };

  const closeDetails = () => {
    setSelectedShipment(null);
  };

  const handleDelete = async (shipmentId: string) => {
    const confirmDelete = window.confirm('Delete this shipment? This action cannot be undone.');
    if (!confirmDelete) {
      return;
    }
    try {
      await deleteShipment(shipmentId);
    } catch (err) {
      console.error(err);
      setError('Unable to delete shipment. Please try again.');
    }
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

  const filteredShipments = activeShipments.filter(shipment => {
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
    link.setAttribute('download', `shipments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      <header>
        <h2>Active Shipments</h2>
        <p>Track live shipments and view their current status.</p>
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
          <button type="button" className={styles.primaryButton} onClick={handleCreateNew}>
            Register Tracking Number
          </button>
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
              <div
                key={shipment.id}
                className={styles.tableRow}
                role="button"
                tabIndex={0}
                onClick={() => openDetails(shipment)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDetails(shipment);
                  }
                }}
              >
                <span>{shipment.trackingNumber}</span>
                <span className={styles.carrier}>{shipment.carrier.toUpperCase()}</span>
                <span>{shipment.status}</span>
                <span>{formatDateTime(shipment.createdAt)}</span>
                <span>{formatDateTime(shipment.lastUpdatedAt)}</span>
                <span className={styles.actionsCell}>
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      handleEdit(shipment.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      toggleArchive(shipment.id, true);
                    }}
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    className={styles.danger}
                    onClick={event => {
                      event.stopPropagation();
                      handleDelete(shipment.id);
                    }}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={editingShipmentId ? 'Edit Shipment' : 'Register Tracking Number'}
      >
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
            Status
            <select value={status} onChange={event => setStatus(event.target.value as ShipmentStatus)}>
              {statuses.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.modalActions}>
            <button type="submit" className={styles.primaryButton} disabled={submitting}>
              {submitting ? 'Saving…' : editingShipmentId ? 'Save Changes' : 'Create Shipment'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleCloseModal}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!selectedShipment}
        onClose={closeDetails}
        title={selectedShipment ? `Tracking ${selectedShipment.trackingNumber}` : undefined}
      >
        {selectedShipment && (
          <div className={styles.detailBody}>
            <div className={styles.detailMeta}>
              <div>
                <span className={styles.metaLabel}>Carrier</span>
                <strong>{selectedShipment.carrier.toUpperCase()}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Status</span>
                <strong>{selectedShipment.status}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Created</span>
                <span>{formatDateTime(selectedShipment.createdAt)}</span>
              </div>
              <div>
                <span className={styles.metaLabel}>Last Updated</span>
                <span>{formatDateTime(selectedShipment.lastUpdatedAt)}</span>
              </div>
            </div>
            <div>
              <h4>Tracking Timeline</h4>
              <Timeline
                events={(selectedShipment.events ?? []).map(event => ({
                  id: event.id,
                  title: event.status,
                  description: event.description,
                  location: event.location,
                  timestamp: event.timestamp
                }))}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MonitorActivePage;
