// Argon2id with the OWASP-recommended baseline (19 MiB, 2 iterations).
import { hash, verify } from '@node-rs/argon2';

const OPTIONS = { algorithm: 2 /* Argon2id */, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export const MIN_PASSWORD_LENGTH = 12;

export function hashPassword(password) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash, password) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Verifying against this when the e-mail is unknown keeps the response time
// the same, so timing doesn't reveal which addresses exist.
let dummyHash = null;
export async function burnVerifyTime(password) {
  dummyHash ??= await hashPassword('not-a-real-account-password');
  await verifyPassword(dummyHash, password);
}

/** German message for a too-weak password, or null if it's acceptable. */
export function passwordProblem(password, { email = '' } = {}) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  if (password.length > 200) return 'Das Passwort darf höchstens 200 Zeichen lang sein.';
  if (new Set(password).size < 5) return 'Das Passwort ist zu einfach.';
  const local = email.split('@')[0]?.toLowerCase();
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) {
    return 'Das Passwort darf die E-Mail-Adresse nicht enthalten.';
  }
  return null;
}
