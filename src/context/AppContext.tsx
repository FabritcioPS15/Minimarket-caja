import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Sale, User, KardexEntry, CashSession, Alert, UserRole } from '../types';
import { useProducts } from '../hooks/useProducts';

interface AppState {
  sales: Sale[];
  users: User[];
  kardexEntries: KardexEntry[];
  cashSessions: CashSession[];
  alerts: Alert[];
  currentUser: User | null;
  currentCashSession: CashSession | null;
  // Products ahora se manejan por separado con el hook
}

type AppAction =
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'ADD_KARDEX_ENTRY'; payload: KardexEntry }
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'START_CASH_SESSION'; payload: CashSession }
  | { type: 'END_CASH_SESSION' }
  | { type: 'ADD_CASH_SESSION_HISTORY'; payload: CashSession }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'MARK_ALERT_READ'; payload: string }
  | { type: 'LOAD_DATA'; payload: Partial<AppState> };

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  products: {
    data: any[];
    loading: boolean;
    error: string | null;
    addProduct: (product: any) => Promise<any>;
    updateProduct: (product: any) => Promise<any>;
    deleteProduct: (id: string) => Promise<void>;
    refetch: () => Promise<void>;
  };
} | null>(null);

const initialState: AppState = {
  sales: [],
  users: [],
  kardexEntries: [],
  cashSessions: [],
  alerts: [],
  currentUser: null,
  currentCashSession: null,
};

// Create default users
const defaultUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@sistema.com',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    username: 'supervisor',
    email: 'supervisor@sistema.com',
    role: 'supervisor',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    username: 'vendedor',
    email: 'vendedor@sistema.com',
    role: 'cashier',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_SALE':
      return { ...state, sales: [...state.sales, action.payload] };
    
    case 'ADD_KARDEX_ENTRY':
      return { ...state, kardexEntries: [...state.kardexEntries, action.payload] };
    
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    
    case 'LOGOUT':
      return { ...state, currentUser: null, currentCashSession: null };
    
    case 'START_CASH_SESSION':
      return { ...state, currentCashSession: action.payload, cashSessions: [...state.cashSessions, action.payload] };
    
    case 'END_CASH_SESSION':
      const updatedSession = state.currentCashSession ? {
        ...state.currentCashSession,
        endTime: new Date().toISOString(),
        status: 'closed' as const,
      } : null;
      
      return {
        ...state,
        currentCashSession: null,
        cashSessions: updatedSession ? 
          state.cashSessions.map(s => s.id === updatedSession.id ? updatedSession : s) :
          state.cashSessions,
      };
    
    case 'ADD_CASH_SESSION_HISTORY':
      return {
        ...state,
        cashSessions: state.cashSessions.map(s => 
          s.id === action.payload.id ? action.payload : s
        ),
      };
    
    case 'ADD_ALERT':
      return { ...state, alerts: [...state.alerts, action.payload] };
    
    case 'MARK_ALERT_READ':
      return {
        ...state,
        alerts: state.alerts.map(a => a.id === action.payload ? { ...a, isRead: true } : a),
      };
    
    case 'LOAD_DATA':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const productsHook = useProducts();

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('inventorySystem');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      dispatch({ type: 'LOAD_DATA', payload: { ...parsedData, users: defaultUsers } });
    } else {
      dispatch({ type: 'LOAD_DATA', payload: { users: defaultUsers } });
    }
  }, []);

  // Save data to localStorage on state changes
  useEffect(() => {
    if (state.sales.length > 0) {
      localStorage.setItem('inventorySystem', JSON.stringify({
        sales: state.sales,
        kardexEntries: state.kardexEntries,
        cashSessions: state.cashSessions,
        alerts: state.alerts,
      }));
    }
  }, [state.sales, state.kardexEntries, state.cashSessions, state.alerts]);

  return (
    <AppContext.Provider value={{ 
      state, 
      dispatch,
      products: {
        data: productsHook.products,
        loading: productsHook.loading,
        error: productsHook.error,
        addProduct: productsHook.addProduct,
        updateProduct: productsHook.updateProduct,
        deleteProduct: productsHook.deleteProduct,
        refetch: productsHook.refetch,
      }
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}