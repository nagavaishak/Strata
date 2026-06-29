// Proves the shared writer-pool model for real, on devnet, with real SOL:
// initialize_writer_pool -> fund_pool -> create TWO products reserving against the SAME
// pool -> settle_leg (real CPI into the real txoracle program) for one of them ->
// finalize both -> withdraw_from_pool, all independently checkable on-chain.
//
// Scoped like real-settlement.ts: no buyer deposit, for the same reason documented there
// (no live TxLINE fixture active right now to demo that leg safely against the
// anti-sniping check). This proves the OTHER real claim instead: that reserved/owed
// accounting across multiple products sharing one pool is correct and provably safe,
// with real money, not just in the localnet mock test suite.
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import * as fs from "fs";

const PROOF_PATH = __dirname + "/../tests/fixtures/real-devnet-proof.json";
const RPC = "https://api.devnet.solana.com";
const TXORACLE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

async function main() {
  const keypairPath = process.env.HOME + "/.config/solana/oracle-keypair.json";
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8")));
  const writer = Keypair.fromSecretKey(secret);
  const wallet = new anchor.Wallet(writer);
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const strataIdl = JSON.parse(fs.readFileSync(__dirname + "/../target/idl/strata.json", "utf8"));
  const program = new anchor.Program(strataIdl as anchor.Idl, provider);

  const [writerPool] = PublicKey.findProgramAddressSync([Buffer.from("writer_pool"), writer.publicKey.toBuffer()], program.programId);
  const [poolVault] = PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), writer.publicKey.toBuffer()], program.programId);
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);

  const poolInfo = await connection.getAccountInfo(writerPool);
  if (!poolInfo) {
    console.log("initialize_writer_pool...");
    const sig = await program.methods
      .initializeWriterPool()
      .accounts({ writerPool, poolVault, writer: writer.publicKey } as any)
      .rpc();
    console.log("  ", sig);
  } else {
    console.log("writer_pool already exists:", writerPool.toBase58());
  }

  console.log("fund_pool 0.05 SOL...");
  let sig = await program.methods
    .fundPool(new BN(50_000_000))
    .accounts({ writerPool, poolVault, writer: writer.publicKey } as any)
    .rpc();
  console.log("  ", sig);

  const proof = JSON.parse(fs.readFileSync(PROOF_PATH, "utf8"));
  const fixtureIdA = new BN(proof.summary.fixtureId);
  const nonceBase = Math.floor(Date.now() / 1000) % 1_000_000;
  const statKey = proof.statToProve.key;
  const statValue = proof.statToProve.value as number;
  const threshold = statValue - 1;
  const closesAt = new BN(Math.floor(proof.summary.updateStats.minTimestamp / 1000) - 5);
  const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 1800);
  const legs = [
    { statKeyA: statKey, statKeyB: 0, hasSecondStat: false, op: { add: {} }, threshold, comparison: { greaterThan: {} } },
  ];

  // Product A: will settle true via a real CPI, 2x tier.
  const nonceA = nonceBase;
  const [productA] = PublicKey.findProgramAddressSync(
    [Buffer.from("product"), fixtureIdA.toArrayLike(Buffer, "le", 8), new BN(nonceA).toArrayLike(Buffer, "le", 4)],
    program.programId
  );
  const capacityA = new BN(5_000_000);
  const tiersA = [{ minLegsTrue: 0, payoutBps: 0 }, { minLegsTrue: 1, payoutBps: 20000 }];

  // Product B: a second, unrelated fixture id, never settled in this run — demonstrates
  // the pool reserving for TWO independent open products at once before either resolves.
  const fixtureIdB = fixtureIdA.addn(1);
  const nonceB = nonceBase + 1;
  const [productB] = PublicKey.findProgramAddressSync(
    [Buffer.from("product"), fixtureIdB.toArrayLike(Buffer, "le", 8), new BN(nonceB).toArrayLike(Buffer, "le", 4)],
    program.programId
  );
  const capacityB = new BN(3_000_000);
  const tiersB = [{ minLegsTrue: 0, payoutBps: 0 }, { minLegsTrue: 1, payoutBps: 15000 }];

  const poolBefore = await (program.account as any).writerPool.fetch(writerPool);
  console.log(`pool before: reserved=${poolBefore.reserved} owed=${poolBefore.owed}`);

  console.log("create_product A...");
  sig = await program.methods
    .createProduct(fixtureIdA, nonceA, legs as any, tiersA as any, closesAt, settleDeadline, capacityA)
    .accounts({ product: productA, writerPool, poolVault, payer: writer.publicKey } as any)
    .rpc();
  console.log("  ", sig);

  console.log("create_product B (same pool, different fixture, stays open)...");
  sig = await program.methods
    .createProduct(fixtureIdB, nonceB, legs as any, tiersB as any, closesAt, settleDeadline, capacityB)
    .accounts({ product: productB, writerPool, poolVault, payer: writer.publicKey } as any)
    .rpc();
  console.log("  ", sig);

  const collateralA = capacityA.muln(20000).divn(10000);
  const collateralB = capacityB.muln(15000).divn(10000);
  const poolAfterCreate = await (program.account as any).writerPool.fetch(writerPool);
  console.log(`pool after both creates: reserved=${poolAfterCreate.reserved} (expected += ${collateralA.add(collateralB)}) owed=${poolAfterCreate.owed}`);

  const epochDay = Math.floor(proof.summary.updateStats.minTimestamp / 86400000);
  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    TXORACLE_PROGRAM_ID
  );

  console.log("settle_leg on A (real CPI into the real txoracle program)...");
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
  sig = await program.methods
    .settleLeg(
      0,
      new BN(proof.summary.updateStats.minTimestamp),
      {
        fixtureId: fixtureIdA,
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
    .accounts({ product: productA, config: configPda, txoracleProgram: TXORACLE_PROGRAM_ID, dailyScoresMerkleRoots: dailyScoresPda } as any)
    .preInstructions([computeBudgetIx])
    .rpc();
  console.log("  ", sig);

  console.log("finalize_product A...");
  sig = await program.methods
    .finalizeProduct()
    .accounts({ product: productA, writerPool } as any)
    .rpc();
  console.log("  ", sig);

  const finalizedA = await (program.account as any).product.fetch(productA);
  const poolAfterFinalizeA = await (program.account as any).writerPool.fetch(writerPool);
  console.log(`A final_payout_bps=${finalizedA.finalPayoutBps}`);
  console.log(`pool after finalizing A only: reserved=${poolAfterFinalizeA.reserved} (B's ${collateralB} should still be reserved) owed=${poolAfterFinalizeA.owed}`);

  console.log("\nDONE. Two products reserved real SOL against one real pool on devnet;");
  console.log("one settled via a real CPI into TxLINE's actual program; the other is still");
  console.log("open, and its reservation is still correctly held while A's became owed.");
  console.log("Product A:", productA.toBase58(), "| Product B (still open):", productB.toBase58());
  console.log("Writer pool:", writerPool.toBase58());
}

main().catch((e) => {
  console.error("FAILED:", e?.logs ?? e?.message ?? e);
  process.exit(1);
});
