import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, hasSupabaseCreds } from './lib/supabase';
import type { Expense, Budget } from './types';
import { Auth } from './components/Auth';
import { BudgetBar } from './components/BudgetBar';
import { TransactionsTab } from './components/TransactionsTab';
import { InsightsTab } from './components/InsightsTab';
import { AddExpenseSheet } from './components/AddExpenseSheet';
import Dock from './components/Dock';
import {
  Plus,
  LogOut,
  CheckCircle,
  WifiOff,
  Undo2,
  CalendarDays,
  Sparkles,
  CreditCard,
  PiggyBank,
  History,
  Settings,
  Trash2,
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
  {
    id: 'mock-8',
    user_id: 'mock-user-123',
    amount: 150.00,
    category: 'other',
    note: 'Notebook & pens',
    date: getRelativeDateStr(10),
    created_at: new Date().toISOString(),
    type: 'debit',
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
  
  // New Month Carry Over Banner states
  const [showCarryOverPrompt, setShowCarryOverPrompt] = useState(false);
  const [previousMonthBudget, setPreviousMonthBudget] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState<'expenses' | 'savings' | 'logs' | 'settings'>('expenses');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
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
      // Mock session setup for offline use
      setSession({ user: { id: 'mock-user-123', email: 'ledger.offline@local' } });
      setAuthChecked(true);

      // Seed mock details if first load
      const seeded = localStorage.getItem('ledger_seeded');
      if (!seeded) {
        localStorage.setItem('ledger_expenses', JSON.stringify(MOCK_EXPENSES_SEED()));
        
        // Seed default budget history in new layout format
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
        localStorage.setItem('ledger_seeded', 'true');
      }
      setLoading(false);
    } else {
      // Supabase Authentication Setup
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

  // Fetch Data (Expenses & Budgets)
  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);

    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const previousMonthStr = getPreviousMonthStr(currentMonthStr);

    try {
      if (isOfflineMode) {
        // Offline Load
        const localEx = localStorage.getItem('ledger_expenses');
        const localBgHistory = localStorage.getItem('ledger_budgets_history');
        
        const parsedExpenses: Expense[] = localEx ? JSON.parse(localEx) : [];
        setExpenses(parsedExpenses);

        const budgetsList: Budget[] = localBgHistory ? JSON.parse(localBgHistory) : [];
        setAllBudgets(budgetsList);

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
        // Online Load
        const [expensesRes, budgetsRes] = await Promise.all([
          supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase
            .from('budgets')
            .select('*')
            .eq('user_id', session.user.id),
        ]);

        if (expensesRes.error) throw expensesRes.error;
        setExpenses(expensesRes.data || []);

        if (budgetsRes.error) throw budgetsRes.error;
        const budgetsList: Budget[] = budgetsRes.data || [];
        setAllBudgets(budgetsList);

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

  const savingsTransactions = useMemo(() => {
    return expenses.filter((e) => e.type === 'credit');
  }, [expenses]);

  const totalIncome = useMemo(() => {
    return savingsTransactions
      .filter((e) => e.date >= activeRange.startDate && e.date <= activeRange.endDate)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [savingsTransactions, activeRange]);

  const netSavings = useMemo(() => {
    return totalIncome - currentRangeTotals.spent;
  }, [totalIncome, currentRangeTotals.spent]);

  const savingsRate = useMemo(() => {
    if (totalIncome <= 0) return 0;
    const rate = (netSavings / totalIncome) * 100;
    return Math.max(0, Math.round(rate));
  }, [netSavings, totalIncome]);

  // Toast System trigger helper
  const showToast = (message: string, actionLabel?: string, onAction?: () => void) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, actionLabel, onAction });
    
    // Auto dismiss after 5 seconds
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 5000);
  };

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
        // Offline Save
        const currentExpenses = [...expenses];
        const savedExpense = {
          ...newExpense,
          id: `local-${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        const updated = [savedExpense, ...currentExpenses].sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(updated);
        localStorage.setItem('ledger_expenses', JSON.stringify(updated));
        showToast(data.type === 'credit' ? 'Income credit logged.' : 'Expense logged successfully.');
      } else {
        // Online Save
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
            
            {/* Sign Out Button */}
            {activeTab !== 'settings' && (
              <button
                onClick={handleSignOut}
                className="text-ledgerMuted hover:text-ledgerCoral opacity-40 hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-ledgerCoral/5"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Budget Progress Bar */}
          <BudgetBar
            spent={currentRangeTotals.spent}
            credited={currentRangeTotals.credited}
            budget={budget}
            rangeLabel={activeRange.label}
            onSetBudgetClick={() => setActiveTab('settings')}
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
                  setActiveTab('settings');
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
            <InsightsTab
              expenses={expenses}
              activeBudget={activeBudget}
              activeRange={activeRange}
              onSaveBudget={handleSaveBudget}
              hideBudgetConfig={true}
              hideCharts={false}
            />
          )}

          {activeTab === 'savings' && (
            <div className="space-y-6 pb-28 animate-fade-in">
              {/* Savings Metrics Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-4 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
                    Total Income
                  </span>
                  <div className="mt-2">
                    <span className="text-xl font-mono font-bold text-ledgerMint tabular-nums">
                      ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[9px] text-ledgerMuted mt-1">This active period</p>
                  </div>
                </div>

                <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-4 flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
                    Savings Rate
                  </span>
                  <div className="mt-2">
                    <span className={`text-xl font-mono font-bold tabular-nums ${savingsRate >= 20 ? 'text-ledgerMint' : savingsRate > 0 ? 'text-amber-400' : 'text-ledgerMuted'}`}>
                      {savingsRate}%
                    </span>
                    <p className="text-[9px] text-ledgerMuted mt-1">Net saved / Earned</p>
                  </div>
                </div>

                <div className="col-span-2 bg-ledgerSurface border border-ledgerBorder rounded-xl p-4 flex justify-between items-center shadow-md">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
                      Net Period Savings
                    </span>
                    <p className={`text-2xl font-mono font-bold tabular-nums mt-1 ${netSavings >= 0 ? 'text-ledgerMint' : 'text-ledgerCoral'}`}>
                      ₹{netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${netSavings >= 0 ? 'bg-ledgerMint/5 text-ledgerMint border border-ledgerMint/10' : 'bg-ledgerCoral/5 text-ledgerCoral border border-ledgerCoral/10'}`}>
                    <PiggyBank className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Income Credits History */}
              <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
                <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
                  Income Credits Log
                </h3>

                {savingsTransactions.length === 0 ? (
                  <p className="text-xs text-ledgerMuted text-center py-6">
                    No income transactions logged yet. Use "+ Add Transaction" to log income.
                  </p>
                ) : (
                  <div className="divide-y divide-ledgerBorder/40 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                    {savingsTransactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 group">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-medium text-ledgerText truncate">
                            {tx.note || 'Income Credit'}
                          </p>
                          <span className="text-[9px] text-ledgerMuted font-mono">
                            {formatDateShort(tx.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-mono text-xs text-ledgerMint font-semibold tabular-nums">
                            +₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => handleDeleteExpense(tx.id)}
                            className="text-ledgerMuted hover:text-ledgerCoral p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="pb-28">
              <TransactionsTab
                expenses={expenses}
                onDeleteExpense={handleDeleteExpense}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 pb-28 animate-fade-in">
              <InsightsTab
                expenses={expenses}
                activeBudget={activeBudget}
                activeRange={activeRange}
                onSaveBudget={handleSaveBudget}
                hideBudgetConfig={false}
                hideCharts={true}
              />
              
              {/* Additional Account/Settings options */}
              <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
                <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
                  Session & Account
                </h3>
                <div className="flex justify-between items-center text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-ledgerText truncate">
                      {session?.user?.email || 'Offline Sandbox User'}
                    </p>
                    <span className="text-[10px] text-ledgerMuted">
                      Role: Subscriber
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="bg-ledgerCoral/10 hover:bg-ledgerCoral/20 border border-ledgerCoral/20 text-ledgerCoral font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Floating "+ Add Transaction" Button above the Dock */}
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

        {/* Sticky Dock Navigation Bar */}
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
                  icon: <Settings className="w-4 h-4 text-ledgerMint" />,
                  label: 'Settings',
                  onClick: () => setActiveTab('settings'),
                  className: activeTab === 'settings' ? 'border-ledgerMint bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                }
              ]}
              panelHeight={60}
              baseItemSize={46}
              magnification={58}
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

        {/* Add Expense bottom sheet modal */}
        {isAddSheetOpen && (
          <AddExpenseSheet
            onClose={() => setIsAddSheetOpen(false)}
            onSave={handleSaveExpense}
          />
        )}
      </div>
    </div>
  );
}

export default App;
