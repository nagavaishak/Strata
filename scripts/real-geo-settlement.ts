// Proves the new geometric (exact-outcome) product path for real, on devnet, with real SOL:
// create_geo_product -> settle_geo_product (real CPI into TxLINE's validate_stat_v2, using
// its geometric distance predicate). Uses the same writer pool as the tiered engine (one pool
// backs both product families) and a real multi-stat proof fetched live from TxLINE devnet for
// fixture 18175981 (home=3, away=0 at the proven snapshot).
//
// Same honest scope as real-pool-settlement.ts: no buyer deposit in this run. The proof's
// minTimestamp is a real, historical, already-sealed value, so closes_at necessarily has to be
// set in the past relative to it — but a live deposit tx can only land at present wall-clock
// time, which is already past that closes_at. Depositing needs a genuinely live fixture (the
// same live-buyer-deposit gap tracked for the tiered engine); this script proves the other real
// claim instead: that settle_geo_product's CPI into validate_stat_v2 actually works against
// real on-chain data, with real SOL reserved against the shared pool.
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import * as fs from "fs";

const PROOF_PATH = __dirname + "/../tests/fixtures/real-devnet-proof-v2.json";
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

  console.log("fund_pool 0.05 SOL (top-up, shared with the tiered engine's products)...");
  let sig = await program.methods
    .fundPool(new BN(50_000_000))
    .accounts({ writerPool, poolVault, writer: writer.publicKey } as any)
    .rpc();
  console.log("  ", sig);

  const proof = JSON.parse(fs.readFileSync(PROOF_PATH, "utf8"));
  const fixtureId = new BN(proof.summary.fixtureId);
  const nonce = Math.floor(Date.now() / 1000) % 1_000_000;

  // Real proven values: statsToProve[0] (key=1, "home goals") = 3, statsToProve[1] (key=2,
  // "away goals") = 0. Predict exactly that scoreline: distance must equal 0 for a win.
  const statKeyA = proof.statsToProve[0].key;
  const statKeyB = proof.statsToProve[1].key;
  const predictionA = proof.statsToProve[0].value;
  const predictionB = proof.statsToProve[1].value;

  const [geoProduct] = PublicKey.findProgramAddressSync(
    [Buffer.from("geo_product"), fixtureId.toArrayLike(Buffer, "le", 8), new BN(nonce).toArrayLike(Buffer, "le", 4)],
    program.programId
  );
  const closesAt = new BN(Math.floor(proof.summary.updateStats.minTimestamp / 1000) - 5);
  const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 1800);
  const capacity = new BN(4_000_000);
  const payoutBpsIfTrue = 30000; // 3x for correctly calling the exact scoreline

  console.log(`create_geo_product: predict ${statKeyA}=${predictionA}, ${statKeyB}=${predictionB} (exact scoreline)...`);
  sig = await program.methods
    .createGeoProduct(
      fixtureId, nonce, statKeyA, statKeyB, predictionA, predictionB,
      0, { equalTo: {} }, payoutBpsIfTrue, closesAt, settleDeadline, capacity
    )
    .accounts({ geoProduct, writerPool, poolVault, payer: writer.publicKey } as any)
    .rpc();
  console.log("  ", sig);

  const epochDay = Math.floor(proof.summary.updateStats.minTimestamp / 86400000);
  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    TXORACLE_PROGRAM_ID
  );

  const stats = [
    { stat: proof.statsToProve[0], statProof: proof.statProofs[0] },
    { stat: proof.statsToProve[1], statProof: proof.statProofs[1] },
  ];

  console.log("settle_geo_product (real CPI into validate_stat_v2, geometric distance predicate)...");
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
  sig = await program.methods
    .settleGeoProduct(
      new BN(proof.summary.updateStats.minTimestamp),
      {
        fixtureId,
        updateStats: {
          updateCount: proof.summary.updateStats.updateCount,
          minTimestamp: new BN(proof.summary.updateStats.minTimestamp),
          maxTimestamp: new BN(proof.summary.updateStats.maxTimestamp),
        },
        eventsSubTreeRoot: proof.summary.eventStatsSubTreeRoot,
      } as any,
      proof.subTreeProof,
      proof.mainTreeProof,
      proof.eventStatRoot,
      stats as any
    )
    .accounts({ geoProduct, writerPool, config: configPda, txoracleProgram: TXORACLE_PROGRAM_ID, dailyScoresMerkleRoots: dailyScoresPda } as any)
    .preInstructions([computeBudgetIx])
    .rpc();
  console.log("  ", sig);

  const settled = await (program.account as any).geoProduct.fetch(geoProduct);
  const poolAfter = await (program.account as any).writerPool.fetch(writerPool);
  console.log("won:", settled.finalPayoutBps > 0, "final_payout_bps:", settled.finalPayoutBps);
  console.log(`pool after settling (no stake deposited, so owed stays 0): reserved=${poolAfter.reserved} owed=${poolAfter.owed}`);

  console.log("\nDONE — geometric exact-scoreline product settled for real, on devnet:");
  console.log("real CPI into TxLINE's validate_stat_v2, geometric distance predicate,");
  console.log("proving the exact scoreline 3-0 against real on-chain Merkle roots.");
  console.log("GeoProduct:", geoProduct.toBase58());
}

main().catch((e) => {
  console.error("FAILED:", e?.logs ?? e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
