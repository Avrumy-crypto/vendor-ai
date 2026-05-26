import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './db';

const email = process.argv[2] ?? 'admin@fivestarcorr.com';
const password = process.argv[3] ?? 'ChangeMe123!';
const displayName = process.argv[4] ?? 'Admin';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log(`User ${email} already exists.`);
  process.exit(0);
}

const hash = bcrypt.hashSync(password, 12);
db.prepare(
  "INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, 'admin')"
).run(email, hash, displayName);

console.log(`Admin user created: ${email} / ${password}`);
console.log('Change the password after first login.');
