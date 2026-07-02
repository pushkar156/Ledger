export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  date: string; // YYYY-MM-DD format
  created_at: string;
  type: 'debit' | 'credit';
}

export interface Budget {
  id?: string;
  user_id: string;
  type: 'monthly' | 'custom';
  month?: string; // YYYY-MM format
  start_date?: string; // YYYY-MM-DD format
  end_date?: string; // YYYY-MM-DD format
  monthly: number;
  category_limits: Record<string, number>;
  created_at?: string;
}

export interface SavingsTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'incoming' | 'outgoing';
  note: string | null;
  date: string; // YYYY-MM-DD format
  created_at: string;
}
