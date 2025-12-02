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

const CONTACTS: Contact[] = [
  { id: 'c1', company: '대왕', manager: '장지선', title: '', phone1: '063-467-3988', phone2: '', fax: '', businessNumber: '' },
  { id: 'c2', company: '영풍제지', manager: '이혜린', title: '사원', phone1: '031-660-8226', phone2: '010-6358-6062', fax: '', businessNumber: '' },
  { id: 'c3', company: '신창', manager: '대표번호', title: '', phone1: '041-533-0290', phone2: '', fax: '', businessNumber: '' },
  { id: 'c4', company: '신창', manager: '김인기', title: '과장', phone1: '070-4147-2069', phone2: '010-3034-0145', fax: '', businessNumber: '312-81-49017' },
  { id: 'c5', company: '신창', manager: '김철환', title: '주임', phone1: '070-4147-2055', phone2: '010-8885-0159', fax: '', businessNumber: '' },
  { id: 'c6', company: '주신통상', manager: '이동규', title: '대표', phone1: '010-9488-2445', phone2: '044-862-5599', fax: '', businessNumber: '307-81-12726' },
  { id: 'c7', company: '주신통상', manager: '이복화', title: '과장', phone1: '044-862-5599', phone2: '010-8568-1860', fax: '044-863-0566', businessNumber: '' },
  { id: 'c8', company: '천일', manager: '이수경', title: '과장', phone1: '02-2278-8211', phone2: '', fax: '', businessNumber: '' },
  { id: 'c9', company: '페이퍼코리아', manager: '김학선', title: '대리', phone1: '02-3788-0347', phone2: '', fax: '', businessNumber: '' },
  { id: 'c10', company: '풍융', manager: '연몽영', title: '과장', phone1: '010-4469-2365', phone2: '', fax: '', businessNumber: '' },
  { id: 'c11', company: '프린스페이퍼', manager: '', title: '', phone1: '041-331-4950', phone2: '', fax: '', businessNumber: '311-81-41711' },
  { id: 'c12', company: '한국제지', manager: '한은희', title: '주임', phone1: '02-3475-7376', phone2: '', fax: '', businessNumber: '320-85-02189' }
];

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
          <button type="button" className={styles.primaryButton} onClick={handleOpenModal}>
            연락처 등록
          </button>
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
