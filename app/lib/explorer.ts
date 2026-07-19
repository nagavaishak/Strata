import { RPC_URL } from "@/lib/constants";

/**
 * Solana Explorer's own default devnet RPC prunes transaction history within
 * hours -- far faster than our app's RPC_URL (Helius), so a plain
 * ?cluster=devnet link can 404 even when our own /verify page shows the
 * transaction fine. Point Explorer at the same RPC we use via its
 * custom-cluster option instead of trusting its default.
 */
export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`;
}
