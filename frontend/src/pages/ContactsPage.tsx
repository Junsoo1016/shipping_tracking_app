import { FormEvent, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import styles from './ContactsPage.module.css';

type Contact = {
  id: string;
  company: string;
  manager: string;
  title: string;
  phone1: string;
  phone2: string;
  fax: string;
  businessNumber: string;
};

const CONTACTS: Contact[] = [];

const ContactsPage = () => {
  const [contacts, setContacts] = useState<Contact[]>(CONTACTS);
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Contact>({
    id: '',
    company: '',
    manager: '',
    title: '',
    phone1: '',
    phone2: '',
    fax: '',
    businessNumber: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return contacts;
    }
    return contacts.filter(item =>
      [item.company, item.manager, item.title, item.phone1, item.phone2, item.businessNumber]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [contacts, query]);

  const handleOpenModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormState({
      id: '',
      company: '',
      manager: '',
      title: '',
      phone1: '',
      phone2: '',
      fax: '',
      businessNumber: ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setModalMode('edit');
    setEditingId(contact.id);
    setFormState({ ...contact });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.company.trim() || !formState.manager.trim()) {
      setFormError('업체명과 담당자를 입력해주세요.');
      return;
    }
    if (modalMode === 'edit' && editingId) {
      setContacts(prev => prev.map(item => (item.id === editingId ? { ...formState, id: editingId } : item)));
    } else {
      const id = `contact-${Date.now()}`;
      setContacts(prev => [...prev, { ...formState, id }]);
    }
    handleCloseModal();
  };

  const handleFormChange =
    <Key extends keyof Contact>(key: Key) =>
    (value: string) => {
      setFormState(prev => ({ ...prev, [key]: value }));
    };

  const renderValue = (value: string) => (value ? value : '-');

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h2>Contacts</h2>
        <p>주요 업체 담당자 연락처를 확인하세요.</p>
      </div>

      <section className={styles.controlsCard}>
        <div className={styles.headerActions}>
          <div className={styles.searchGroup}>
            <div className={styles.searchRow}>
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="업체명, 담당자, 연락처 검색"
              />
              <div className={styles.meta}>{filtered.length}명</div>
            </div>
          </div>
          <div className={styles.actionRow}>
            <button type="button" className={styles.primaryButton} onClick={handleOpenModal}>
              연락처 등록
            </button>
          </div>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.scrollable}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>업체명</th>
                <th>담당자</th>
                <th>직급</th>
                <th>연락처 1</th>
                <th>연락처 2</th>
                <th>FAX</th>
                <th>사업자번호</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>{item.company}</td>
                  <td>{renderValue(item.manager)}</td>
                  <td>{renderValue(item.title)}</td>
                  <td>{renderValue(item.phone1)}</td>
                  <td>{renderValue(item.phone2)}</td>
                  <td>{renderValue(item.fax)}</td>
                  <td>{renderValue(item.businessNumber)}</td>
                  <td className={styles.actionCell}>
                    <div className={styles.actionButtons}>
                      <button type="button" className={styles.actionButton} onClick={() => handleOpenEdit(item)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionButton} ${styles.dangerButton}`}
                        onClick={() => {
                          const confirmDelete = window.confirm('삭제하시겠습니까?');
                          if (!confirmDelete) {
                            return;
                          }
                          setContacts(prev => prev.filter(contact => contact.id !== item.id));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'edit' ? '연락처 수정' : '연락처 등록'}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {formError && <div className={styles.error}>{formError}</div>}
          <label>
            <span>업체명 *</span>
            <input value={formState.company} onChange={event => handleFormChange('company')(event.target.value)} />
          </label>
          <label>
            <span>담당자 *</span>
            <input value={formState.manager} onChange={event => handleFormChange('manager')(event.target.value)} />
          </label>
          <label>
            <span>직급</span>
            <input value={formState.title} onChange={event => handleFormChange('title')(event.target.value)} />
          </label>
          <label>
            <span>연락처 1</span>
            <input value={formState.phone1} onChange={event => handleFormChange('phone1')(event.target.value)} />
          </label>
          <label>
            <span>연락처 2</span>
            <input value={formState.phone2} onChange={event => handleFormChange('phone2')(event.target.value)} />
          </label>
          <label>
            <span>FAX</span>
            <input value={formState.fax} onChange={event => handleFormChange('fax')(event.target.value)} />
          </label>
          <label>
            <span>사업자번호</span>
            <input
              value={formState.businessNumber}
              onChange={event => handleFormChange('businessNumber')(event.target.value)}
            />
          </label>
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={handleCloseModal}>
              취소
            </button>
            <button type="submit" className={styles.primaryButton}>
              등록
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContactsPage;
