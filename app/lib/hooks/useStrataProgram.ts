"use client";

import { useMemo } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import strataIdl from "@/lib/idl/strata.json";

export type StrataIdl = typeof strataIdl;

/**
 * Builds an Anchor Program client bound to the connected wallet (or a read-only
 * dummy provider if no wallet is connected — every read-only account fetch still
 * works, only signing instructions require a real connected wallet).
 */
export function useStrataProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    const provider = new anchor.AnchorProvider(
      connection,
      wallet ?? ({ publicKey: undefined } as unknown as anchor.Wallet),
      { commitment: "confirmed" }
    );
    return new anchor.Program(strataIdl as anchor.Idl, provider);
  }, [connection, wallet]);
}
