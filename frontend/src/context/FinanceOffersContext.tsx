import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db } from '../firebase/config';
import { FinanceOffer } from '../types/financeOffer';
import { useAuth } from './AuthContext';

const collectionName = 'financeOffers';
const MAX_BATCH_SIZE = 500;

type FinanceOfferInput = Omit<FinanceOffer, 'id' | 'ownerUid'>;

type FinanceOffersContextValue = {
  loading: boolean;
  offers: FinanceOffer[];
  createOffer: (input: FinanceOfferInput) => Promise<void>;
  updateOffer: (id: string, data: Partial<FinanceOfferInput>) => Promise<void>;
  deleteOffer: (id: string) => Promise<void>;
  deleteOffers: (ids: string[]) => Promise<void>;
  importOffers: (inputs: FinanceOfferInput[]) => Promise<void>;
};

const FinanceOffersContext = createContext<FinanceOffersContextValue | undefined>(undefined);

export const FinanceOffersProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<FinanceOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOffers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, collectionName);
    const offersQuery = query(colRef, where('ownerUid', '==', user.uid));

    const unsubscribe = onSnapshot(
      offersQuery,
      snapshot => {
        const data: FinanceOffer[] = snapshot.docs.map(docSnap => {
          const payload = docSnap.data();

          return {
            id: docSnap.id,
            ownerUid: payload.ownerUid,
            company: payload.company,
            offerNumber: payload.offerNumber,
            salesOrder: payload.salesOrder,
            invoiceNumber: payload.invoiceNumber,
            customer: payload.customer,
            grade: payload.grade ?? '',
            pricingTerm: payload.pricingTerm ?? '',
            offerMetricTons: payload.offerMetricTons ?? undefined,
            offerDate: payload.offerDate ?? '',
            portOfLoading: payload.portOfLoading ?? '',
            etd: payload.etd ?? '',
            eta: payload.eta ?? '',
            bookingNumber: payload.bookingNumber ?? '',
            metricTons: payload.metricTons ?? '',
            usdPerMetricTon: payload.usdPerMetricTon ?? '',
            amount: payload.amount ?? '',
            settlementDate: payload.settlementDate ?? '',
            paymentCondition: payload.paymentCondition ?? '',
            note: payload.note ?? '',
            commission: payload.commission ?? '',
            totalCommission: payload.totalCommission ?? '',
            depositDate: payload.depositDate ?? ''
          };
        });

        const parseSortDate = (value: string) => {
          const ts = Date.parse(value || '');
          return Number.isNaN(ts) ? 0 : ts;
        };
        const sorted = data.sort((a, b) => parseSortDate(b.offerDate) - parseSortDate(a.offerDate));

        setOffers(sorted);
        setLoading(false);
      },
      err => {
        console.error('Failed to load finance offers', err);
        setOffers([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const value = useMemo<FinanceOffersContextValue>(
    () => ({
      loading,
      offers,
      createOffer: async input => {
        if (!user) {
          throw new Error('User must be logged in to create offers');
        }
        const colRef = collection(db, collectionName);
        await addDoc(colRef, {
          ...input,
          offerMetricTons: input.offerMetricTons ?? '',
          note: input.note ?? '',
          ownerUid: user.uid
        });
      },
      updateOffer: async (id, data) => {
        const docRef = doc(db, collectionName, id);
        const payload: Record<string, unknown> = {
          ...data
        };
        if ('offerMetricTons' in data) {
          payload.offerMetricTons = data.offerMetricTons ?? '';
        }
        if ('note' in data) {
          payload.note = data.note ?? '';
        }
        await updateDoc(docRef, payload);
      },
      deleteOffer: async id => {
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
      },
      deleteOffers: async ids => {
        if (ids.length === 0) {
          return;
        }
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
          chunks.push(ids.slice(i, i + MAX_BATCH_SIZE));
        }
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(id => batch.delete(doc(db, collectionName, id)));
          await batch.commit();
        }
      },
      importOffers: async inputs => {
        if (!user || inputs.length === 0) {
          return;
        }
        const colRef = collection(db, collectionName);
        const chunks: FinanceOfferInput[][] = [];
        for (let i = 0; i < inputs.length; i += MAX_BATCH_SIZE) {
          chunks.push(inputs.slice(i, i + MAX_BATCH_SIZE));
        }
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(input => {
            const docRef = doc(colRef);
            batch.set(docRef, {
              ...input,
              offerMetricTons: input.offerMetricTons ?? '',
              note: input.note ?? '',
              ownerUid: user.uid
            });
          });
          await batch.commit();
        }
      }
    }),
    [loading, offers, user]
  );

  return <FinanceOffersContext.Provider value={value}>{children}</FinanceOffersContext.Provider>;
};

export const useFinanceOffers = () => {
  const ctx = useContext(FinanceOffersContext);
  if (!ctx) {
    throw new Error('useFinanceOffers must be used within a FinanceOffersProvider');
  }
  return ctx;
};
