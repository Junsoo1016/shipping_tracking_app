import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  role: 'user' | 'admin';
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'user' | 'admin'>('user');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (currentUser) {
        currentUser
          .getIdTokenResult(true)
          .then(token => {
            setRole((token.claims.role as 'user' | 'admin') ?? 'user');
            setLoading(false);
          })
          .catch(err => {
            console.error('Failed to load custom claims', err);
            setRole('user');
            setLoading(false);
          });
      } else {
        setRole('user');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      role,
      signIn: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      register: async (email: string, password: string) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', credential.user.uid), {
          email,
          role: 'user'
        });
      },
      signOut: async () => {
        await firebaseSignOut(auth);
      }
    }),
    [user, loading, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
