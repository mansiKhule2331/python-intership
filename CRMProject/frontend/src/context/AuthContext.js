/**
 * AuthContext - JWT-based authentication state management
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const ACTIONS = {
  SET_USER: 'SET_USER',
  SET_LOADING: 'SET_LOADING',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
};

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_USER:
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, isLoading: false };
    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case ACTIONS.LOGOUT:
      return { ...initialState, isLoading: false };
    case ACTIONS.UPDATE_USER:
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
        return;
      }
      try {
        const { data } = await authAPI.getProfile();
        dispatch({ type: ACTIONS.SET_USER, payload: data });
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    };
    loadUser();
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authAPI.login(credentials);
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    dispatch({ type: ACTIONS.SET_USER, payload: data.user });
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const { data } = await authAPI.register(userData);
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    dispatch({ type: ACTIONS.SET_USER, payload: data.user });
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await authAPI.logout(refresh);
    } catch {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    dispatch({ type: ACTIONS.LOGOUT });
  }, []);

  const updateUser = useCallback((updates) => {
    dispatch({ type: ACTIONS.UPDATE_USER, payload: updates });
  }, []);

  const isAdmin = state.user?.role === 'admin';
  const isSalesRep = state.user?.role === 'sales_rep';

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      register,
      logout,
      updateUser,
      isAdmin,
      isSalesRep,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
