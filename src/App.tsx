import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, hasSupabaseCreds } from './lib/supabase';
import type { Expense } from './types';
import { Auth } from './components/Auth';
import { BudgetBar } from './components/BudgetBar';
import { TransactionsTab } from './components/TransactionsTab';
import { InsightsTab } from './components/InsightsTab';
import { AddExpenseSheet } from './components/AddExpenseSheet';
import {
  Plus,
  LogOut,
  TrendingUp,
  ListFilter,
  CheckCircle,
  WifiOff,
  Undo2,
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
  },
  {
    id: 'mock-2',
    user_id: 'mock-user-123',
    amount: 180.00,
    category: 'transport',
    note: 'Uber to work',
    date: getRelativeDateStr(0),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    user_id: 'mock-user-123',
    amount: 1250.00,
    category: 'groceries',
    note: 'Weekly essentials',
    date: getRelativeDateStr(1),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    user_id: 'mock-user-123',
    amount: 4500.00,
    category: 'bills',
    note: 'Electricity bill payment',
    date: getRelativeDateStr(2),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-5',
    user_id: 'mock-user-123',
    amount: 1200.00,
    category: 'entertainment',
    note: 'Movie night with friends',
    date: getRelativeDateStr(3),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-6',
    user_id: 'mock-user-123',
    amount: 3200.00,
    category: 'shopping',
    note: 'New training shoes',
    date: getRelativeDateStr(5),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-7',
    user_id: 'mock-user-123',
    amount: 650.00,
    category: 'health',
    note: 'Vitamin supplements',
    date: getRelativeDateStr(7),
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-8',
    user_id: 'mock-user-123',
    amount: 150.00,
    category: 'other',
    note: 'Notebook & pens',
    date: getRelativeDateStr(10),
    created_at: new Date().toISOString(),
  },
];

function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<number>(0);
  
  const [activeTab, setActiveTab] = useState<'transactions' | 'insights'>('transactions');
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    if (!filterDate) return expenses;
    return expenses.filter((e) => e.date === filterDate);
  }, [expenses, filterDate]);

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
        localStorage.setItem('ledger_budget', '25000');
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

    try {
      if (isOfflineMode) {
        // Offline Load
        const localEx = localStorage.getItem('ledger_expenses');
        const localBg = localStorage.getItem('ledger_budget');
        
        setExpenses(localEx ? JSON.parse(localEx) : []);
        setBudget(localBg ? parseFloat(localBg) : 0);
      } else {
        // Online Load
        const [expensesRes, budgetRes] = await Promise.all([
          supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase
            .from('budgets')
            .select('monthly')
            .single(),
        ]);

        if (expensesRes.error) throw expensesRes.error;
        setExpenses(expensesRes.data || []);

        if (budgetRes.error) {
          // If no budget setup row exists, budget defaults to 0
          if (budgetRes.status === 406 || budgetRes.error.code === 'PGRST116') {
            setBudget(0);
          } else {
            throw budgetRes.error;
          }
        } else {
          setBudget(Number(budgetRes.data?.monthly || 0));
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

  // Monospace spent total for current month
  const currentMonthTotal = useMemo(() => {
    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    return expenses
      .filter((e) => e.date.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

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

  // Add Expense Callback
  const handleSaveExpense = async (data: { amount: number; category: string; note: string; date: string }) => {
    if (!session?.user) return;

    const newExpense = {
      user_id: session.user.id,
      amount: data.amount,
      category: data.category,
      note: data.note || null,
      date: data.date,
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
        showToast('Expense logged successfully.');
      } else {
        // Online Save
        const { error } = await supabase.from('expenses').insert([newExpense]);
        if (error) throw error;
        showToast('Expense logged successfully.');
        // Realtime handles the fetch update
      }
      setFilterDate(null);
    } catch (err) {
      console.error('Error saving expense:', err);
      showToast('Could not save expense. Try again.');
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
        showToast('Expense restored.');
      } else {
        const { error } = await supabase.from('expenses').insert([{
          id: backup.id,
          user_id: backup.user_id,
          amount: backup.amount,
          category: backup.category,
          note: backup.note,
          date: backup.date,
        }]);
        if (error) throw error;
        showToast('Expense restored.');
      }
    } catch (err) {
      console.error('Failed to undo deletion:', err);
      showToast('Failed to restore expense.');
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
        showToast('Expense deleted', 'Undo', handleUndoDelete);
      } else {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        showToast('Expense deleted', 'Undo', handleUndoDelete);
      }
    } catch (err) {
      console.error('Error deleting expense:', err);
      showToast('Could not delete expense.');
      // Revert optimism on failure
      fetchData();
    }
  };

  // Save Monthly Budget Limit
  const handleSaveBudget = async (limitNum: number) => {
    if (!session?.user) return;

    try {
      if (isOfflineMode) {
        setBudget(limitNum);
        localStorage.setItem('ledger_budget', limitNum.toString());
      } else {
        // Postgres Upsert
        const { error } = await supabase.from('budgets').upsert({
          user_id: session.user.id,
          monthly: limitNum,
          category_limits: {},
        });
        if (error) throw error;
        setBudget(limitNum);
      }
    } catch (err) {
      console.error('Error saving budget:', err);
      throw err;
    }
  };

  // Sign out control handler
  const handleSignOut = async () => {
    if (isOfflineMode) {
      // In offline mode, clearing simulation reset
      setSession(null);
    } else {
      await supabase.auth.signOut();
    }
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

        {/* Sticky Header with month sums and budgets */}
        <header className="sticky top-0 bg-ledgerBg/90 backdrop-blur-md border-b border-ledgerBorder/60 p-5 z-30">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted">
                This Month
              </span>
              <h1 className="text-3xl font-mono tracking-tight font-bold text-ledgerText tabular-nums mt-0.5">
                ₹{currentMonthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
            </div>
            
            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="text-ledgerMuted hover:text-ledgerCoral opacity-40 hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-ledgerCoral/5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Budget Progress Bar */}
          <BudgetBar
            spent={currentMonthTotal}
            budget={budget}
            onSetBudgetClick={() => setActiveTab('insights')}
          />
        </header>

        {/* Segmented Tab Controls */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex bg-ledgerSurface border border-ledgerBorder rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-[6px] transition-all duration-200 ${
                activeTab === 'transactions'
                  ? 'bg-ledgerElevated text-ledgerMint shadow'
                  : 'text-ledgerMuted hover:text-ledgerText'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-[6px] transition-all duration-200 ${
                activeTab === 'insights'
                  ? 'bg-ledgerElevated text-ledgerMint shadow'
                  : 'text-ledgerMuted hover:text-ledgerText'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Insights
            </button>
          </div>
        </div>

        {/* Tab view screens */}
        <main className="flex-1 px-5 pt-3">
          {activeTab === 'transactions' ? (
            <TransactionsTab
              expenses={filteredExpenses}
              onDeleteExpense={handleDeleteExpense}
              filterDate={filterDate}
              onFilterDateChange={setFilterDate}
              hasAnyExpenses={expenses.length > 0}
            />
          ) : (
            <InsightsTab
              expenses={expenses}
              currentBudget={budget}
              onSaveBudget={handleSaveBudget}
            />
          )}
        </main>

        {/* Floating "+ Add expense" Button (fixed bottom container to align with max-width) */}
        <div className="fixed bottom-6 left-0 right-0 pointer-events-none flex justify-center z-40">
          <div className="w-full max-w-[480px] px-6 flex justify-end pointer-events-auto">
            <button
              onClick={() => setIsAddSheetOpen(true)}
              className="bg-ledgerMint hover:bg-ledgerMint/90 text-[#0F1B1E] font-semibold text-xs uppercase tracking-wider py-3 px-5 rounded-full shadow-lg flex items-center gap-1.5 transition-all transform active:scale-95 duration-150 border border-ledgerBg/20 hover:shadow-ledgerMint/15 hover:shadow-xl"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Undo / Info Notification Toast */}
        {toast && (
          <div className="fixed bottom-20 left-0 right-0 pointer-events-none flex justify-center z-40 px-6">
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
