# 📊 Ledger — Personal Finance Tracker

Ledger is a calm, precise, and lightning-fast Progressive Web App (PWA) designed to monitor daily spending, track recurring subscriptions, and manage savings balances on a clean, modern interface. 

It is built with React, Vite, Tailwind CSS, Framer Motion, and includes seamless integration with Supabase for real-time cloud sync, alongside a fully functioning local sandbox fallback.

---

## ✨ Features

- **PWA Installation**: Install on iOS, Android, or Desktop for a native, standalone, full-screen app experience with offline support.
- **Smart Timeline & Calendar Filter**: A horizontal calendar strip combined with a monthly grid view to monitor, filter, and track transactions dynamically.
- **Swipe‑to‑Delete Gestures**: Interactive list management with fluid, spring-physics drag feedback.
- **Savings Log**: Track deposits, withdrawals, and net savings balances.
- **7-Day Spend Trend & Smart Insights**: Dynamic visual analytics via Recharts showing daily burn rates, weekly momentum, and budget projections.
- **Auto-Bill Scheduler**: Configure rules to automatically log recurring utility bills and subscriptions.
- **Theme Controls**: Soothing violet-slate UI that dynamically transitions between dark mode and system preferences.
- **Supabase Integration**: Real-time cloud sync with built-in Row-Level Security (RLS) policies protecting database calls.

---

## 🛠️ Tech Stack

- **Frontend Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, CSS Custom Properties
- **Animations**: Framer Motion, React Swipeable
- **Charts & Analysis**: Recharts
- **Database Backend**: Supabase
- **PWA Capabilities**: Service Workers, Web App Manifest

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm / yarn / pnpm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/pushkar156/Ledger.git
   cd Ledger
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root folder and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   *(Note: If these variables are not set, Ledger will automatically run in local sandbox mode using `localStorage`)*

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## 🔒 Database Setup & Security (Supabase)

To enable cloud sync and secure your transaction database, execute the following SQL script inside the **Supabase SQL Editor** to enable Row Level Security (RLS) on your tables:

```sql
-- 1. Enable RLS on existing tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 2. Create security policies with explicit UUID casting
CREATE POLICY "Users can manage their own expenses" 
ON public.expenses 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id::uuid) 
WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can manage their own savings" 
ON public.savings 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id::uuid) 
WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can manage their own budgets" 
ON public.budgets 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id::uuid) 
WITH CHECK (auth.uid() = user_id::uuid);
```

---

## 📄 License

This project is licensed under the MIT License.

```text
Copyright (c) 2026 Pushkar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
