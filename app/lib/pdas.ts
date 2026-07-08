import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  STRATA_PROGRAM_ID,
  POOL_SEED,
  POOL_VAULT_SEED,
  PRODUCT_SEED,
  POS_SEED,
  GEO_PRODUCT_SEED,
  GEO_POS_SEED,
  CONFIG_SEED,
} from "./constants";

export function writerPoolPda(writer: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(POOL_SEED), writer.toBuffer()],
    STRATA_PROGRAM_ID
  )[0];
}

export function poolVaultPda(writer: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(POOL_VAULT_SEED), writer.toBuffer()],
    STRATA_PROGRAM_ID
  )[0];
}

export function configPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(CONFIG_SEED)], STRATA_PROGRAM_ID)[0];
}

export function productPda(fixtureId: bigint | number, nonce: number): PublicKey {
  const fixtureIdBn = new BN(fixtureId.toString());
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PRODUCT_SEED),
      fixtureIdBn.toArrayLike(Buffer, "le", 8),
      new BN(nonce).toArrayLike(Buffer, "le", 4),
    ],
    STRATA_PROGRAM_ID
  )[0];
}

export function positionPda(product: PublicKey, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(POS_SEED), product.toBuffer(), user.toBuffer()],
    STRATA_PROGRAM_ID
  )[0];
}

export function geoProductPda(fixtureId: bigint | number, nonce: number): PublicKey {
  const fixtureIdBn = new BN(fixtureId.toString());
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(GEO_PRODUCT_SEED),
      fixtureIdBn.toArrayLike(Buffer, "le", 8),
      new BN(nonce).toArrayLike(Buffer, "le", 4),
    ],
    STRATA_PROGRAM_ID
  )[0];
}

export function geoPositionPda(geoProduct: PublicKey, user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GEO_POS_SEED), geoProduct.toBuffer(), user.toBuffer()],
    STRATA_PROGRAM_ID
  )[0];
}
