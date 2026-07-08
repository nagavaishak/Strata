import { PublicKey } from "@solana/web3.js";

export const STRATA_PROGRAM_ID = new PublicKey("37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs");
export const TXORACLE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

// The demo writer pool used across every devnet proof script in scripts/. Reused here so
// the UI reads the same pool state that's already been proven solvent with real SOL.
export const DEMO_WRITER_POOL = new PublicKey("i7u34mcv1e6T7f8Q1bxVsWCvyzbgnsNTKu1f4Ay146B");

export const POOL_SEED = "writer_pool";
export const POOL_VAULT_SEED = "pool_vault";
export const PRODUCT_SEED = "product";
export const POS_SEED = "pos";
export const CONFIG_SEED = "config";
export const GEO_PRODUCT_SEED = "geo_product";
export const GEO_POS_SEED = "geo_pos";

export const MAX_LEGS = 5;
export const MAX_TIERS = 6;
