const fs = require('fs');
const path = require('path');

const BACKUP_FILE = path.join(__dirname, '..', 'db_cluster-18-08-2026@00-35-44.backup');
const OUTPUT_JSON = path.join(__dirname, '..', 'migration-data.json');

function parseDump() {
  console.log('Reading database backup dump:', BACKUP_FILE);
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('Backup file not found:', BACKUP_FILE);
    process.exit(1);
  }

  const content = fs.readFileSync(BACKUP_FILE, 'utf8');

  function extractTableData(tableName) {
    const marker = `COPY ${tableName}`;
    const start = content.indexOf(marker);
    if (start === -1) return [];

    const endHeader = content.indexOf('\n', start);
    const headerLine = content.slice(start, endHeader);
    const endData = content.indexOf('\n\\.\n', endHeader);
    if (endData === -1) return [];

    const colMatch = headerLine.match(/\((.*?)\)/);
    if (!colMatch) return [];

    const columns = colMatch[1].split(',').map((c) => c.trim());
    const dataRows = content
      .slice(endHeader + 1, endData)
      .trim()
      .split('\n')
      .filter(Boolean);

    return dataRows.map((line) => {
      const vals = line.split('\t');
      const obj = {};
      columns.forEach((col, idx) => {
        let val = vals[idx];
        if (val === '\\N') val = null;
        obj[col] = val;
      });
      return obj;
    });
  }

  const users = extractTableData('auth.users').map((u) => ({
    id: u.id,
    email: u.email,
  }));

  const expenses = extractTableData('public.expenses').map((e) => ({
    id: e.id,
    user_id: e.user_id,
    amount: Number(e.amount),
    category: e.category,
    note: e.note,
    date: e.date,
    type: e.type || 'debit',
    created_at: e.created_at,
  }));

  const budgets = extractTableData('public.budgets').map((b) => {
    let limits = {};
    try {
      if (b.category_limits) limits = JSON.parse(b.category_limits);
    } catch {}
    return {
      id: b.id,
      user_id: b.user_id,
      type: b.type,
      month: b.month || undefined,
      start_date: b.start_date || undefined,
      end_date: b.end_date || undefined,
      monthly: Number(b.monthly || 0),
      category_limits: limits,
      created_at: b.created_at,
    };
  });

  const savings = extractTableData('public.savings').map((s) => ({
    id: s.id,
    user_id: s.user_id,
    amount: Number(s.amount),
    type: s.type,
    note: s.note,
    date: s.date,
    created_at: s.created_at,
  }));

  const recurring = extractTableData('public.recurring_expenses').map((r) => ({
    id: r.id,
    user_id: r.user_id,
    amount: Number(r.amount),
    category: r.category,
    note: r.note,
    type: r.type,
    day_of_month: Number(r.day_of_month),
    dayOfMonth: Number(r.day_of_month),
    created_at: r.created_at,
  }));

  const result = {
    metadata: {
      exported_at: new Date().toISOString(),
      counts: {
        users: users.length,
        expenses: expenses.length,
        budgets: budgets.length,
        savings: savings.length,
        recurring: recurring.length,
      },
    },
    users,
    expenses,
    budgets,
    savings,
    recurring,
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2), 'utf8');
  console.log('Successfully generated JSON extraction:');
  console.log(`- Users: ${users.length}`);
  console.log(`- Expenses: ${expenses.length}`);
  console.log(`- Budgets: ${budgets.length}`);
  console.log(`- Savings: ${savings.length}`);
  console.log(`- Recurring Rules: ${recurring.length}`);
  console.log(`Saved to: ${OUTPUT_JSON}`);
}

parseDump();
