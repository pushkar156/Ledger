export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string | null;
  date: string; // YYYY-MM-DD format
  created_at: string;
}

export interface Budget {
  user_id: string;
  monthly: number;
  category_limits: Record<string, number>;
}
