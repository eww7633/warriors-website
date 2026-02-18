import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function hashLegacySha256(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function verifyPassword(password: string, storedHash: string) {
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    return {
      valid: await bcrypt.compare(password, storedHash),
      needsRehash: false
    };
  }

  const valid = hashLegacySha256(password) === storedHash;
  return {
    valid,
    needsRehash: valid
  };
}
