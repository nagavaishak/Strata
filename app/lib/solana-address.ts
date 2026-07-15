import { PublicKey } from "@solana/web3.js";

/** A malformed route param (typo'd/truncated address) should show a "not
 * found" state, not crash the page -- PublicKey's constructor throws
 * synchronously on invalid base58/length. */
export function parsePublicKey(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}
