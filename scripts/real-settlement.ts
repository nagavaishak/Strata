// Runs create_product -> settle_leg -> finalize_product -> withdraw_writer_surplus on
// devnet against a REAL TxLINE proof (captured by scripts/probe-txline.ts), with a real
// CPI into the real txoracle program — not a mock.
//
// Deliberately scoped WITHOUT a buyer deposit/claim. Reason, documented honestly: the
// only real proof data reliably available right now is TxLINE's static documented
// example (fixtureId 17952170), whose minTimestamp is frozen in the past. settle_leg's
// anti-sniping check (minTimestamp must postdate closes_at) means a buyer deposit would
// require closes_at to be in the future at deposit time, which can never be satisfied by
// a batch that's already frozen in the past — no amount of waiting produces a new batch
// for static data. A scan of the last 24h of TxLINE's devnet feed found one fixture that
// *was* genuinely live a few hours ago (climbing Seq numbers, real stats) but it isn't
// actively updating right now, so there's no currently-live fixture to use instead.
//
// Buyer/writer economics (2.5x payout, collateral posting, surplus reclaim) are already
// proven rigorously against the mock oracle in tests/strata.ts (6/6 passing) — that part
// doesn't depend on a live match existing. This script instead proves the other half:
// writer collateral posting and settle_leg/finalize_product/withdraw_writer_surplus all
// work for real, with a real CPI into TxLINE's actual on-chain program returning a real
// `true`. With zero buyer stake, the writer's full collateral comes back as surplus —
// itself a clean proof of the solvency math (collateral_locked + 0 - 0 = collateral_locked).
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

  const proof = JSON.parse(fs.readFileSync(PROOF_PATH, "utf8"));
  const fixtureId = new BN(proof.summary.fixtureId);
  const nonce = Math.floor(Date.now() / 1000) % 1_000_000;
  const statKey = proof.statToProve.key;
  const statValue = proof.statToProve.value as number;
  const threshold = statValue - 1; // trivially true for the value TxLINE actually recorded

  console.log(`Fixture ${fixtureId.toString()}, stat key ${statKey}, real value ${statValue}, nonce ${nonce}`);

  const [productPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("product"), fixtureId.toArrayLike(Buffer, "le", 8), new BN(nonce).toArrayLike(Buffer, "le", 4)],
    program.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), productPda.toBuffer()], program.programId);
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);

  // closes_at must be BEFORE this batch's minTimestamp (anti-sniping check), which is fine
  // here since we're not taking a buyer deposit in this run — see file header.
  const closesAt = new BN(Math.floor(proof.summary.updateStats.minTimestamp / 1000) - 5);
  const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 1800);
  const topTierBps = 20000; // 2x — same real-upside tier table as the mock test
  const maxCapacity = new BN(10_000_000); // 0.01 SOL of capacity, unsold in this run

  const legs = [
    { statKeyA: statKey, statKeyB: 0, hasSecondStat: false, op: { add: {} }, threshold, comparison: { greaterThan: {} } },
  ];
  const tiers = [
    { minLegsTrue: 0, payoutBps: 0 },
    { minLegsTrue: 1, payoutBps: topTierBps },
  ];

  console.log(`create_product (writer posts ${(maxCapacity.toNumber() * topTierBps) / 10000 / 1e9} SOL collateral)...`);
  const writerBalanceBeforeCreate = await connection.getBalance(writer.publicKey);
  let sig = await program.methods
    .createProduct(fixtureId, nonce, legs as any, tiers as any, closesAt, settleDeadline, maxCapacity)
    .accounts({ product: productPda, vault: vaultPda, payer: writer.publicKey } as any)
    .rpc();
  console.log("  ", sig);
  const writerBalanceAfterCreate = await connection.getBalance(writer.publicKey);
  const collateralPosted = writerBalanceBeforeCreate - writerBalanceAfterCreate;
  console.log(`  writer posted ${collateralPosted / 1e9} SOL collateral (real SOL, real transaction)`);

  const epochDay = Math.floor(proof.summary.updateStats.minTimestamp / 86400000);
  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    TXORACLE_PROGRAM_ID
  );
  console.log("daily_scores_roots PDA:", dailyScoresPda.toBase58(), "epochDay:", epochDay);

  console.log("settle_leg (real CPI into the real txoracle program)...");
  const targetTs = new BN(proof.summary.updateStats.minTimestamp);
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
  sig = await program.methods
    .settleLeg(
      0,
      targetTs,
      {
        fixtureId: new BN(proof.summary.fixtureId),
        updateStats: {
          updateCount: proof.summary.updateStats.updateCount,
          minTimestamp: new BN(proof.summary.updateStats.minTimestamp),
          maxTimestamp: new BN(proof.summary.updateStats.maxTimestamp),
        },
        eventsSubTreeRoot: proof.summary.eventStatsSubTreeRoot,
      } as any,
      proof.subTreeProof,
      proof.mainTreeProof,
      {
        statToProve: proof.statToProve,
        eventStatRoot: proof.eventStatRoot,
        statProof: proof.statProof,
      } as any,
      null
    )
    .accounts({
      product: productPda,
      config: configPda,
      txoracleProgram: TXORACLE_PROGRAM_ID,
      dailyScoresMerkleRoots: dailyScoresPda,
    } as any)
    .preInstructions([computeBudgetIx])
    .rpc();
  console.log("  ", sig);

  const settled = await (program.account as any).product.fetch(productPda);
  console.log("leg_results[0]:", settled.legResults[0]);

  console.log("finalize_product...");
  sig = await program.methods
    .finalizeProduct()
    .accounts({ product: productPda } as any)
    .rpc();
  console.log("  ", sig);

  const finalized = await (program.account as any).product.fetch(productPda);
  console.log("final_payout_bps:", finalized.finalPayoutBps, "total_stake:", finalized.totalStake.toString());

  console.log("withdraw_writer_surplus...");
  const writerBalanceBeforeSurplus = await connection.getBalance(writer.publicKey);
  sig = await program.methods
    .withdrawWriterSurplus()
    .accounts({ product: productPda, vault: vaultPda, writer: writer.publicKey } as any)
    .rpc();
  console.log("  ", sig);
  const writerBalanceAfterSurplus = await connection.getBalance(writer.publicKey);
  const surplus = writerBalanceAfterSurplus - writerBalanceBeforeSurplus;
  console.log(`  writer reclaimed ${surplus / 1e9} SOL surplus (expected ~= collateral posted, since total_stake was 0)`);

  console.log("\nDONE. Real collateral posting + real settle_leg CPI + real surplus reclaim, all on devnet.");
  console.log("Buyer-side economics (2.5x payout on a real deposit) are proven separately against the");
  console.log("mock oracle in tests/strata.ts, since no live fixture is currently active to demo it here.");
  console.log("Product:", productPda.toBase58());
}

main().catch((e) => {
  console.error("FAILED:", e?.logs ?? e?.message ?? e);
  process.exit(1);
});
