// Resumes a live-buyer-flow.ts run that got past deposit + a valid post-close proof,
// but failed at settle_leg because the txoracle program hadn't posted the on-chain
// merkle root for that time slot yet (RootNotAvailable). Retries settle_leg -> finalize
// -> claim only, using the already-created product/position and the already-saved proof
// in tests/fixtures/live-buyer-flow-proof.json -- no new deposit, no new product.
//
// Usage: ANCHOR_WALLET=~/.config/solana/oracle-keypair.json ts-node -P tsconfig.json scripts/resume-settle.ts <fixtureId> <nonce>
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import * as fs from "fs";

const RPC = "https://api.devnet.solana.com";
const TXORACLE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

const FIXTURE_ID = Number(process.argv[2]);
const NONCE = Number(process.argv[3]);
if (!FIXTURE_ID || !NONCE) {
  console.error("usage: resume-settle.ts <fixtureId> <nonce>");
  process.exit(1);
}

async function main() {
  const keypairPath = process.env.ANCHOR_WALLET ?? process.env.HOME + "/.config/solana/oracle-keypair.json";
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8")));
  const writer = Keypair.fromSecretKey(secret);
  const wallet = new anchor.Wallet(writer);
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const strataIdl = JSON.parse(fs.readFileSync(__dirname + "/../target/idl/strata.json", "utf8"));
  const program = new anchor.Program(strataIdl as anchor.Idl, provider);

  const [product] = PublicKey.findProgramAddressSync(
    [Buffer.from("product"), new BN(FIXTURE_ID).toArrayLike(Buffer, "le", 8), new BN(NONCE).toArrayLike(Buffer, "le", 4)],
    program.programId
  );
  const [position] = PublicKey.findProgramAddressSync(
    [Buffer.from("pos"), product.toBuffer(), writer.publicKey.toBuffer()],
    program.programId
  );
  const [writerPool] = PublicKey.findProgramAddressSync([Buffer.from("writer_pool"), writer.publicKey.toBuffer()], program.programId);
  const [poolVault] = PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), writer.publicKey.toBuffer()], program.programId);

  const before = await (program.account as any).product.fetch(product);
  console.log("product status before:", before.status, "legResults:", before.legResults);

  const proof = JSON.parse(fs.readFileSync(__dirname + "/../tests/fixtures/live-buyer-flow-proof.json", "utf8"));
  console.log("using saved proof, minTimestamp", proof.summary.updateStats.minTimestamp);

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const epochDay = Math.floor(proof.summary.updateStats.minTimestamp / 86400000);
  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    TXORACLE_PROGRAM_ID
  );

  console.log("settle_leg (retry) ...");
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
  let sig = await program.methods
    .settleLeg(
      0,
      new BN(proof.summary.updateStats.minTimestamp),
      {
        fixtureId: new BN(FIXTURE_ID),
        updateStats: {
          updateCount: proof.summary.updateStats.updateCount,
          minTimestamp: new BN(proof.summary.updateStats.minTimestamp),
          maxTimestamp: new BN(proof.summary.updateStats.maxTimestamp),
        },
        eventsSubTreeRoot: proof.summary.eventStatsSubTreeRoot,
      } as any,
      proof.subTreeProof,
      proof.mainTreeProof,
      { statToProve: proof.statToProve, eventStatRoot: proof.eventStatRoot, statProof: proof.statProof } as any,
      null
    )
    .accounts({ product, config: configPda, txoracleProgram: TXORACLE_PROGRAM_ID, dailyScoresMerkleRoots: dailyScoresPda } as any)
    .preInstructions([computeBudgetIx])
    .rpc();
  console.log("  ", sig);

  console.log("finalize_product...");
  sig = await program.methods.finalizeProduct().accounts({ product, writerPool } as any).rpc();
  console.log("  ", sig);

  const finalized = await (program.account as any).product.fetch(product);
  console.log("final_payout_bps:", finalized.finalPayoutBps, "leg_results:", finalized.legResults);

  console.log("claim...");
  sig = await program.methods.claim().accounts({ product, position, poolVault, writerPool, user: writer.publicKey } as any).rpc();
  console.log("  ", sig);

  console.log("\nDONE — resumed and completed: settle_leg -> finalize -> claim.");
  console.log("Product:", product.toBase58(), "Writer pool:", writerPool.toBase58());
}

main().catch((e) => {
  console.error("FAILED:", e?.logs ?? e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
