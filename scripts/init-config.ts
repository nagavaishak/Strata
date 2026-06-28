// One-time setup after deploying Strata to a new cluster: points settle_leg's CPI
// target at TxLINE's txoracle program. Safe to re-run — if Config already exists,
// switches to update_config instead of failing on `already in use`.
//
// Usage: ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
//        ANCHOR_WALLET=~/.config/solana/oracle-keypair.json \
//        ts-node scripts/init-config.ts [txoracleProgramId]

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Strata } from "../target/types/strata";

const DEVNET_TXORACLE_ID = "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Strata as anchor.Program<Strata>;

  const txoracleProgramId = new PublicKey(process.argv[2] ?? DEVNET_TXORACLE_ID);
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  const existing = await program.account.config.fetchNullable(configPda);

  if (existing === null) {
    const sig = await program.methods
      .initializeConfig(txoracleProgramId)
      .accounts({ config: configPda, authority: provider.wallet.publicKey } as any)
      .rpc();
    console.log(`initialize_config: ${sig}`);
  } else {
    const sig = await program.methods
      .updateConfig(txoracleProgramId)
      .accounts({ config: configPda, authority: provider.wallet.publicKey } as any)
      .rpc();
    console.log(`update_config: ${sig}`);
  }

  const config = await program.account.config.fetch(configPda);
  console.log(`Config PDA: ${configPda.toBase58()}`);
  console.log(`txoracle_program_id: ${config.txoracleProgramId.toBase58()}`);
  console.log(`authority: ${config.authority.toBase58()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
