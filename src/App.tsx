import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, hasSupabaseCreds } from './lib/supabase';
import type { Expense, Budget, SavingsTransaction } from './types';
import { Auth } from './components/Auth';
import { BudgetBar } from './components/BudgetBar';
import { TransactionsTab } from './components/TransactionsTab';
import { InsightsTab } from './components/InsightsTab';
import { AddExpenseSheet } from './components/AddExpenseSheet';
import { ConfigureBudgetSheet } from './components/ConfigureBudgetSheet';
import { SavingsTab } from './components/SavingsTab';
import { PeriodLogsTab } from './components/PeriodLogsTab';
import { CalendarTab } from './components/CalendarTab';
import { ProfileSettings } from './components/ProfileSettings';
import Dock from './components/Dock';
import {
  Plus,
  CheckCircle,
  WifiOff,
  Undo2,
  CalendarDays,
  Sparkles,
  CreditCard,
  PiggyBank,
  History,
  Settings,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  PieChart,
} from 'lucide-react';

// Relative date generator helper for offline seeding
const getRelativeDateStr = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Seed mock expenses for offline mode to provide premium UX immediately
const MOCK_EXPENSES_SEED = () => [
  {
    id: 'mock-1',
    user_id: 'mock-user-123',
    amount: 350.50,
    category: 'food',
    note: 'Lunch at ramen bar 🍜',
    date: getRelativeDateStr(0),
    created_at: new Date().toISOString(),
    type: 'debit',
  },
  {
    id: 'mock-2',
    user_id: 'mock-user-123',
    amount: 180.00,
    category: 'transport',
    note: 'Uber to work',
    date: getRelativeDateStr(0),
    created_at: new Date().toISOString(),
    type: 'debit',
  },
  {
    id: 'mock-3',
    user_id: 'mock-user-123',
    amount: 1250.00,
    category: 'groceries',
    note: 'Weekly essentials',
    date: getRelativeDateStr(1),
    created_at: new Date().toISOString(),
    type: 'debit',
  },
  {
    id: 'mock-4',
    user_id: 'mock-user-123',
    amount: 4500.00,
    category: 'bills',
    note: 'Electricity bill payment',
    date: getRelativeDateStr(2),
    created_at: new Date().toISOString(),
    type: 'debit',
  },
  {
    id: 'mock-5',
    user_id: 'mock-user-123',
    amount: 1200.00,
    category: 'entertainment',
    note: 'Movie night with friends',
    date: getRelativeDateStr(3),
    created_at: new Date().toISOString(),
    type: 'debit',
  },
  {
    id: 'mock-6',
    user_id: 'mock-user-123',
    amount: 15000.00,
    category: 'other',
    note: 'Salary credit 💼',
    date: getRelativeDateStr(5),
    created_at: new Date().toISOString(),
    type: 'credit',
  },
  {
    id: 'mock-7',
    user_id: 'mock-user-123',
    amount: 650.00,
    category: 'health',
    note: 'Vitamin supplements',
    date: getRelativeDateStr(7),
    created_at: new Date().toISOString(),
    type: 'debit',
  },
];

// Seed mock savings for offline mode
const MOCK_SAVINGS_SEED = () => [
  {
    id: 'mock-sav-1',
    user_id: 'mock-user-123',
    amount: 10000.00,
    type: 'incoming',
    note: 'Initial Emergency Fund allocation 🧯',
    date: getRelativeDateStr(10),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-sav-2',
    user_id: 'mock-user-123',
    amount: 2500.00,
    type: 'incoming',
    note: 'Monthly Gold deposit 🪙',
    date: getRelativeDateStr(4),
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-sav-3',
    user_id: 'mock-user-123',
    amount: 1500.00,
    type: 'outgoing',
    note: 'Withdrawn for minor repairs',
    date: getRelativeDateStr(1),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper to calculate previous month string (YYYY-MM)
const getPreviousMonthStr = (currentMonthStr: string): string => {
  const [year, month] = currentMonthStr.split('-').map(Number);
  const prevDate = new Date(year, month - 2, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
};

// Helper to calculate standard calendar month range
const getMonthRange = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
};

// Helper to format YYYY-MM-DD to e.g. "2 Jul"
const formatDateShort = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Helper to get local date in YYYY-MM-DD
const getLocalDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsTransaction[]>([]);
  
  // New Month Carry Over Banner states
  const [showCarryOverPrompt, setShowCarryOverPrompt] = useState(false);
  const [previousMonthBudget, setPreviousMonthBudget] = useState<number | null>(null);
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'expenses' | 'savings' | 'logs' | 'calendar' | 'settings'>('expenses');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isBudgetEditorOpen, setIsBudgetEditorOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [loading, setLoading] = useState(true);

  // Undo Toast State
  const [toast, setToast] = useState<{ message: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const lastDeletedExpenseRef = useRef<Expense | null>(null);

  // Helper check for offline database mode
  const isOfflineMode = !hasSupabaseCreds;

  // Initialize Auth & Offline Storage Seeding
  useEffect(() => {
    if (isOfflineMode) {
      setSession({ user: { id: 'mock-user-123', email: 'ledger.offline@local' } });
      setAuthChecked(true);

      const seeded = localStorage.getItem('ledger_seeded_v2');
      if (!seeded) {
        localStorage.setItem('ledger_expenses', JSON.stringify(MOCK_EXPENSES_SEED()));
        localStorage.setItem('ledger_savings', JSON.stringify(MOCK_SAVINGS_SEED()));
        
        const currentMonthStr = new Date().toISOString().substring(0, 7);
        const prevMonthStr = getPreviousMonthStr(currentMonthStr);
        
        const historySeed: Budget[] = [
          {
            user_id: 'mock-user-123',
            type: 'monthly',
            month: prevMonthStr,
            monthly: 25000,
            category_limits: {},
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ];
        localStorage.setItem('ledger_budgets_history', JSON.stringify(historySeed));
        localStorage.setItem('ledger_seeded_v2', 'true');
      }
      setLoading(false);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setAuthChecked(true);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) {
          fetchData();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOfflineMode]);

  // Fetch Data (Expenses, Budgets, and Savings)
  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);

    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const previousMonthStr = getPreviousMonthStr(currentMonthStr);

    try {
      if (isOfflineMode) {
        const localEx = localStorage.getItem('ledger_expenses');
        const localBgHistory = localStorage.getItem('ledger_budgets_history');
        const localSav = localStorage.getItem('ledger_savings');
        
        const parsedExpenses: Expense[] = localEx ? JSON.parse(localEx) : [];
        setExpenses(parsedExpenses);

        const budgetsList: Budget[] = localBgHistory ? JSON.parse(localBgHistory) : [];
        setAllBudgets(budgetsList);

        const parsedSavings: SavingsTransaction[] = localSav ? JSON.parse(localSav) : [];
        setSavings(parsedSavings);

        // Compute carry over triggers
        const todayStr = getLocalDateString();
        const activeCustom = budgetsList.find(
          (b) => b.type === 'custom' && b.start_date && b.end_date && todayStr >= b.start_date && todayStr <= b.end_date
        );
        const activeMonthly = budgetsList.find(
          (b) => b.type === 'monthly' && b.month === currentMonthStr
        );

        if (!activeCustom && !activeMonthly) {
          const prevRow = budgetsList.find((b) => b.type === 'monthly' && b.month === previousMonthStr);
          if (prevRow && Number(prevRow.monthly) > 0) {
            setPreviousMonthBudget(Number(prevRow.monthly));
            setShowCarryOverPrompt(true);
          } else {
            setShowCarryOverPrompt(false);
          }
        } else {
          setShowCarryOverPrompt(false);
        }
      } else {
        const [expensesRes, budgetsRes, savingsRes] = await Promise.all([
          supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase
            .from('budgets')
            .select('*')
            .eq('user_id', session.user.id),
          supabase
            .from('savings')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
        ]);

        if (expensesRes.error) throw expensesRes.error;
        setExpenses(expensesRes.data || []);

        if (budgetsRes.error) throw budgetsRes.error;
        const budgetsList: Budget[] = budgetsRes.data || [];
        setAllBudgets(budgetsList);

        if (savingsRes.error) throw savingsRes.error;
        setSavings(savingsRes.data || []);

        // Compute carry over triggers
        const todayStr = getLocalDateString();
        const activeCustom = budgetsList.find(
          (b) => b.type === 'custom' && b.start_date && b.end_date && todayStr >= b.start_date && todayStr <= b.end_date
        );
        const activeMonthly = budgetsList.find(
          (b) => b.type === 'monthly' && b.month === currentMonthStr
        );

        if (!activeCustom && !activeMonthly) {
          const prevRow = budgetsList.find((b) => b.type === 'monthly' && b.month === previousMonthStr);
          if (prevRow && Number(prevRow.monthly) > 0) {
            setPreviousMonthBudget(Number(prevRow.monthly));
            setShowCarryOverPrompt(true);
          } else {
            setShowCarryOverPrompt(false);
          }
        } else {
          setShowCarryOverPrompt(false);
        }
      }
    } catch (err) {
      console.error('Error fetching Ledger data:', err);
    } finally {
      setLoading(false);
    }
  }, [session, isOfflineMode]);

  // Trigger initial fetch when session is established
  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session, fetchData]);

  // Supabase Realtime Subscription Binding
  useEffect(() => {
    if (isOfflineMode || !session?.user) return;

    const channel = supabase
      .channel(`ledger_realtime_sync_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'savings',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOfflineMode, session, fetchData]);

  // Compute active budget configuration and active date range
  const activeBudgetAndRange = useMemo(() => {
    const todayStr = getLocalDateString();
    
    if (allBudgets.length === 0) {
      const monthRange = getMonthRange(todayStr.substring(0, 7));
      return {
        budgetConfig: null,
        limit: 0,
        range: {
          startDate: monthRange.startDate,
          endDate: monthRange.endDate,
          label: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          isCustom: false,
        }
      };
    }

    // Sort budgets by created_at descending (latest first) to pick the active preference
    const sortedBudgets = [...allBudgets].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    const latestBudget = sortedBudgets[0];

    if (latestBudget.type === 'custom') {
      return {
        budgetConfig: latestBudget,
        limit: Number(latestBudget.monthly),
        range: {
          startDate: latestBudget.start_date!,
          endDate: latestBudget.end_date!,
          label: `${formatDateShort(latestBudget.start_date!)} - ${formatDateShort(latestBudget.end_date!)}`,
          isCustom: true,
        }
      };
    }

    const budgetMonth = latestBudget.month || todayStr.substring(0, 7);
    const monthRange = getMonthRange(budgetMonth);
    return {
      budgetConfig: latestBudget,
      limit: Number(latestBudget.monthly),
      range: {
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
        label: new Date(budgetMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        isCustom: false,
      }
    };
  }, [allBudgets]);

  const budget = activeBudgetAndRange.limit;
  const activeBudget = activeBudgetAndRange.budgetConfig;
  const activeRange = activeBudgetAndRange.range;

  // Calculations for active budget range transactions
  const currentRangeTotals = useMemo(() => {
    const spent = expenses
      .filter((e) => e.date >= activeRange.startDate && e.date <= activeRange.endDate && e.type !== 'credit')
      .reduce((sum, e) => sum + Number(e.amount), 0);
      
    const credited = expenses
      .filter((e) => e.date >= activeRange.startDate && e.date <= activeRange.endDate && e.type === 'credit')
      .reduce((sum, e) => sum + Number(e.amount), 0);
      
    return { spent, credited };
  }, [expenses, activeRange]);

  // Filter transactions matching the active budget period
  const activePeriodExpenses = useMemo(() => {
    return expenses.filter(
      (e) => e.date >= activeRange.startDate && e.date <= activeRange.endDate
    );
  }, [expenses, activeRange]);

  // Toast System trigger helper
  const showToast = useCallback((message: string, actionLabel?: string, onAction?: () => void) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, actionLabel, onAction });
    
    // Auto dismiss after 5 seconds
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 5000);
  }, []);

  // Add Expense/Credit Callback
  const handleSaveExpense = async (data: { amount: number; category: string; note: string; date: string; type: 'debit' | 'credit' }) => {
    if (!session?.user) return;

    const newExpense = {
      user_id: session.user.id,
      amount: data.amount,
      category: data.category,
      note: data.note || null,
      date: data.date,
      type: data.type,
    };

    try {
      if (isOfflineMode) {
        const currentExpenses = [...expenses];
        const savedExpense = {
          ...newExpense,
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
        } as Expense;
        const updated = [savedExpense, ...currentExpenses].sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(updated);
        localStorage.setItem('ledger_expenses', JSON.stringify(updated));
        showToast(data.type === 'credit' ? 'Income credit logged.' : 'Expense logged successfully.');
      } else {
        const { error } = await supabase.from('expenses').insert([newExpense]);
        if (error) throw error;
        showToast(data.type === 'credit' ? 'Income credit logged.' : 'Expense logged successfully.');
      }
    } catch (err) {
      console.error('Error saving transaction:', err);
      showToast('Could not save transaction. Try again.');
    }
  };

  // Undo delete callback handler
  const handleUndoDelete = async () => {
    const backup = lastDeletedExpenseRef.current;
    if (!backup) return;

    try {
      if (isOfflineMode) {
        const current = expenses.filter((e) => e.id !== backup.id);
        const updated = [backup, ...current].sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(updated);
        localStorage.setItem('ledger_expenses', JSON.stringify(updated));
        showToast('Transaction restored.');
      } else {
        const { error } = await supabase.from('expenses').insert([{
          id: backup.id,
          user_id: backup.user_id,
          amount: backup.amount,
          category: backup.category,
          note: backup.note,
          date: backup.date,
          type: backup.type,
        }]);
        if (error) throw error;
        showToast('Transaction restored.');
      }
    } catch (err) {
      console.error('Failed to undo deletion:', err);
      showToast('Failed to restore transaction.');
    } finally {
      lastDeletedExpenseRef.current = null;
      setToast(null);
    }
  };

  // Delete Expense Callback
  const handleDeleteExpense = async (id: string) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return;

    // Backup to support instant Undo action
    lastDeletedExpenseRef.current = target;

    // Optimistic UI state update
    const filtered = expenses.filter((e) => e.id !== id);
    setExpenses(filtered);

    try {
      if (isOfflineMode) {
        localStorage.setItem('ledger_expenses', JSON.stringify(filtered));
        showToast('Transaction deleted', 'Undo', handleUndoDelete);
      } else {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        showToast('Transaction deleted', 'Undo', handleUndoDelete);
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      showToast('Could not delete transaction.');
      fetchData();
    }
  };

  // Save Budget Configuration (Supporting monthly & custom types)
  const handleSaveBudget = async (data: {
    type: 'monthly' | 'custom';
    monthly: number;
    start_date?: string;
    end_date?: string;
  }) => {
    if (!session?.user) return;
    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"

    const newBudget: Partial<Budget> = {
      user_id: session.user.id,
      type: data.type,
      monthly: data.monthly,
      category_limits: {},
    };

    if (data.type === 'monthly') {
      newBudget.month = currentMonthStr;
    } else {
      newBudget.start_date = data.start_date;
      newBudget.end_date = data.end_date;
    }

    try {
      if (isOfflineMode) {
        const localBgHistory = localStorage.getItem('ledger_budgets_history');
        let budgetsList: Budget[] = localBgHistory ? JSON.parse(localBgHistory) : [];
        
        // Remove currently active budget if we are replacing it
        if (activeBudget && activeBudget.id) {
          budgetsList = budgetsList.filter((b) => b.id !== activeBudget.id);
        } else if (data.type === 'monthly') {
          budgetsList = budgetsList.filter(
            (b) => !(b.type === 'monthly' && b.month === currentMonthStr)
          );
        }

        const newLocalBudget: Budget = {
          ...newBudget,
          id: `local-budget-${Date.now()}`,
          created_at: new Date().toISOString(),
        } as Budget;

        budgetsList.push(newLocalBudget);
        localStorage.setItem('ledger_budgets_history', JSON.stringify(budgetsList));
        setAllBudgets(budgetsList);
        setShowCarryOverPrompt(false);
        showToast('Budget configured successfully.');
      } else {
        // Remove currently active budget from Supabase before inserting
        if (activeBudget && activeBudget.id) {
          await supabase
            .from('budgets')
            .delete()
            .eq('id', activeBudget.id);
        } else if (data.type === 'monthly') {
          await supabase
            .from('budgets')
            .delete()
            .eq('user_id', session.user.id)
            .eq('type', 'monthly')
            .eq('month', currentMonthStr);
        }

        const { error } = await supabase.from('budgets').insert([newBudget]);
        if (error) throw error;
        
        await fetchData();
        showToast('Budget configured successfully.');
      }
    } catch (err) {
      console.error('Error saving budget config:', err);
      showToast('Failed to save budget settings.');
      throw err;
    }
  };

  // Carry over previous month's budget values
  const handleCarryOverBudget = async () => {
    if (previousMonthBudget === null) return;
    try {
      await handleSaveBudget({
        type: 'monthly',
        monthly: previousMonthBudget,
      });
      showToast(`Carried over budget of ₹${previousMonthBudget.toLocaleString('en-IN')}`);
    } catch (err) {
      console.error('Failed carrying over budget:', err);
    }
  };

  // Log Savings Callback
  const handleAddSavings = async (data: { amount: number; type: 'incoming' | 'outgoing'; note: string; date: string }) => {
    if (!session?.user) return;
    const newSavings = {
      user_id: session.user.id,
      amount: data.amount,
      type: data.type,
      note: data.note || null,
      date: data.date,
    };

    try {
      if (isOfflineMode) {
        const current = [...savings];
        const saved = {
          ...newSavings,
          id: `local-savings-${Date.now()}`,
          created_at: new Date().toISOString(),
        } as SavingsTransaction;
        const updated = [saved, ...current].sort((a, b) => b.date.localeCompare(a.date));
        setSavings(updated);
        localStorage.setItem('ledger_savings', JSON.stringify(updated));
        showToast(data.type === 'incoming' ? 'Savings deposit logged.' : 'Savings withdrawal logged.');
      } else {
        const { error } = await supabase.from('savings').insert([newSavings]);
        if (error) throw error;
        showToast(data.type === 'incoming' ? 'Savings deposit logged.' : 'Savings withdrawal logged.');
      }
    } catch (err) {
      console.error('Error saving savings transaction:', err);
      showToast('Could not save savings transaction. Try again.');
    }
  };

  // Delete Savings Callback
  const handleDeleteSavings = async (id: string) => {
    const filtered = savings.filter((s) => s.id !== id);
    setSavings(filtered);

    try {
      if (isOfflineMode) {
        localStorage.setItem('ledger_savings', JSON.stringify(filtered));
        showToast('Savings entry deleted.');
      } else {
        const { error } = await supabase.from('savings').delete().eq('id', id);
        if (error) throw error;
        showToast('Savings entry deleted.');
      }
    } catch (err) {
      console.error('Error deleting savings entry:', err);
      showToast('Could not delete savings entry.');
      fetchData();
    }
  };

  // Sign out control handler
  const handleSignOut = async () => {
    if (isOfflineMode) {
      setSession(null);
    } else {
      await supabase.auth.signOut();
    }
  };

  const getCurrentMonthName = () => {
    return new Date().toLocaleDateString('en-IN', { month: 'long' });
  };

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-ledgerBg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-ledgerMuted">
          <svg className="w-10 h-10 animate-spin text-ledgerMint" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs uppercase tracking-widest font-semibold">Opening Ledger...</span>
        </div>
      </div>
    );
  }

  // If no auth/session, show Auth login/signup screen
  if (!session) {
    return <Auth onAuthSuccess={fetchData} />;
  }

  // Net Remaining Balance = Budget - Spent + Credited
  const currentBalance = budget - currentRangeTotals.spent + currentRangeTotals.credited;
  const isBalanceNegative = currentBalance < 0;

  return (
    <div className="min-h-screen bg-ledgerBg text-ledgerText flex justify-center selection:bg-ledgerMint/25 selection:text-ledgerMint">
      {/* Shell Container: Center max-width 480px */}
      <div className="w-full max-w-[480px] bg-ledgerBg min-h-screen flex flex-col relative border-x border-ledgerBorder/40">
        
        {/* Offline Simulation Banner Indicator */}
        {isOfflineMode && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 px-4 py-2 text-[10px] font-medium flex items-center gap-2 justify-center select-none">
            <WifiOff className="w-3.5 h-3.5" />
            Offline Sandbox Mode (Demo). Set Supabase variables in .env.local to go live.
          </div>
        )}

        {/* Sticky Header with sums and budgets */}
        <header className="sticky top-0 bg-ledgerBg/90 backdrop-blur-md border-b border-ledgerBorder/60 p-5 z-30">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted select-none">
                {activeRange.isCustom ? 'Active Period Balance' : 'Monthly Balance'}
              </span>
              <h1 className={`text-3xl font-mono tracking-tight font-bold tabular-nums mt-0.5 ${isBalanceNegative ? 'text-ledgerCoral' : 'text-[#7FE7C4]'}`}>
                ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
            </div>
            
            {/* Configure Budget Trigger Button */}
            <button
              onClick={() => setIsBudgetEditorOpen(true)}
              className="text-ledgerMuted hover:text-ledgerMint transition-all p-2 rounded-lg bg-ledgerElevated/50 border border-ledgerBorder hover:border-ledgerMint/40 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider shadow"
              title="Configure Budget"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Setup
            </button>
          </div>

          {/* Budget Progress Bar */}
          <BudgetBar
            spent={currentRangeTotals.spent}
            credited={currentRangeTotals.credited}
            budget={budget}
            rangeLabel={activeRange.label}
            onSetBudgetClick={() => setIsBudgetEditorOpen(true)}
          />
        </header>

        {/* Carry Over Last Month's Budget Prompt Card */}
        {showCarryOverPrompt && previousMonthBudget !== null && (
          <div className="mx-5 mt-4 p-4 bg-ledgerSurface border border-ledgerMint/20 rounded-xl flex flex-col space-y-3 animate-slide-up shadow-lg">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-ledgerMint/10 text-ledgerMint rounded-lg">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-ledgerText flex items-center gap-1.5">
                  Welcome to {getCurrentMonthName()}! <Sparkles className="w-3.5 h-3.5 text-ledgerMint" />
                </h4>
                <p className="text-[11px] text-ledgerMuted mt-0.5 leading-normal">
                  Carry over last month's budget of <span className="font-mono text-ledgerText font-medium">₹{previousMonthBudget.toLocaleString('en-IN')}</span>?
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={handleCarryOverBudget}
                className="flex-1 bg-ledgerMint text-[#0F1B1E] font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition hover:bg-ledgerMint/90 active:scale-[0.98]"
              >
                Copy Budget
              </button>
              <button
                onClick={() => {
                  setShowCarryOverPrompt(false);
                  setIsBudgetEditorOpen(true);
                }}
                className="flex-1 bg-ledgerElevated border border-ledgerBorder text-ledgerMuted font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition hover:text-ledgerText"
              >
                Set New
              </button>
            </div>
          </div>
        )}

        {/* Tab view screens */}
        <main className="flex-1 px-5 pt-4">
          {activeTab === 'expenses' && (
            <div className="space-y-5 pb-28 animate-fade-in">
              {/* Breakdown Toggle Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide transition-all shadow-sm ${
                    showBreakdown
                      ? 'bg-ledgerMint text-[#0F1B1E] border-ledgerMint'
                      : 'bg-ledgerSurface text-ledgerMint border-ledgerBorder/80 hover:border-ledgerMint/40'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5 animate-pulse" />
                  {showBreakdown ? 'Hide Breakdown' : 'View Breakdown'}
                </button>
              </div>

              {/* Collapsible Category Breakdown charts */}
              {showBreakdown && (
                <div className="animate-slide-up">
                  <InsightsTab
                    expenses={expenses}
                    activeBudget={activeBudget}
                    activeRange={activeRange}
                    onSaveBudget={handleSaveBudget}
                    hideBudgetConfig={true}
                    hideCharts={false}
                  />
                </div>
              )}

              {/* Core Transactions History for current period */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider pl-1">
                  Active Period Log
                </h3>
                <TransactionsTab
                  expenses={activePeriodExpenses}
                  onDeleteExpense={handleDeleteExpense}
                />
              </div>
            </div>
          )}

          {activeTab === 'savings' && (
            <SavingsTab
              savings={savings}
              onAddSavings={handleAddSavings}
              onDeleteSavings={handleDeleteSavings}
            />
          )}

          {activeTab === 'logs' && (
            <PeriodLogsTab
              expenses={expenses}
              allBudgets={allBudgets}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarTab expenses={expenses} onDeleteExpense={handleDeleteExpense} />
          )}

          {activeTab === 'settings' && (
            <ProfileSettings
              session={session}
              isOfflineMode={isOfflineMode}
              onSignOut={handleSignOut}
              showToast={(msg) => showToast(msg)}
            />
          )}
        </main>

        {/* Floating "+ Add Transaction" Button above the Dock (Only visible in expenses/logs tabs) */}
        {(activeTab === 'expenses' || activeTab === 'logs') && (
          <div className="fixed bottom-24 left-0 right-0 pointer-events-none flex justify-center z-40">
            <div className="w-full max-w-[480px] px-6 flex justify-end pointer-events-auto">
              <button
                onClick={() => setIsAddSheetOpen(true)}
                className="bg-ledgerMint hover:bg-ledgerMint/90 text-[#0F1B1E] font-semibold text-xs uppercase tracking-wider py-3 px-5 rounded-full shadow-lg flex items-center gap-1.5 transition-all transform active:scale-95 duration-150 border border-ledgerBg/20 hover:shadow-ledgerMint/15 hover:shadow-xl"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                Add Transaction
              </button>
            </div>
          </div>
        )}

        {/* Sticky Dock Navigation Bar (5 Items: Expenses, Savings, Logs, Calendar, Settings) */}
        <div className="fixed bottom-4 left-0 right-0 pointer-events-none flex justify-center z-40">
          <div className="w-full max-w-[480px] px-6 pointer-events-auto flex justify-center">
            <Dock
              items={[
                {
                  icon: <CreditCard className="w-4 h-4 text-ledgerMint" />,
                  label: 'Expenses',
                  onClick: () => setActiveTab('expenses'),
                  className: activeTab === 'expenses' ? 'border-ledgerMint bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                },
                {
                  icon: <PiggyBank className="w-4 h-4 text-ledgerMint" />,
                  label: 'Savings',
                  onClick: () => setActiveTab('savings'),
                  className: activeTab === 'savings' ? 'border-ledgerMint bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                },
                {
                  icon: <History className="w-4 h-4 text-ledgerMint" />,
                  label: 'Logs',
                  onClick: () => setActiveTab('logs'),
                  className: activeTab === 'logs' ? 'border-ledgerMint bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                },
                {
                  icon: <CalendarIcon className="w-4 h-4 text-ledgerMint" />,
                  label: 'Calendar',
                  onClick: () => setActiveTab('calendar'),
                  className: activeTab === 'calendar' ? 'border-ledgerMint bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                },
                {
                  icon: <Settings className="w-4 h-4 text-ledgerMint" />,
                  label: 'Settings',
                  onClick: () => setActiveTab('settings'),
                  className: activeTab === 'settings' ? 'border-ledgerMint bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                }
              ]}
              panelHeight={52}
              baseItemSize={38}
              magnification={50}
            />
          </div>
        </div>

        {/* Undo / Info Notification Toast */}
        {toast && (
          <div className="fixed bottom-36 left-0 right-0 pointer-events-none flex justify-center z-40 px-6">
            <div className="w-full max-w-[360px] bg-ledgerElevated border border-ledgerBorder text-ledgerText px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between pointer-events-auto animate-slide-up gap-4">
              <span className="text-xs font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-ledgerMint" />
                {toast.message}
              </span>
              {toast.actionLabel && toast.onAction && (
                <button
                  onClick={toast.onAction}
                  className="text-xs text-ledgerMint font-semibold underline underline-offset-4 hover:text-ledgerMint/85 flex items-center gap-1"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  {toast.actionLabel}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add Transaction slide-up modal */}
        {isAddSheetOpen && (
          <AddExpenseSheet
            onClose={() => setIsAddSheetOpen(false)}
            onSave={handleSaveExpense}
          />
        )}

        {/* Configure Budget Active Slide-up modal */}
        {isBudgetEditorOpen && (
          <ConfigureBudgetSheet
            activeBudget={activeBudget}
            onClose={() => setIsBudgetEditorOpen(false)}
            onSave={handleSaveBudget}
          />
        )}
      </div>
    </div>
  );
}

export default App;
