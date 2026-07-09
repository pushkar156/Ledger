import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase, hasSupabaseCreds } from './lib/supabase';
import type { Expense, Budget, SavingsTransaction, RecurringTransaction } from './types';
import { Auth } from './components/Auth';
import { BudgetBar } from './components/BudgetBar';
import { TransactionsTab } from './components/TransactionsTab';
import { InsightsTab } from './components/InsightsTab';
import { AddExpenseSheet } from './components/AddExpenseSheet';
import { ConfigureBudgetSheet } from './components/ConfigureBudgetSheet';
import { SavingsTab } from './components/SavingsTab';
import { PeriodLogsTab } from './components/PeriodLogsTab';
import { ProfileSettings } from './components/ProfileSettings';
import { RecurringTab } from './components/RecurringTab';
import Dock from './components/Dock';
import { AnimatedNumber } from './components/ui/AnimatedNumber';
import { ThemeToggle } from './components/ui/ThemeToggle';
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
  SlidersHorizontal,
  PieChart,
  Repeat,
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
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  
  // New Month Carry Over Banner states
  const [showCarryOverPrompt, setShowCarryOverPrompt] = useState(false);
  const [previousMonthBudget, setPreviousMonthBudget] = useState<number | null>(null);
  
  // PWA install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(() => {
    // Check if running inside standalone app wrapper mode
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  });

  // PWA update states
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // Listener to capture PWA installation prompt and update available events
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only display the banner to new users/first logs if not already installed
      if (!isAppInstalled) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    const handleSWUpdate = (e: Event) => {
      const sw = (e as CustomEvent).detail;
      setWaitingWorker(sw);
      setShowUpdatePrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('swUpdateAvailable', handleSWUpdate);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('swUpdateAvailable', handleSWUpdate);
    };
  }, [isAppInstalled]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleUpdateApp = () => {
    // Purge browser caches to guarantee the app loads the new filenames on update click
    if ('caches' in window) {
      caches.keys().then(function(names) {
        return Promise.all(names.map(function(name) { return caches.delete(name); }));
      }).then(function() {
        if (waitingWorker) {
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        } else {
          // If update came from a non-sw chunk error, just hard reload
          (window as any).location.reload();
        }
      }).catch(function() {
        (window as any).location.reload();
      });
    } else {
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      } else {
        (window as any).location.reload();
      }
    }
    setShowUpdatePrompt(false);
  };
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'expenses' | 'savings' | 'logs' | 'calendar' | 'recurring' | 'settings'>(() => {
    const savedTab = localStorage.getItem('ledger_active_tab');
    return (savedTab as any) || 'expenses';
  });

  useEffect(() => {
    localStorage.setItem('ledger_active_tab', activeTab);
  }, [activeTab]);

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
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
      // With Supabase credentials present: check for active user session or default to local guest mode
      supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
        if (activeSession) {
          setSession(activeSession);
          // If we have local unsynced expenses, trigger migration to Supabase on startup
          const localUnsynced = localStorage.getItem('ledger_expenses_local_guest');
          if (localUnsynced) {
            migrateLocalGuestData(activeSession.user.id, JSON.parse(localUnsynced));
          }
        } else {
          // No active account session -> Start in local sandbox guest mode (default homepage)
          setSession(null);
        }
        setAuthChecked(true);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
        setSession(activeSession);
        if (activeSession) {
          // Migrate local guest data upon login
          const localUnsynced = localStorage.getItem('ledger_expenses_local_guest');
          if (localUnsynced) {
            migrateLocalGuestData(activeSession.user.id, JSON.parse(localUnsynced));
          }
          fetchData();
        } else {
          // Clear active user states but preserve guest caches
          setExpenses([]);
          setAllBudgets([]);
          setSavings([]);
          setRecurring([]);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOfflineMode]);

  // Migrate local guest caches to Supabase cloud storage on login
  const migrateLocalGuestData = async (userId: string, guestExpenses: Expense[]) => {
    if (guestExpenses.length === 0) return;
    try {
      console.log('Migrating local guest expenses to Supabase for user:', userId);
      const rowsToInsert = guestExpenses.map(e => ({
        user_id: userId,
        amount: Number(e.amount),
        category: e.category,
        note: e.note,
        date: e.date,
        type: e.type || 'debit'
      }));

      const { error } = await supabase.from('expenses').insert(rowsToInsert);
      if (error) throw error;
      
      // Clear guest storage on success
      localStorage.removeItem('ledger_expenses_local_guest');
      showToast(`Successfully synced ${guestExpenses.length} local expenses to your cloud profile!`);
    } catch (err) {
      console.error('Failed migrating local guest data:', err);
    }
  };

  // Clean up duplicate or overlapping budget configurations that have 0 transactions
  const cleanupDuplicateBudgets = useCallback(async (budgetsList: Budget[], expensesList: Expense[]) => {
    const budgetsToDelete: string[] = [];
    const keepBudgets: Budget[] = [];

    const getDates = (b: Budget) => {
      let start = '';
      let end = '';
      if (b.type === 'custom') {
        start = b.start_date || '';
        end = b.end_date || '';
      } else {
        const monthStr = b.month || new Date().toISOString().substring(0, 7);
        const range = getMonthRange(monthStr);
        start = range.startDate;
        end = range.endDate;
      }
      return { start, end };
    };

    // Sort budgets by created_at descending (latest first)
    const sorted = [...budgetsList].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    for (const b of sorted) {
      const { start: bStart, end: bEnd } = getDates(b);
      if (!bStart || !bEnd) continue;

      // Check if this budget overlaps with any budget we have already decided to keep
      const overlappingKeep = keepBudgets.find((k) => {
        const { start: kStart, end: kEnd } = getDates(k);
        return (bStart <= kEnd) && (bEnd >= kStart);
      });

      if (overlappingKeep) {
        // Overlap detected!
        // Count transactions inside both ranges
        const bTxCount = expensesList.filter((e) => e.date >= bStart && e.date <= bEnd).length;
        const { start: kStart, end: kEnd } = getDates(overlappingKeep);
        const kTxCount = expensesList.filter((e) => e.date >= kStart && e.date <= kEnd).length;

        if (bTxCount > 0 && kTxCount === 0) {
          // b has transactions but k has none! Swap them: keep b, delete k
          if (overlappingKeep.id) {
            budgetsToDelete.push(overlappingKeep.id);
          }
          const idx = keepBudgets.indexOf(overlappingKeep);
          if (idx > -1) keepBudgets.splice(idx, 1);
          keepBudgets.push(b);
        } else {
          // k has transactions or both have none. Delete b (older)
          if (b.id) {
            budgetsToDelete.push(b.id);
          }
        }
      } else {
        keepBudgets.push(b);
      }
    }

    if (budgetsToDelete.length > 0) {
      console.log('Purging duplicate/overlapping empty budgets:', budgetsToDelete);
      try {
        if (isOfflineMode) {
          const current = budgetsList.filter((b) => !b.id || !budgetsToDelete.includes(b.id));
          localStorage.setItem('ledger_budgets_history', JSON.stringify(current));
          setAllBudgets(current);
        } else {
          await supabase.from('budgets').delete().in('id', budgetsToDelete);
          const current = budgetsList.filter((b) => !b.id || !budgetsToDelete.includes(b.id));
          setAllBudgets(current);
        }
      } catch (err) {
        console.error('Failed to purge duplicate budgets:', err);
      }
    }
  }, [isOfflineMode]);

  // Fetch Data (Expenses, Budgets, Savings, and Recurring)
  const fetchData = useCallback(async () => {
    // If no active session, parse from local storage guest key cache
    if (!session?.user) {
      setLoading(true);
      const localGuestEx = localStorage.getItem('ledger_expenses_local_guest');
      const localGuestBg = localStorage.getItem('ledger_budgets_history_local_guest');
      
      const parsedExpenses: Expense[] = localGuestEx ? JSON.parse(localGuestEx) : [];
      setExpenses(parsedExpenses);
      
      const parsedBudgets: Budget[] = localGuestBg ? JSON.parse(localGuestBg) : [];
      setAllBudgets(parsedBudgets);
      
      setSavings([]);
      setRecurring([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const previousMonthStr = getPreviousMonthStr(currentMonthStr);

    try {
      if (isOfflineMode) {
        const localEx = localStorage.getItem('ledger_expenses');
        const localBgHistory = localStorage.getItem('ledger_budgets_history');
        const localSav = localStorage.getItem('ledger_savings');
        const localRec = localStorage.getItem('ledger_recurring');
        
        const parsedExpenses: Expense[] = localEx ? JSON.parse(localEx) : [];
        setExpenses(parsedExpenses);

        const budgetsList: Budget[] = localBgHistory ? JSON.parse(localBgHistory) : [];
        setAllBudgets(budgetsList);

        const parsedSavings: SavingsTransaction[] = localSav ? JSON.parse(localSav) : [];
        setSavings(parsedSavings);

        const parsedRecurring: RecurringTransaction[] = localRec ? JSON.parse(localRec) : [];
        setRecurring(parsedRecurring);

        // Run cleanup
        cleanupDuplicateBudgets(budgetsList, parsedExpenses);

        // Run Recurring Transaction Checks
        await checkAndTriggerRecurring(parsedExpenses, parsedRecurring);

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
        const parsedExpenses = expensesRes.data || [];
        setExpenses(parsedExpenses);

        if (budgetsRes.error) throw budgetsRes.error;
        const budgetsList: Budget[] = budgetsRes.data || [];
        setAllBudgets(budgetsList);

        if (savingsRes.error) throw savingsRes.error;
        setSavings(savingsRes.data || []);

        // Load recurring transactions from Supabase with fallback to local storage
        let parsedRecurring: RecurringTransaction[] = [];
        try {
          const { data: recData, error: recError } = await supabase.from('recurring_expenses').select('*');
          if (recError) throw recError;
          
          const localRec = localStorage.getItem('ledger_recurring');
          const localParsed: RecurringTransaction[] = localRec ? JSON.parse(localRec) : [];
          
          // Merge local recurring bills with cloud to prevent accidental disappearances
          const cloudMap = new Map((recData || []).map(r => [r.id || `${r.dayOfMonth}-${r.amount}-${r.category}`, r]));
          const merged = [...(recData || [])];
          
          for (const item of localParsed) {
            const key = item.id || `${item.dayOfMonth}-${item.amount}-${item.category}`;
            if (!cloudMap.has(key)) {
              merged.push(item);
            }
          }
          
          parsedRecurring = merged;
          setRecurring(parsedRecurring);
          localStorage.setItem('ledger_recurring', JSON.stringify(parsedRecurring));
        } catch (err) {
          console.warn('Supabase recurring_expenses table fetch failed, falling back to local storage:', err);
          const localRec = localStorage.getItem('ledger_recurring');
          parsedRecurring = localRec ? JSON.parse(localRec) : [];
          setRecurring(parsedRecurring);
        }

        // Run cleanup
        cleanupDuplicateBudgets(budgetsList, parsedExpenses);

        // Run Recurring Transaction Checks
        await checkAndTriggerRecurring(parsedExpenses, parsedRecurring);

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
  }, [session, isOfflineMode, cleanupDuplicateBudgets]);

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

  // Add or Edit Expense/Credit Callback
  const handleSaveExpense = async (data: { amount: number; category: string; note: string; date: string; type: 'debit' | 'credit' }) => {
    const expenseData = {
      user_id: session?.user?.id || 'guest-user',
      amount: data.amount,
      category: data.category,
      note: data.note || null,
      date: data.date,
      type: data.type,
    };

    try {
      if (editingExpense) {
        // Edit transaction workflow
        if (isOfflineMode || !session?.user) {
          const updatedExpenses = expenses.map((e) =>
            e.id === editingExpense.id
              ? ({ ...e, ...expenseData } as Expense)
              : e
          ).sort((a, b) => b.date.localeCompare(a.date));
          setExpenses(updatedExpenses);
          localStorage.setItem(
            session?.user ? 'ledger_expenses' : 'ledger_expenses_local_guest',
            JSON.stringify(updatedExpenses)
          );
          showToast('Transaction updated.');
        } else {
          const { error } = await supabase
            .from('expenses')
            .update(expenseData)
            .eq('id', editingExpense.id);
          if (error) throw error;
          showToast('Transaction updated.');
          fetchData();
        }
      } else {
        // New transaction creation workflow
        if (isOfflineMode || !session?.user) {
          const currentExpenses = [...expenses];
          const savedExpense = {
            ...expenseData,
            id: `local-${Date.now()}`,
            created_at: new Date().toISOString(),
          } as Expense;
          const updated = [savedExpense, ...currentExpenses].sort((a, b) => b.date.localeCompare(a.date));
          setExpenses(updated);
          localStorage.setItem(
            session?.user ? 'ledger_expenses' : 'ledger_expenses_local_guest',
            JSON.stringify(updated)
          );
          showToast(data.type === 'credit' ? 'Income credit logged.' : 'Expense logged successfully.');
        } else {
          const { error } = await supabase.from('expenses').insert([expenseData]);
          if (error) throw error;
          showToast(data.type === 'credit' ? 'Income credit logged.' : 'Expense logged successfully.');
        }
      }
    } catch (err) {
      console.error('Error saving transaction:', err);
      showToast('Could not save transaction. Try again.');
    } finally {
      setEditingExpense(null);
    }
  };

  // Undo delete callback handler
  const handleUndoDelete = async () => {
    const backup = lastDeletedExpenseRef.current;
    if (!backup) return;

    try {
      if (isOfflineMode || !session?.user) {
        const current = expenses.filter((e) => e.id !== backup.id);
        const updated = [backup, ...current].sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(updated);
        localStorage.setItem(
          session?.user ? 'ledger_expenses' : 'ledger_expenses_local_guest',
          JSON.stringify(updated)
        );
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
      if (isOfflineMode || !session?.user) {
        localStorage.setItem(
          session?.user ? 'ledger_expenses' : 'ledger_expenses_local_guest',
          JSON.stringify(filtered)
        );
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

  // Delete Budget Configuration Callback
  const handleDeleteBudget = async (id: string) => {
    const remaining = allBudgets.filter((b) => b.id !== id);
    setAllBudgets(remaining);

    try {
      if (isOfflineMode || !session?.user) {
        localStorage.setItem(
          session?.user ? 'ledger_budgets_history' : 'ledger_budgets_history_local_guest',
          JSON.stringify(remaining)
        );
        showToast('Budget period deleted.');
      } else {
        const { error } = await supabase.from('budgets').delete().eq('id', id);
        if (error) throw error;
        showToast('Budget period deleted.');
      }
    } catch (err) {
      console.error('Error deleting budget period:', err);
      showToast('Could not delete budget period.');
      fetchData();
    }
  };
  // Heuristics Auto-Bill Recurring Scheduler Trigger Callback
  const checkAndTriggerRecurring = useCallback(async (currentExpenses: Expense[], currentRecurring: RecurringTransaction[]) => {
    if (!session?.user || currentRecurring.length === 0) return;

    const todayStr = getLocalDateString();
    const lastCheckStr = localStorage.getItem('ledger_last_recurring_check');

    if (lastCheckStr === todayStr) return;

    let startDate = new Date();
    if (lastCheckStr) {
      const [ly, lm, ld] = lastCheckStr.split('-').map(Number);
      startDate = new Date(ly, lm - 1, ld + 1);
    } else {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    const todayDate = new Date();
    const datesToCheck: string[] = [];

    let tempDate = new Date(startDate);
    while (tempDate <= todayDate) {
      const year = tempDate.getFullYear();
      const month = String(tempDate.getMonth() + 1).padStart(2, '0');
      const day = String(tempDate.getDate()).padStart(2, '0');
      datesToCheck.push(`${year}-${month}-${day}`);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    if (datesToCheck.length === 0) return;

    const newTransactions: any[] = [];

    for (const dateVal of datesToCheck) {
      const dayVal = Number(dateVal.substring(8, 10));

      const matchingRules = currentRecurring.filter((r) => r.dayOfMonth === dayVal);

      for (const rule of matchingRules) {
        const alreadyLogged = currentExpenses.some(
          (e) => e.date === dateVal && 
                 e.category === rule.category && 
                 Number(e.amount) === Number(rule.amount) && 
                 e.note === rule.note
        );

        if (!alreadyLogged) {
          newTransactions.push({
            user_id: session.user.id,
            amount: rule.amount,
            category: rule.category,
            note: rule.note,
            date: dateVal,
            type: rule.type,
          });
        }
      }
    }

    if (newTransactions.length > 0) {
      try {
        if (isOfflineMode) {
          const localSavedTransactions = newTransactions.map((tx, idx) => ({
            ...tx,
            id: `local-rec-trigger-${Date.now()}-${idx}`,
            created_at: new Date().toISOString(),
          })) as Expense[];

          const updated = [...localSavedTransactions, ...currentExpenses].sort((a, b) => b.date.localeCompare(a.date));
          setExpenses(updated);
          localStorage.setItem('ledger_expenses', JSON.stringify(updated));
          showToast(`Auto-logged ${newTransactions.length} recurring transaction(s).`);
        } else {
          const { error } = await supabase.from('expenses').insert(newTransactions);
          if (error) throw error;
          
          const { data: updatedExpenses } = await supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
          if (updatedExpenses) {
            setExpenses(updatedExpenses);
          }
          showToast(`Auto-logged ${newTransactions.length} recurring transaction(s).`);
        }
      } catch (err) {
        console.error('Failed to auto-log recurring transactions:', err);
      }
    }

    localStorage.setItem('ledger_last_recurring_check', todayStr);
  }, [session, isOfflineMode, showToast]);

  // Add Recurring Template Callback
  const handleAddRecurring = async (data: {
    amount: number;
    category: string;
    note: string;
    type: 'debit' | 'credit';
    dayOfMonth: number;
  }) => {
    if (!session?.user) return;

    const newRule: Partial<RecurringTransaction> = {
      user_id: session.user.id,
      amount: data.amount,
      category: data.category,
      note: data.note,
      type: data.type,
      dayOfMonth: data.dayOfMonth,
    };

    try {
      if (isOfflineMode) {
        const updated = [...recurring, {
          ...newRule,
          id: `local-rec-rule-${Date.now()}`,
          created_at: new Date().toISOString(),
        } as RecurringTransaction];
        setRecurring(updated);
        localStorage.setItem('ledger_recurring', JSON.stringify(updated));
        showToast('Recurring auto-bill configured.');
      } else {
        const { error } = await supabase.from('recurring_expenses').insert([newRule]);
        if (error) {
          console.warn('Failed to insert rule into Supabase, saving locally:', error);
          const updated = [...recurring, {
            ...newRule,
            id: `local-rec-rule-${Date.now()}`,
            created_at: new Date().toISOString(),
          } as RecurringTransaction];
          setRecurring(updated);
          localStorage.setItem('ledger_recurring', JSON.stringify(updated));
        } else {
          const { data: recData } = await supabase.from('recurring_expenses').select('*');
          if (recData) setRecurring(recData);
        }
        showToast('Recurring auto-bill configured.');
      }
    } catch (err) {
      console.error('Failed to configure recurring rule:', err);
      showToast('Could not save configuration. Try again.');
    }
  };

  // Delete Recurring Template Callback
  const handleDeleteRecurring = async (id: string) => {
    const updated = recurring.filter((r) => r.id !== id);
    setRecurring(updated);

    try {
      if (isOfflineMode) {
        localStorage.setItem('ledger_recurring', JSON.stringify(updated));
        showToast('Auto-bill configuration removed.');
      } else {
        const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
        if (error) {
          console.warn('Failed to delete from Supabase, fallback locally:', error);
          localStorage.setItem('ledger_recurring', JSON.stringify(updated));
        }
        showToast('Auto-bill configuration removed.');
      }
    } catch (err) {
      console.error('Failed to delete recurring rule:', err);
      showToast('Could not delete configuration.');
    }
  };

  // Save Budget Configuration (Supporting monthly & custom types)
  // Save Budget Configuration (Supporting monthly & custom types)
  const handleSaveBudget = async (data: {
    type: 'monthly' | 'custom';
    monthly: number;
    start_date?: string;
    end_date?: string;
  }) => {
    if (!session?.user) return;
    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"

    // Helper to get dates of a budget
    const getDates = (b: Budget) => {
      let start = '';
      let end = '';
      if (b.type === 'custom') {
        start = b.start_date || '';
        end = b.end_date || '';
      } else {
        const monthStr = b.month || new Date().toISOString().substring(0, 7);
        const range = getMonthRange(monthStr);
        start = range.startDate;
        end = range.endDate;
      }
      return { start, end };
    };

    // Calculate dates of the budget being saved
    let newStart = '';
    let newEnd = '';
    if (data.type === 'custom') {
      newStart = data.start_date!;
      newEnd = data.end_date!;
    } else {
      const monthRange = getMonthRange(currentMonthStr);
      newStart = monthRange.startDate;
      newEnd = monthRange.endDate;
    }

    // Find any existing budgets that overlap with the new range
    const overlapping = allBudgets.filter((b) => {
      // Don't check against the budget we are currently editing
      if (activeBudget && b.id === activeBudget.id) return false;
      
      const { start, end } = getDates(b);
      return (newStart <= end) && (newEnd >= start);
    });

    const budgetsToDelete: string[] = [];
    let hasProtectedOverlap = false;

    for (const b of overlapping) {
      const { start, end } = getDates(b);
      const txCount = expenses.filter((e) => e.date >= start && e.date <= end).length;
      if (txCount > 0) {
        // Has transactions! We can't delete it.
        hasProtectedOverlap = true;
      } else {
        // No transactions! We can delete it.
        if (b.id) budgetsToDelete.push(b.id);
      }
    }

    if (hasProtectedOverlap) {
      const errMsg = 'Overlaps with an active period containing transactions.';
      showToast(errMsg);
      throw new Error(errMsg);
    }

    // If there are empty overlapping budgets, delete them first
    if (budgetsToDelete.length > 0) {
      try {
        if (isOfflineMode || !session?.user) {
          const storageKey = session?.user ? 'ledger_budgets_history' : 'ledger_budgets_history_local_guest';
          const remaining = allBudgets.filter((b) => !b.id || !budgetsToDelete.includes(b.id));
          localStorage.setItem(storageKey, JSON.stringify(remaining));
          setAllBudgets(remaining);
        } else {
          await supabase.from('budgets').delete().in('id', budgetsToDelete);
        }
      } catch (err) {
        console.error('Failed to pre-delete empty overlapping budgets:', err);
      }
    }

    const newBudget: Partial<Budget> = {
      user_id: session?.user?.id || 'guest-user',
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
      if (isOfflineMode || !session?.user) {
        const storageKey = session?.user ? 'ledger_budgets_history' : 'ledger_budgets_history_local_guest';
        const localBgHistory = localStorage.getItem(storageKey);
        let budgetsList: Budget[] = localBgHistory ? JSON.parse(localBgHistory) : [];
        
        // Remove currently active budget if we are replacing it
        if (activeBudget && activeBudget.id) {
          budgetsList = budgetsList.filter((b) => b.id !== activeBudget.id);
        } else if (data.type === 'monthly') {
          budgetsList = budgetsList.filter(
            (b) => !(b.type === 'monthly' && b.month === currentMonthStr)
          );
        }

        // Also remove any pre-deleted budgets from local list
        if (budgetsToDelete.length > 0) {
          budgetsList = budgetsList.filter((b) => !b.id || !budgetsToDelete.includes(b.id));
        }

        const newLocalBudget: Budget = {
          ...newBudget,
          id: `local-budget-${Date.now()}`,
          created_at: new Date().toISOString(),
        } as Budget;

        budgetsList.push(newLocalBudget);
        localStorage.setItem(storageKey, JSON.stringify(budgetsList));
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
        <div className="flex flex-col items-center gap-4 text-ledgerMuted">
          <img 
            src="/favicon.png" 
            alt="Ledger Logo" 
            className="w-16 h-16 rounded-2xl shadow-xl border border-ledgerBorder/45 animate-pulse"
          />
          <span className="text-[10px] uppercase tracking-widest font-bold">Opening Ledger...</span>
        </div>
      </div>
    );
  }

  // If no auth/session, allow browsing homepage in local guest mode.
  // Auth screen is displayed dynamically when trying to access restricted tabs or via settings.
  const handleSignIn = () => {
    setActiveTab('settings');
    setAuthChecked(true);
  };

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

        {/* PWA Update Banner Prompt */}
        {showUpdatePrompt && (
          <div className="bg-ledgerMint/10 border-b border-ledgerMint/25 text-ledgerMint px-4 py-2.5 text-xs font-semibold flex items-center gap-3 justify-between select-none animate-slide-down">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ledgerMint animate-pulse" />
              <span>A new update is available for Ledger!</span>
            </div>
            <button
              onClick={handleUpdateApp}
              className="bg-ledgerMint text-[#0F1B1E] px-3 py-1 rounded text-[10px] uppercase font-bold tracking-wider hover:bg-ledgerMint/90 active:scale-95 transition"
            >
              Update Now
            </button>
          </div>
        )}

        {/* Sticky Header with sums and budgets */}
        <header className="sticky top-0 bg-ledgerBg/90 backdrop-blur-md border-b border-ledgerBorder/60 p-5 z-30">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ledgerMuted select-none">
                {activeRange.isCustom ? 'Active Period Balance' : 'Monthly Balance'}
              </span>
              <h1 className={`text-3xl font-mono tracking-tight font-bold tabular-nums mt-0.5 ${isBalanceNegative ? 'text-ledgerCoral' : 'text-ledgerGreen'}`}>
                ₹<AnimatedNumber value={currentBalance} precision={2} />
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
            activeRange={activeRange}
            onSetBudgetClick={() => setIsBudgetEditorOpen(true)}
          />
        </header>

        {/* PWA Install Notification Banner */}
        {showInstallBanner && !isAppInstalled && deferredPrompt && (
          <div className="mx-5 mt-4 p-4 bg-ledgerSurface border border-ledgerMint/20 rounded-xl flex flex-col space-y-3 animate-slide-up shadow-lg">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-ledgerMint/10 text-ledgerMint rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-ledgerText flex items-center gap-1.5">
                  Install Ledger App
                </h4>
                <p className="text-[11px] text-ledgerMuted mt-0.5 leading-normal">
                  Install this tracker on your home screen for quick offline access and immersive full-screen tracking.
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={handleInstallApp}
                className="flex-1 bg-ledgerMint text-[#0F1B1E] font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition hover:bg-ledgerMint/90 active:scale-[0.98]"
              >
                Install Now
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="flex-1 bg-ledgerElevated border border-ledgerBorder text-ledgerMuted font-bold text-[10px] uppercase tracking-wider py-2 rounded-lg transition hover:text-ledgerText"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}

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
                  onEditExpense={(expense) => {
                    setEditingExpense(expense);
                    setIsAddSheetOpen(true);
                  }}
                  activeRange={activeRange}
                />
              </div>
            </div>
          )}

          {activeTab === 'savings' && (
            session ? (
              <SavingsTab
                savings={savings}
                onAddSavings={handleAddSavings}
                onDeleteSavings={handleDeleteSavings}
              />
            ) : (
              <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-8 shadow-lg text-center flex flex-col items-center justify-center space-y-4">
                <PiggyBank className="w-12 h-12 text-[#F2D06B] animate-bounce" />
                <h3 className="text-sm font-bold text-ledgerText uppercase tracking-wider">Savings features require Cloud Sync</h3>
                <p className="text-xs text-ledgerMuted leading-relaxed max-w-[280px]">Sign in or register a free account to track target savings and balance deposits.</p>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="bg-ledgerMint text-[#0F1B1E] font-semibold py-2.5 px-6 rounded-lg text-xs hover:bg-ledgerMint/90 active:scale-95 transition"
                >
                  Sign In / Register
                </button>
              </div>
            )
          )}

          {activeTab === 'logs' && (
            <PeriodLogsTab
              expenses={expenses}
              allBudgets={allBudgets}
              onDeleteExpense={handleDeleteExpense}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activeTab === 'recurring' && (
            session ? (
              <RecurringTab
                recurring={recurring}
                onAddRecurring={handleAddRecurring}
                onDeleteRecurring={handleDeleteRecurring}
              />
            ) : (
              <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-8 shadow-lg text-center flex flex-col items-center justify-center space-y-4">
                <Repeat className="w-12 h-12 text-[#E8A94C] animate-bounce" />
                <h3 className="text-sm font-bold text-ledgerText uppercase tracking-wider">Auto-Bill requires Cloud Sync</h3>
                <p className="text-xs text-ledgerMuted leading-relaxed max-w-[280px]">Enable auto-bill schedules and automated recurring subscription logs by logging in.</p>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="bg-ledgerMint text-[#0F1B1E] font-semibold py-2.5 px-6 rounded-lg text-xs hover:bg-ledgerMint/90 active:scale-95 transition"
                >
                  Sign In / Register
                </button>
              </div>
            )
          )}

          {activeTab === 'settings' && (
            session ? (
              <ProfileSettings
                session={session}
                isOfflineMode={isOfflineMode}
                onSignOut={handleSignOut}
                onSignIn={handleSignIn}
                showToast={(msg) => showToast(msg)}
                isAppInstalled={isAppInstalled}
                deferredPrompt={deferredPrompt}
                onInstallApp={handleInstallApp}
              />
            ) : (
              <div className="space-y-4">
                {/* Clean settings top card layout */}
                <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-4 shadow-md flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img 
                      src="/favicon.png" 
                      alt="Ledger Logo" 
                      className="w-10 h-10 rounded-xl shadow border border-ledgerBorder/45"
                    />
                    <div>
                      <h3 className="text-xs font-bold text-ledgerText uppercase tracking-wider">Sync Profile</h3>
                      <p className="text-[10px] text-ledgerMuted leading-relaxed">Browsing as Local Guest</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-ledgerMuted font-medium">Dark Mode:</span>
                    <ThemeToggle />
                  </div>
                </div>

                {/* Login & signup compact form block */}
                <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-md">
                  <Auth onAuthSuccess={fetchData} hideHeader={true} />
                </div>

                {/* Signature Footer */}
                <footer className="pt-4 pb-2 text-center text-[10px] text-ledgerMuted select-none">
                  Made with ❤️ by{' '}
                  <a
                    href="https://github.com/pushkar156"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#9C8EE3] font-bold hover:underline transition-all duration-150 bg-[#9C8EE3]/10 px-1.5 py-0.5 rounded"
                  >
                    Pushkar Gangurde
                  </a>
                </footer>
              </div>
            )
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

        {/* Sticky Dock Navigation Bar (5 Items: Expenses, Savings, Logs, Auto-Bill, Settings) */}
        <div className="fixed bottom-4 left-0 right-0 pointer-events-none flex justify-center z-40">
          <div className="w-full max-w-[480px] px-6 pointer-events-auto flex justify-center">
            <Dock
              items={[
                {
                  icon: <CreditCard className="w-4 h-4 text-[#6FA8DC]" />,
                  label: 'Expenses',
                  onClick: () => setActiveTab('expenses'),
                  className: activeTab === 'expenses' ? 'border-[#6FA8DC] bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                },
                {
                  icon: <PiggyBank className="w-4 h-4 text-[#F2D06B]" />,
                  label: 'Savings',
                  onClick: () => setActiveTab('savings'),
                  className: activeTab === 'savings' ? 'border-[#F2D06B] bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                },
                {
                  icon: <History className="w-4 h-4 text-[#C792EA]" />,
                  label: 'Logs',
                  onClick: () => setActiveTab('logs'),
                  className: activeTab === 'logs' ? 'border-[#C792EA] bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                },
                {
                  icon: <Repeat className="w-4 h-4 text-[#E8A94C]" />,
                  label: 'Auto-Bill',
                  onClick: () => setActiveTab('recurring'),
                  className: activeTab === 'recurring' ? 'border-[#E8A94C] bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
                },
                {
                  icon: <Settings className="w-4 h-4 text-[#8FA8A3]" />,
                  label: 'Settings',
                  onClick: () => setActiveTab('settings'),
                  className: activeTab === 'settings' ? 'border-[#8FA8A3] bg-ledgerElevated' : 'border-neutral-800 bg-ledgerSurface'
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
            editingExpense={editingExpense}
            onClose={() => {
              setIsAddSheetOpen(false);
              setEditingExpense(null);
            }}
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
