import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "v1";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashSecret(secret: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = sha256Hex(`${salt}:${secret}`);
  return `${HASH_PREFIX}$${salt}$${digest}`;
}

export function verifySecret(secret: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) {
    return false;
  }
  const [, salt, expectedHex] = parts;
  const candidateHex = sha256Hex(`${salt}:${secret}`);

  const expected = Buffer.from(expectedHex, "hex");
  const candidate = Buffer.from(candidateHex, "hex");
  if (expected.length !== candidate.length) {
    return false;
  }
  return timingSafeEqual(expected, candidate);
}

