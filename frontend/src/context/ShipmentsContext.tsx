import {
  Timestamp,
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
import { Shipment } from '../types/shipment';
import { useAuth } from './AuthContext';

type ShipmentsContextValue = {
  loading: boolean;
  shipments: Shipment[];
  activeShipments: Shipment[];
  archivedShipments: Shipment[];
  createShipment: (
    input: Omit<Shipment, 'id' | 'ownerUid' | 'archived' | 'createdAt' | 'lastUpdatedAt' | 'events'>
  ) => Promise<void>;
  updateShipment: (id: string, data: Partial<Shipment>) => Promise<void>;
  toggleArchive: (id: string, archived: boolean) => Promise<void>;
  deleteShipment: (id: string) => Promise<void>;
};

const ShipmentsContext = createContext<ShipmentsContextValue | undefined>(undefined);

const collectionName = 'shipments';

export const ShipmentsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setShipments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const shipmentsQuery = query(
      collection(db, collectionName),
      where('ownerUid', '==', user.uid),
      orderBy('archived', 'asc'),
      orderBy('lastUpdatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      shipmentsQuery,
      snapshot => {
        const data = snapshot.docs.map(docSnap => {
          const payload = docSnap.data();
          return {
            id: docSnap.id,
            ownerUid: payload.ownerUid,
            carrier: payload.carrier,
            trackingNumber: payload.trackingNumber,
            status: payload.status,
            vesselName: payload.vesselName,
            eta: payload.eta,
            departureDate:
              (typeof payload.departureDate === 'string'
                ? payload.departureDate
                : payload.departureDate?.toDate?.().toISOString?.()) ?? undefined,
            arrivalDate:
              (typeof payload.arrivalDate === 'string'
                ? payload.arrivalDate
                : payload.arrivalDate?.toDate?.().toISOString?.()) ?? undefined,
            portOfLoading: payload.portOfLoading,
            portOfDischarge: payload.portOfDischarge,
            price: payload.price ?? null,
            weight: payload.weight ?? null,
            archived: payload.archived,
            createdAt:
              typeof payload.createdAt === 'string'
                ? payload.createdAt
                : payload.createdAt?.toDate?.().toISOString?.() ?? new Date().toISOString(),
            lastUpdatedAt: payload.lastUpdatedAt ?? new Date().toISOString(),
            events: Array.isArray(payload.events)
              ? payload.events
              : payload.trackingEvents ?? []
          } as Shipment;
        });
        setShipments(data);
        setLoading(false);
      },
      err => {
        console.error('Failed to load shipments', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const value = useMemo<ShipmentsContextValue>(
    () => ({
      loading,
      shipments,
      activeShipments: shipments.filter(shipment => !shipment.archived),
      archivedShipments: shipments.filter(shipment => shipment.archived),
      createShipment: async input => {
        if (!user) {
          throw new Error('User must be logged in to create shipments');
        }

        await addDoc(collection(db, collectionName), {
          ownerUid: user.uid,
          archived: false,
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          events: [],
          ...input
        });
      },
      updateShipment: async (id, data) => {
        await updateDoc(doc(db, collectionName, id), {
          ...data,
          lastUpdatedAt: new Date().toISOString()
        });
      },
      toggleArchive: async (id, archived) => {
        await updateDoc(doc(db, collectionName, id), {
          archived,
          lastUpdatedAt: new Date().toISOString()
        });
      },
      deleteShipment: async id => {
        await deleteDoc(doc(db, collectionName, id));
      }
    }),
    [loading, shipments, user]
  );

  return <ShipmentsContext.Provider value={value}>{children}</ShipmentsContext.Provider>;
};

export const useShipments = () => {
  const ctx = useContext(ShipmentsContext);
  if (!ctx) {
    throw new Error('useShipments must be used within a ShipmentsProvider');
  }
  return ctx;
};
