import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { read, utils } from 'xlsx';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { FINANCE_COMPANY_OPTIONS, CompanyOption } from '../constants/finance';
import { useFinanceOffers } from '../context/FinanceOffersContext';
import { FinanceOffer } from '../types/financeOffer';
import styles from './FinanceOfferListPage.module.css';

type OfferDraft = Omit<FinanceOffer, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'> & {
  offerMetricTons: string;
  note: string;
};

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

const createEmptyOffer = (): OfferDraft => ({
  company: FINANCE_COMPANY_OPTIONS[0],
  offerNumber: '',
  salesOrder: '',
  invoiceNumber: '',
  customer: '',
  grade: '',
  pricingTerm: '',
  offerMetricTons: '',
  offerDate: '',
  portOfLoading: '',
  etd: '',
  eta: '',
  bookingNumber: '',
  metricTons: '',
  usdPerMetricTon: '',
  amount: '',
  settlementDate: '',
  paymentCondition: '',
  note: '',
  commission: '',
  totalCommission: '',
  depositDate: ''
});

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().slice(0, 10);
};

const isWithinDateRange = (value: string, start: string, end: string) => {
  if (!start && !end) {
    return true;
  }
  if (!value) {
    return false;
  }
  const valueTime = new Date(`${value}T00:00:00`).getTime();
  if (Number.isNaN(valueTime)) {
    return false;
  }
  if (start) {
    const startTime = new Date(`${start}T00:00:00`).getTime();
    if (valueTime < startTime) {
      return false;
    }
  }
  if (end) {
    const endTime = new Date(`${end}T23:59:59`).getTime();
    if (valueTime > endTime) {
      return false;
    }
  }
  return true;
};

const FinanceOfferListPage = () => {
  const { offers, loading, createOffer, updateOffer, deleteOffer, deleteOffers, importOffers } = useFinanceOffers();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'all' | CompanyOption>('all');
  const [createdStart, setCreatedStart] = useState('');
  const [createdEnd, setCreatedEnd] = useState('');
  const [updatedStart, setUpdatedStart] = useState('');
  const [updatedEnd, setUpdatedEnd] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPurpose, setModalPurpose] = useState<'create' | 'edit'>('create');
  const [modalMode, setModalMode] = useState<'manual' | 'upload'>('manual');
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [formState, setFormState] = useState<OfferDraft>(() => createEmptyOffer());
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadCompany, setUploadCompany] = useState<CompanyOption>(FINANCE_COMPANY_OPTIONS[0]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [pageSize, setPageSize] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 4000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    setSelectedIds(prev => {
      const next = new Set<string>();
      offers.forEach(offer => {
        if (prev.has(offer.id)) {
          next.add(offer.id);
        }
      });
      return next;
    });
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return offers.filter(offer => {
      if (companyFilter !== 'all' && offer.company !== companyFilter) {
        return false;
      }
      if (!isWithinDateRange(offer.createdAt, createdStart, createdEnd)) {
        return false;
      }
      if (!isWithinDateRange(offer.updatedAt, updatedStart, updatedEnd)) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const searchable = [
        offer.company,
        offer.offerNumber,
        offer.salesOrder,
        offer.invoiceNumber,
        offer.customer,
        offer.grade,
        offer.pricingTerm,
        offer.offerMetricTons ?? '',
        offer.offerDate,
        offer.portOfLoading,
        offer.etd,
        offer.eta,
        offer.bookingNumber,
        offer.metricTons,
        offer.usdPerMetricTon,
        offer.amount,
        offer.settlementDate,
        offer.paymentCondition,
        offer.note ?? '',
        offer.commission,
        offer.totalCommission,
        offer.depositDate,
        offer.createdAt,
        offer.updatedAt
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [offers, companyFilter, searchTerm, createdStart, createdEnd, updatedStart, updatedEnd]);

  const paginatedOffers = useMemo(() => {
    if (pageSize === 0) {
      return filteredOffers;
    }
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOffers.slice(startIndex, startIndex + pageSize);
  }, [filteredOffers, pageSize, currentPage]);

  const totalPages = useMemo(() => {
    if (pageSize === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(filteredOffers.length / pageSize));
  }, [filteredOffers.length, pageSize]);

  useEffect(() => {
    if (pageSize === 0) {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
      return;
    }
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [pageSize, currentPage, totalPages]);

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const applySearch = () => {
    setSearchTerm(searchInput.trim());
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applySearch();
    }
  };

  const handleCompanyFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setCompanyFilter(event.target.value as 'all' | CompanyOption);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSearchInput('');
    setCompanyFilter('all');
    setCreatedStart('');
    setCreatedEnd('');
    setUpdatedStart('');
    setUpdatedEnd('');
    setSelectedIds(new Set());
    setCurrentPage(1);
  };

  const handleOpenCreateModal = () => {
    setModalPurpose('create');
    setModalMode('manual');
    setEditingOfferId(null);
    setFormState(createEmptyOffer());
    setFormError(null);
    setUploadCompany(FINANCE_COMPANY_OPTIONS[0]);
    setUploadError(null);
    setUploading(false);
    setManualSubmitting(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setUploadError(null);
    setUploading(false);
    setFormState(createEmptyOffer());
    setEditingOfferId(null);
    setModalPurpose('create');
    setModalMode('manual');
    setManualSubmitting(false);
  };

  const handleModeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextMode = event.target.value as 'manual' | 'upload';
    setModalMode(nextMode);
    setFormError(null);
    setUploadError(null);
    setManualSubmitting(false);
  };

  const handleFormChange =
    <Key extends keyof OfferDraft>(key: Key) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { value } = event.target;
      setFormState(prev => ({ ...prev, [key]: value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setManualSubmitting(true);

    const requiredFields: Array<keyof OfferDraft> = ['offerNumber', 'invoiceNumber', 'customer'];
    const missing = requiredFields.filter(field => !formState[field].trim());

    if (missing.length > 0) {
      setFormError('Please fill in the required fields: Offer #, SO, Invoice #, Customer.');
      setManualSubmitting(false);
      return;
    }

    const trimmed = {
      company: formState.company,
      offerNumber: formState.offerNumber.trim(),
      salesOrder: formState.salesOrder.trim(),
      invoiceNumber: formState.invoiceNumber.trim(),
      customer: formState.customer.trim(),
      grade: formState.grade.trim(),
      pricingTerm: formState.pricingTerm.trim(),
      offerMetricTons: formState.offerMetricTons.trim(),
      offerDate: formState.offerDate.trim(),
      portOfLoading: formState.portOfLoading.trim(),
      etd: formState.etd.trim(),
      eta: formState.eta.trim(),
      bookingNumber: formState.bookingNumber.trim(),
      metricTons: formState.metricTons.trim(),
      usdPerMetricTon: formState.usdPerMetricTon.trim(),
      amount: formState.amount.trim(),
      settlementDate: formState.settlementDate.trim(),
      paymentCondition: formState.paymentCondition.trim(),
      note: formState.note.trim(),
      commission: formState.commission.trim(),
      totalCommission: formState.totalCommission.trim(),
      depositDate: formState.depositDate.trim()
    };

    try {
      if (modalPurpose === 'edit' && editingOfferId) {
        await updateOffer(editingOfferId, {
          ...trimmed,
          offerMetricTons: trimmed.offerMetricTons || undefined,
          note: trimmed.note || undefined
        });
        setFeedback({ type: 'success', message: 'Offer updated successfully.' });
      } else {
        await createOffer({
          ...trimmed,
          offerMetricTons: trimmed.offerMetricTons || undefined,
          note: trimmed.note || undefined
        });
        setFeedback({ type: 'success', message: 'Offer added successfully.' });
      }
      setManualSubmitting(false);
      handleCloseModal();
    } catch (error) {
      console.error(error);
      setFormError('Unable to save offer. Please try again.');
      setManualSubmitting(false);
      setFeedback({ type: 'error', message: 'Offer save failed. Please try again.' });
    }
  };

  const handleEdit = (offerId: string) => {
    const offer = offers.find(item => item.id === offerId);
    if (!offer) {
      return;
    }
    setModalPurpose('edit');
    setModalMode('manual');
    setEditingOfferId(offerId);
    setFormState({
      company: offer.company,
      offerNumber: offer.offerNumber,
      salesOrder: offer.salesOrder,
      invoiceNumber: offer.invoiceNumber,
      customer: offer.customer,
      grade: offer.grade,
      pricingTerm: offer.pricingTerm,
      offerMetricTons: offer.offerMetricTons ?? '',
      offerDate: offer.offerDate,
      portOfLoading: offer.portOfLoading,
      etd: offer.etd,
      eta: offer.eta,
      bookingNumber: offer.bookingNumber,
      metricTons: offer.metricTons,
      usdPerMetricTon: offer.usdPerMetricTon,
      amount: offer.amount,
      settlementDate: offer.settlementDate,
      paymentCondition: offer.paymentCondition,
      note: offer.note ?? '',
      commission: offer.commission,
      totalCommission: offer.totalCommission,
      depositDate: offer.depositDate
    });
    setFormError(null);
    setUploadError(null);
    setUploading(false);
    setManualSubmitting(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (offerId: string) => {
    const confirmDelete = window.confirm('Delete this offer? This action cannot be undone.');
    if (!confirmDelete) {
      return;
    }
    try {
      await deleteOffer(offerId);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
      setFeedback({ type: 'success', message: 'Offer deleted.' });
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Failed to delete offer.' });
    }
  };

  const handleUploadCompanyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setUploadCompany(event.target.value as CompanyOption);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setUploadError('No sheets found in the uploaded file.');
        setUploading(false);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = utils.sheet_to_json<(string | number | null | undefined)[]>(worksheet, {
        header: 1,
        raw: false
      });

      if (!rows || rows.length <= 1) {
        setUploadError('No data rows found in the uploaded file.');
        setUploading(false);
        return;
      }

      const [, ...dataRows] = rows;
      const toCleanString = (value: string | number | null | undefined) =>
        value === null || value === undefined ? '' : String(value).trim();

      const parsedOffers = dataRows.reduce<OfferDraft[]>((acc, row) => {
        const offerNumber = toCleanString(row[0]);
        const salesOrder = toCleanString(row[1]);
        const invoiceNumber = toCleanString(row[2]);
        const customer = toCleanString(row[3]);

        if (!offerNumber || !invoiceNumber || !customer) {
          return acc;
        }

        acc.push({
          company: uploadCompany,
          offerNumber,
          salesOrder,
          invoiceNumber,
          customer,
          grade: toCleanString(row[4]),
          pricingTerm: toCleanString(row[5]),
          offerMetricTons: toCleanString(row[6]),
          offerDate: toCleanString(row[7]),
          portOfLoading: toCleanString(row[8]),
          etd: toCleanString(row[9]),
          eta: toCleanString(row[10]),
          bookingNumber: toCleanString(row[11]),
          metricTons: toCleanString(row[12]),
          usdPerMetricTon: toCleanString(row[13]),
          amount: toCleanString(row[14]),
          settlementDate: toCleanString(row[15]),
          paymentCondition: toCleanString(row[16]),
          note: toCleanString(row[17]),
          commission: toCleanString(row[18]),
          totalCommission: toCleanString(row[19]),
          depositDate: toCleanString(row[20])
        });

        return acc;
      }, []);

      if (parsedOffers.length === 0) {
        setUploadError('No valid rows found. Please confirm the spreadsheet matches the expected layout.');
        setFeedback({ type: 'error', message: 'Excel import had no valid rows.' });
        setUploading(false);
        return;
      }

      await importOffers(
        parsedOffers.map(item => ({
          ...item,
          offerMetricTons: item.offerMetricTons || undefined,
          note: item.note || undefined
        }))
      );
      setFeedback({
        type: 'success',
        message: `Imported ${parsedOffers.length} offer${parsedOffers.length > 1 ? 's' : ''} for ${uploadCompany}.`
      });
      setUploading(false);
      handleCloseModal();
    } catch (error) {
      console.error(error);
      setUploadError('Failed to import the Excel file. Please try again.');
      setFeedback({ type: 'error', message: 'Excel import failed. Please try again.' });
      setUploading(false);
    } finally {
      event.target.value = '';
    }
  };

  const handleExportCsv = () => {
    if (filteredOffers.length === 0) {
      window.alert('No offers to export.');
      return;
    }

    const escapeCsv = (value: string) => value.replace(/\"/g, '\"\"');
    const header = [
      'Company',
      'Offer #',
      'SO',
      'Invoice #',
      'Customer',
      'Grade',
      'PRC term',
      '오퍼중량',
      '오퍼일',
      'POL',
      'ETD',
      'ETA',
      'Booking #',
      'S.MT',
      '$/MT',
      'Amount',
      'Settlement Date',
      'Payment Condition',
      '비 고',
      '커미션',
      '총커미션',
      '입금일',
      'Created At',
      'Updated At'
    ];
    const rows = filteredOffers.map(record => [
      record.company,
      record.offerNumber,
      record.salesOrder,
      record.invoiceNumber,
      record.customer,
      record.grade,
      record.pricingTerm,
      record.offerMetricTons ?? '',
      record.offerDate,
      record.portOfLoading,
      record.etd,
      record.eta,
      record.bookingNumber,
      record.metricTons,
      record.usdPerMetricTon,
      record.amount,
      record.settlementDate,
      record.paymentCondition,
      record.note ?? '',
      record.commission,
      record.totalCommission,
      record.depositDate,
      record.createdAt,
      record.updatedAt
    ]);

    const csvContent = [header, ...rows]
      .map(row => row.map(field => `"${escapeCsv(String(field))}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `finance_offers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleRow = (offerId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(offerId)) {
        next.delete(offerId);
      } else {
        next.add(offerId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (paginatedOffers.length === 0) {
      return;
    }
    const allVisibleSelected = paginatedOffers.every(item => selectedIds.has(item.id));
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedOffers.forEach(item => next.delete(item.id));
        return next;
      });
      return;
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      paginatedOffers.forEach(item => next.add(item.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }
    const confirmDelete = window.confirm(`Delete ${selectedIds.size} selected offer(s)? This action cannot be undone.`);
    if (!confirmDelete) {
      return;
    }
    try {
      await deleteOffers(Array.from(selectedIds));
      setSelectedIds(new Set());
      setFeedback({ type: 'success', message: 'Selected offers deleted.' });
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Failed to delete selected offers.' });
    }
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    setPageSize(value);
    setCurrentPage(1);
  };

  const handleGoToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleGoToNextPage = () => {
    setCurrentPage(prev => (pageSize === 0 ? prev : Math.min(totalPages, prev + 1)));
  };

  if (loading) {
    return <Spinner />;
  }

  const isEditing = modalPurpose === 'edit';
  const submitLabel = isEditing ? 'Save Changes' : 'Add Offer';
  const manualDisabled = manualSubmitting;
  const loadingMessage = manualSubmitting
    ? isEditing
      ? 'Saving changes...'
      : 'Creating offer...'
    : 'Importing offers...';
  const showLoadingBanner = (modalMode === 'manual' && manualSubmitting) || (modalMode === 'upload' && uploading);
  const clearFeedback = () => setFeedback(null);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Offer List</h2>
        <p>Finance view of current offers, associated bookings, and commission tracking.</p>
      </header>

      {feedback && (
        <div className={feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError} role="status">
          <span>{feedback.message}</span>
          <button
            type="button"
            className={styles.feedbackDismiss}
            onClick={clearFeedback}
            aria-label="Dismiss notification"
          >
            X
          </button>
        </div>
      )}

      <section className={styles.controlsCard}>
        <div className={styles.utilities}>
          <div className={styles.filterStack}>
            <div className={styles.filterRow}>
              <label className={styles.searchField}>
                <span>Offer No 조회</span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Offer No 조회"
                />
              </label>
              <label className={styles.filterSelect}>
                <span>Company</span>
                <select value={companyFilter} onChange={handleCompanyFilterChange}>
                  <option value="all">All companies</option>
                  {FINANCE_COMPANY_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.filters}>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Created Date</span>
                <div className={styles.dateRange}>
                  <label>
                    <span>From</span>
                    <input type="date" value={createdStart} onChange={event => setCreatedStart(event.target.value)} />
                  </label>
                  <label>
                    <span>To</span>
                    <input type="date" value={createdEnd} onChange={event => setCreatedEnd(event.target.value)} />
                  </label>
                </div>
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Updated Date</span>
                <div className={styles.dateRange}>
                  <label>
                    <span>From</span>
                    <input type="date" value={updatedStart} onChange={event => setUpdatedStart(event.target.value)} />
                  </label>
                  <label>
                    <span>To</span>
                    <input type="date" value={updatedEnd} onChange={event => setUpdatedEnd(event.target.value)} />
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.filterActions}>
              <button type="button" className={styles.primaryButton} onClick={applySearch}>
                Search
              </button>
              <button type="button" className={styles.secondaryButton} onClick={handleResetFilters}>
                Reset
              </button>
              <button type="button" className={styles.secondaryButton} onClick={handleExportCsv}>
                Export CSV
              </button>
            </div>
          </div>
          <div className={styles.toolbarButtons}>
            <button
              type="button"
              className={styles.dangerOutlineButton}
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
            >
              Delete Selected
            </button>
            <button type="button" className={styles.primaryButton} onClick={handleOpenCreateModal}>
              New Offer
            </button>
          </div>
        </div>
      </section>

      <section className={styles.paginationWrapper}>
        <div className={styles.paginationBar}>
          <div className={styles.pageSizeControl}>
            <span>Rows per page</span>
            <select value={pageSize} onChange={handlePageSizeChange}>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={0}>Show All</option>
            </select>
          </div>
          <div className={styles.pageStatus}>
            {filteredOffers.length === 0
              ? 'No records'
              : pageSize === 0
                ? `Showing all ${filteredOffers.length} records`
                : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(
                    currentPage * pageSize,
                    filteredOffers.length
                  )} of ${filteredOffers.length}`}
          </div>
          <div className={styles.pageControls}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleGoToPreviousPage}
              disabled={pageSize === 0 || currentPage === 1}
            >
              Previous
            </button>
            <span className={styles.pageIndicator}>
              Page {pageSize === 0 ? 1 : currentPage} / {pageSize === 0 ? 1 : totalPages}
            </span>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleGoToNextPage}
              disabled={pageSize === 0 || currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.scrollable}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.selectColumn}>
                  <input
                    type="checkbox"
                    checked={paginatedOffers.length > 0 && paginatedOffers.every(item => selectedIds.has(item.id))}
                    onChange={handleToggleAll}
                    aria-label="Select all offers on this page"
                  />
                </th>
                <th>Company</th>
                <th>Offer #</th>
                <th>SO</th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Grade</th>
                <th>PRC term</th>
                <th>오퍼중량</th>
                <th>오퍼일</th>
                <th>POL</th>
                <th>ETD</th>
                <th>ETA</th>
                <th>Booking #</th>
                <th>S.MT</th>
                <th>$/MT</th>
                <th>Amount</th>
                <th>Settlement Date</th>
                <th>Payment Condition</th>
                <th>비 고</th>
                <th>커미션</th>
                <th>총커미션</th>
                <th>입금일</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOffers.length === 0 ? (
                <tr>
                  <td colSpan={23} className={styles.emptyState}>
                    {offers.length === 0 ? 'No finance offers available yet.' : 'No offers match your filters.'}
                  </td>
                </tr>
              ) : (
                paginatedOffers.map(record => (
                  <tr key={record.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={() => handleToggleRow(record.id)}
                        aria-label={`Select offer ${record.offerNumber}`}
                      />
                    </td>
                    <td>{record.company}</td>
                    <td>{record.offerNumber}</td>
                    <td>{record.salesOrder}</td>
                    <td>{record.invoiceNumber}</td>
                    <td>{record.customer}</td>
                    <td>{record.grade}</td>
                    <td>{record.pricingTerm}</td>
                    <td>{record.offerMetricTons ?? ''}</td>
                    <td>{record.offerDate}</td>
                    <td>{record.portOfLoading}</td>
                    <td>{record.etd}</td>
                    <td>{record.eta}</td>
                    <td>{record.bookingNumber}</td>
                    <td>{record.metricTons}</td>
                    <td>{record.usdPerMetricTon}</td>
                    <td>{record.amount}</td>
                    <td>{record.settlementDate || '-'}</td>
                    <td className={styles.paymentCell}>{record.paymentCondition || '-'}</td>
                    <td className={styles.noteCell}>{record.note && record.note.length > 0 ? record.note : '-'}</td>
                    <td>{record.commission}</td>
                    <td>{record.totalCommission}</td>
                    <td>{record.depositDate}</td>
                    <td>{record.createdAt}</td>
                    <td>{record.updatedAt}</td>
                    <td className={styles.actionCell}>
                      <div className={styles.actionButtons}>
                        <button type="button" className={styles.actionButton} onClick={() => handleEdit(record.id)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.dangerButton}`}
                          onClick={() => handleDelete(record.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={isModalOpen} onClose={handleCloseModal} title={isEditing ? 'Edit Offer' : 'New Offer'}>
        {showLoadingBanner && (
          <div className={styles.loadingBanner} role="status" aria-live="polite">
            <span className={styles.loadingSpinner} />
            <span>{loadingMessage}</span>
          </div>
        )}
        {!isEditing && (
          <div className={styles.modeToggle}>
            <label className={styles.modeRadio}>
              <input
                type="radio"
                name="offer-mode"
                value="manual"
                checked={modalMode === 'manual'}
                onChange={handleModeChange}
              />
              Manual Entry
            </label>
            <label className={styles.modeRadio}>
              <input
                type="radio"
                name="offer-mode"
                value="upload"
                checked={modalMode === 'upload'}
                onChange={handleModeChange}
              />
              Excel Upload
            </label>
          </div>
        )}

        {modalMode === 'manual' ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            {formError && <div className={styles.error}>{formError}</div>}
            <label>
              <span>Company</span>
              <select value={formState.company} onChange={handleFormChange('company')} disabled={manualDisabled}>
                {FINANCE_COMPANY_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Offer # *</span>
              <input
                value={formState.offerNumber}
                onChange={handleFormChange('offerNumber')}
                required
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>SO *</span>
              <input
                value={formState.salesOrder}
                onChange={handleFormChange('salesOrder')}
                required
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>Invoice # *</span>
              <input
                value={formState.invoiceNumber}
                onChange={handleFormChange('invoiceNumber')}
                required
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>Customer *</span>
              <input
                value={formState.customer}
                onChange={handleFormChange('customer')}
                required
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>Grade</span>
              <input value={formState.grade} onChange={handleFormChange('grade')} disabled={manualDisabled} />
            </label>
            <label>
              <span>PRC term</span>
              <input
                value={formState.pricingTerm}
                onChange={handleFormChange('pricingTerm')}
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>오퍼중량</span>
              <input
                value={formState.offerMetricTons}
                onChange={handleFormChange('offerMetricTons')}
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>오퍼일</span>
              <input value={formState.offerDate} onChange={handleFormChange('offerDate')} disabled={manualDisabled} />
            </label>
            <label>
              <span>POL</span>
              <input
                value={formState.portOfLoading}
                onChange={handleFormChange('portOfLoading')}
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>ETD</span>
              <input value={formState.etd} onChange={handleFormChange('etd')} disabled={manualDisabled} />
            </label>
            <label>
              <span>ETA</span>
              <input value={formState.eta} onChange={handleFormChange('eta')} disabled={manualDisabled} />
            </label>
            <label>
              <span>Booking #</span>
              <input
                value={formState.bookingNumber}
                onChange={handleFormChange('bookingNumber')}
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>S.MT</span>
              <input value={formState.metricTons} onChange={handleFormChange('metricTons')} disabled={manualDisabled} />
            </label>
            <label>
              <span>$/MT</span>
              <input
                value={formState.usdPerMetricTon}
                onChange={handleFormChange('usdPerMetricTon')}
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>Amount</span>
              <input value={formState.amount} onChange={handleFormChange('amount')} disabled={manualDisabled} />
            </label>
            <label>
              <span>Settlement Date</span>
              <input
                value={formState.settlementDate}
                onChange={handleFormChange('settlementDate')}
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>Payment Condition</span>
              <textarea
                value={formState.paymentCondition}
                onChange={handleFormChange('paymentCondition')}
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>비 고</span>
              <textarea value={formState.note} onChange={handleFormChange('note')} disabled={manualDisabled} />
            </label>
            <label>
              <span>커미션</span>
              <input value={formState.commission} onChange={handleFormChange('commission')} disabled={manualDisabled} />
            </label>
            <label>
              <span>총커미션</span>
              <input
                value={formState.totalCommission}
                onChange={handleFormChange('totalCommission')}
                disabled={manualDisabled}
              />
            </label>
            <label>
              <span>입금일</span>
              <input value={formState.depositDate} onChange={handleFormChange('depositDate')} disabled={manualDisabled} />
            </label>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={handleCloseModal} disabled={manualDisabled}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton} disabled={manualDisabled}>
                {manualSubmitting ? 'Saving...' : submitLabel}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.uploadPanel}>
            <p className={styles.uploadHint}>
              Choose a company, then upload an Excel file with the finance offer layout. Rows with missing Offer #, SO,
              Invoice #, or Customer will be skipped.
            </p>
            <label className={styles.filterSelect}>
              <span>Company</span>
              <select value={uploadCompany} onChange={handleUploadCompanyChange} disabled={uploading}>
                {FINANCE_COMPANY_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.uploadField}>
              <span>Import Offers (Excel)</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={uploading} />
            </label>
            {uploading && <div className={styles.uploadInfo}>Processing upload…</div>}
            {uploadError && <div className={styles.uploadError}>{uploadError}</div>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={handleCloseModal} disabled={uploading}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FinanceOfferListPage;
