// Client-side password hashing using Web Crypto API with per-user salts
// Note: This provides basic protection but is NOT a replacement for server-side security

// Generate a unique random salt for each user
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(salt, b => b.toString(16).padStart(2, '0')).join('');
}

// Hash password with a unique salt
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password against stored hash using the user's salt
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const passwordHash = await hashPassword(password, salt);
  return passwordHash === hash;
}

// Generate a session token
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Session token storage (separate from user data)
const SESSION_KEY = 'accounting_session';

export function getSessionToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, token);
  } catch {
    console.error('Failed to save session token');
  }
}

export function clearSessionToken(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    console.error('Failed to clear session token');
  }
}
