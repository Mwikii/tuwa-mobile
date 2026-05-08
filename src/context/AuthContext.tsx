import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  role: 'RIDER' | 'DRIVER';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  registerRider: (name: string, phone: string, password: string, email?: string) => Promise<void>;
  registerDriver: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  saveUser: (token: string, user: User) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      const stored = await SecureStore.getItemAsync('tuwa_token');
      const storedUser = await SecureStore.getItemAsync('tuwa_user');
      if (stored && storedUser) {
        setToken(stored);
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    loadToken();
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await api.post('/api/auth/login', { phone, password });
    const { token, user } = res.data;
    await SecureStore.setItemAsync('tuwa_token', token);
    await SecureStore.setItemAsync('tuwa_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const registerRider = async (name: string, phone: string, password: string, email?: string) => {
    const res = await api.post('/api/auth/register/rider', { name, phone, password, email });
    const { token, user } = res.data;
    await SecureStore.setItemAsync('tuwa_token', token);
    await SecureStore.setItemAsync('tuwa_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const registerDriver = async (data: any) => {
    const res = await api.post('/api/auth/register/driver', data);
    const { token, user } = res.data;
    await SecureStore.setItemAsync('tuwa_token', token);
    await SecureStore.setItemAsync('tuwa_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('tuwa_token');
    await SecureStore.deleteItemAsync('tuwa_user');
    setToken(null);
    setUser(null);
  };

  const saveUser = async (token: string, user: User) => {
    await SecureStore.setItemAsync('tuwa_token', token);
    await SecureStore.setItemAsync('tuwa_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const updateUser = async (updates: Partial<User>) => {
    const res = await api.put('/api/auth/profile', updates);
    const updatedUser = { ...user, ...res.data.user } as User;
    await SecureStore.setItemAsync('tuwa_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, registerRider, registerDriver,
      logout, saveUser, updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
