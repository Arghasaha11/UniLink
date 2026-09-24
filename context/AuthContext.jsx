"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const AuthContext = createContext();

const USER_KEY = "unilink_user";
const ACCOUNTS_KEY = "unilink_accounts";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load logged-in user when the app starts
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Failed to load user:", error);
      localStorage.removeItem(USER_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = (newUser) => {
    const savedAccounts =
      JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];

    const account = {
      ...newUser,
      id: Date.now(),
    };

    const updatedAccounts = [
      ...savedAccounts,
      account,
    ];

    localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify(updatedAccounts)
    );

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(account)
    );

    setUser(account);

    return account;
  };

  const login = (email, password) => {
    const savedAccounts =
      JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];

    const account = savedAccounts.find(
      (item) =>
        String(item.email || "").toLowerCase() ===
          email &&
        item.password === password
    );

    if (!account) {
      return false;
    }

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(account)
    );

    setUser(account);

    return true;
  };

  const updateUser = (updatedData) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      ...updatedData,
    };

    const savedAccounts =
      JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];

    const updatedAccounts = savedAccounts.map(
      (account) =>
        String(account.id) === String(user.id)
          ? updatedUser
          : account
    );

    localStorage.setItem(
      ACCOUNTS_KEY,
      JSON.stringify(updatedAccounts)
    );

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(updatedUser)
    );

    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        register,
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}