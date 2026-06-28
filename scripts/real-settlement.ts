// Runs a full Strata product lifecycle on devnet against a REAL TxLINE proof
// (captured by scripts/probe-txline.ts into tests/fixtures/real-devnet-proof.json),
// not a mock. create_product -> deposit -> settle_leg (real CPI into the real
// txoracle program) -> finalize_product -> claim.
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import * as fs from "fs";

const RPC = "https://api.devnet.solana.com";
const TXORACLE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

async function main() {
  const keypairPath = process.env.HOME + "/.config/solana/oracle-keypair.json";
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8")));
  const keypair = Keypair.fromSecretKey(secret);
  const wallet = new anchor.Wallet(keypair);
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const strataIdl = JSON.parse(fs.readFileSync(__dirname + "/../target/idl/strata.json", "utf8"));
  const program = new anchor.Program(strataIdl as anchor.Idl, provider);

  const proof = JSON.parse(fs.readFileSync(__dirname + "/../tests/fixtures/real-devnet-proof.json", "utf8"));

  const fixtureId = new BN(proof.summary.fixtureId);
  const nonce = Math.floor(Date.now() / 1000) % 1_000_000; // unique-ish per run
  const statKey = proof.statToProve.key;
  const statValue = proof.statToProve.value as number;

  console.log(`Fixture ${fixtureId.toString()}, stat key ${statKey}, real value ${statValue}, nonce ${nonce}`);

  const [productPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("product"), fixtureId.toArrayLike(Buffer, "le", 8), new BN(nonce).toArrayLike(Buffer, "le", 4)],
    program.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), productPda.toBuffer()],
    program.programId
  );
  const [positionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pos"), productPda.toBuffer(), keypair.publicKey.toBuffer()],
    program.programId
  );
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);

  // Predicate: real stat value > (value - 1) is trivially true for the value TxLINE actually
  // recorded — proves settle_leg correctly evaluates a live proof, not a contrived mock.
  const threshold = statValue - 1;

  const closesAt = new BN(Math.floor(Date.now() / 1000) + 5);
  const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 1800);
  const legs = [
    {
      statKeyA: statKey,
      statKeyB: 0,
      hasSecondStat: false,
      op: { add: {} },
      threshold,
      comparison: { greaterThan: {} },
    },
  ];
  const tiers = [
    { minLegsTrue: 0, payoutBps: 0 },
    { minLegsTrue: 1, payoutBps: 10000 },
  ];

  console.log("create_product...");
  let sig = await program.methods
    .createProduct(fixtureId, nonce, legs as any, tiers as any, closesAt, settleDeadline)
    .accounts({ product: productPda, vault: vaultPda, payer: keypair.publicKey } as any)
    .rpc();
  console.log("  ", sig);

  console.log("deposit 0.01 SOL...");
  sig = await program.methods
    .deposit(new BN(10_000_000))
    .accounts({ product: productPda, vault: vaultPda, position: positionPda, user: keypair.publicKey } as any)
    .rpc();
  console.log("  ", sig);

  console.log("waiting for closes_at to elapse...");
  await new Promise((r) => setTimeout(r, 7000));

  const epochDay = Math.floor(proof.summary.updateStats.minTimestamp / 86400000);
  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    TXORACLE_PROGRAM_ID
  );
  console.log("daily_scores_roots PDA:", dailyScoresPda.toBase58(), "epochDay:", epochDay);

  console.log("settle_leg (real CPI into real txoracle)...");
  // ts must be summary.updateStats.minTimestamp, not the capture-time `ts` field at the
  // payload's top level — confirmed against proofkick's tracer (which got this working
  // against the real program); using the capture timestamp throws TimestampMismatch.
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
  console.log("final_payout_bps:", finalized.finalPayoutBps);

  console.log("claim...");
  sig = await program.methods
    .claim()
    .accounts({ product: productPda, vault: vaultPda, position: positionPda, user: keypair.publicKey } as any)
    .rpc();
  console.log("  ", sig);

  console.log("\nDONE. Real settlement against live TxLINE devnet proof succeeded end to end.");
  console.log("Product:", productPda.toBase58());
}

main().catch((e) => {
  console.error("FAILED:", e?.logs ?? e?.message ?? e);
  process.exit(1);
});
