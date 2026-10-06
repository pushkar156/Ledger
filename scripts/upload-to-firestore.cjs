const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, writeBatch } = require('firebase/firestore');

// 1. Read .env.local to load credentials
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase config missing in .env.local!');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. Read migration-data.json
const dataPath = path.join(__dirname, '..', 'migration-data.json');
if (!fs.existsSync(dataPath)) {
  console.error('migration-data.json not found! Run `node scripts/parse-backup.cjs` first.');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Accept target user ID via CLI argument: node scripts/upload-to-firestore.cjs <TARGET_FIREBASE_UID>
const targetUserId = process.argv[2];

if (!targetUserId) {
  console.log('====================================================');
  console.log('Usage: node scripts/upload-to-firestore.cjs <TARGET_FIREBASE_UID>');
  console.log('');
  console.log('Available Supabase Users in the backup:');
  data.users.forEach((u) => console.log(`  - Email: ${u.email} | Old UUID: ${u.id}`));
  console.log('');
  console.log('Once you sign up/log in with your Firebase account, find your UID');
  console.log('in the Firebase Console (Authentication tab) and run:');
  console.log('node scripts/upload-to-firestore.cjs <YOUR_NEW_UID>');
  console.log('====================================================');
  process.exit(0);
}

async function upload() {
  console.log(`Starting upload to Firestore project: ${firebaseConfig.projectId}`);
  console.log(`Mapping all backup records to Firebase UID: ${targetUserId}`);

  // 1. Upload Expenses
  console.log(`Uploading ${data.expenses.length} expenses...`);
  for (let i = 0; i < data.expenses.length; i += 400) {
    const chunk = data.expenses.slice(i, i + 400);
    const batch = writeBatch(db);
    chunk.forEach((e) => {
      const ref = doc(db, 'expenses', e.id);
      batch.set(ref, {
        ...e,
        user_id: targetUserId,
      });
    });
    await batch.commit();
    console.log(`  Committed expenses batch ${Math.floor(i / 400) + 1}...`);
  }

  // 2. Upload Budgets
  console.log(`Uploading ${data.budgets.length} budgets...`);
  const budgetBatch = writeBatch(db);
  data.budgets.forEach((b) => {
    const ref = doc(db, 'budgets', b.id);
    budgetBatch.set(ref, {
      ...b,
      user_id: targetUserId,
    });
  });
  await budgetBatch.commit();

  // 3. Upload Savings
  console.log(`Uploading ${data.savings.length} savings entries...`);
  const savingsBatch = writeBatch(db);
  data.savings.forEach((s) => {
    const ref = doc(db, 'savings', s.id);
    savingsBatch.set(ref, {
      ...s,
      user_id: targetUserId,
    });
  });
  await savingsBatch.commit();

  // 4. Upload Recurring
  console.log(`Uploading ${data.recurring.length} recurring rules...`);
  const recBatch = writeBatch(db);
  data.recurring.forEach((r) => {
    const ref = doc(db, 'recurring_expenses', r.id);
    recBatch.set(ref, {
      ...r,
      user_id: targetUserId,
    });
  });
  await recBatch.commit();

  console.log('\nSUCCESS! All past Ledger transactions, budgets, savings, and recurring rules have been uploaded to Firebase!');
  process.exit(0);
}

upload().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
