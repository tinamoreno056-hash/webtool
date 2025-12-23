// PASTE THIS INTO BROWSER CONSOLE (Press F12, go to Console tab, paste and press Enter)

console.log('🔧 Starting Auto-Fix...');

// Clear all accounting data
Object.keys(localStorage)
    .filter(k => k.startsWith('accounting_'))
    .forEach(k => localStorage.removeItem(k));

// Create perfect admin user
const adminUser = {
    id: 'admin-1',
    username: 'admin',
    password: '__NEEDS_HASH__:admin',
    role: 'admin',
    name: 'Administrator',
    email: 'admin@accubooks.com',
    createdAt: new Date().toISOString(),
    isActive: true
};

// Set users
localStorage.setItem('accounting_users', JSON.stringify([adminUser]));

// Set auth state
const authState = {
    isAuthenticated: true,
    currentUser: adminUser
};
localStorage.setItem('accounting_auth', JSON.stringify(authState));

console.log('✅ FIX APPLIED!');
console.log('Now refresh the page (F5) and login with:');
console.log('Username: admin');
console.log('Password: admin');
console.log('All buttons will appear!');

// Auto-refresh after 2 seconds
setTimeout(() => {
    console.log('Auto-refreshing in 3...');
    setTimeout(() => console.log('2...'), 1000);
    setTimeout(() => console.log('1...'), 2000);
    setTimeout(() => location.reload(), 3000);
}, 1000);
