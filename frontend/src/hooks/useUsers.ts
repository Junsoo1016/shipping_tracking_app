import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db, functions } from '../firebase/config';

export type ManagedUser = {
  id: string;
  email: string;
  role: 'user' | 'admin';
};

export const useUsers = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('email'));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        setUsers(
          snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              email: data.email,
              role: data.role ?? 'user'
            } as ManagedUser;
          })
        );
        setLoading(false);
      },
      err => {
        console.error(err);
        setError('Unable to load users');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const setRole = async (userId: string, role: 'user' | 'admin') => {
    const callable = httpsCallable(functions, 'setUserRole');
    await callable({ userId, role });
  };

  return { users, loading, error, setRole };
};
