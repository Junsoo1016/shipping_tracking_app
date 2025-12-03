import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Contact } from '../types/contact';

const collectionName = 'contacts';

type ContactInput = Omit<Contact, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>;

type ContactsContextValue = {
  loading: boolean;
  contacts: Contact[];
  createContact: (input: ContactInput) => Promise<void>;
  updateContact: (id: string, data: Partial<ContactInput>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
};

const ContactsContext = createContext<ContactsContextValue | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, collectionName);
    const contactsQuery = query(colRef, where('ownerUid', '==', user.uid));

    const unsubscribe = onSnapshot(
      contactsQuery,
      snapshot => {
        const data: Contact[] = snapshot.docs.map(docSnap => {
          const payload = docSnap.data();

          const toIsoString = (value: unknown) => {
            if (!value) return '';
            if (typeof value === 'string') return value;
            if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
              return (value as { toDate: () => Date }).toDate().toISOString();
            }
            return '';
          };

          return {
            id: docSnap.id,
            ownerUid: payload.ownerUid,
            company: payload.company ?? '',
            manager: payload.manager ?? '',
            title: payload.title ?? '',
            phone1: payload.phone1 ?? '',
            phone2: payload.phone2 ?? '',
            fax: payload.fax ?? '',
            businessNumber: payload.businessNumber ?? '',
            createdAt: toIsoString(payload.createdAt) || new Date().toISOString(),
            updatedAt: toIsoString(payload.updatedAt) || new Date().toISOString()
          };
        });

        const parseSortDate = (value: string) => {
          const ts = Date.parse(value || '');
          return Number.isNaN(ts) ? 0 : ts;
        };
        const sorted = data.sort((a, b) => parseSortDate(b.createdAt) - parseSortDate(a.createdAt));

        setContacts(sorted);
        setLoading(false);
      },
      err => {
        console.error('Failed to load contacts', err);
        setContacts([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const value = useMemo<ContactsContextValue>(
    () => ({
      loading,
      contacts,
      createContact: async input => {
        if (!user) {
          throw new Error('User must be logged in to create contacts');
        }
        const colRef = collection(db, collectionName);
        const now = new Date().toISOString();
        await addDoc(colRef, {
          ...input,
          ownerUid: user.uid,
          createdAt: now,
          updatedAt: now
        });
      },
      updateContact: async (id, data) => {
        const docRef = doc(db, collectionName, id);
        const payload: Record<string, unknown> = {
          ...data,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(docRef, payload);
      },
      deleteContact: async id => {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
      }
    }),
    [contacts, loading, user]
  );

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
};

export const useContacts = () => {
  const ctx = useContext(ContactsContext);
  if (!ctx) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return ctx;
};
