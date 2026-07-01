// End-to-end real buyer-deposit flow against a genuinely live World Cup fixture, on devnet,
// with real (test) SOL. This is the one piece every other script in this repo stopped short
// of: deposit -> wait for a real post-close sealed batch -> settle_leg -> finalize -> claim,
// all against data that did not exist yet when the deposit was made.
//
// Uses a dedicated, lightly-funded "automation" keypair as the writer (not the main
// oracle-keypair), so this can run unattended against a live match without the main wallet's
// key ever leaving the machine it was generated on.
//
// Usage: ts-node -P tsconfig.json scripts/live-buyer-flow.ts <fixtureId>
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import axios from "axios";
import nacl from "tweetnacl";
import * as fs from "fs";

const API = "https://txline-dev.txodds.com";
const RPC = "https://api.devnet.solana.com";
const TXORACLE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

// Forward-looking predicate chosen BEFORE we know the outcome: "stat 1002 total > 0"
// (at least one qualifying event recorded for the fixture). Genuinely unknown at
// product-creation/deposit time, unlike earlier scripts that reverse-engineered a
// threshold from an already-fetched value.
const STAT_KEY = 1002;
const THRESHOLD = 0;

const FIXTURE_ID = Number(process.argv[2]);
if (!FIXTURE_ID) {
  console.error("usage: live-buyer-flow.ts <fixtureId>");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function authedHttp(keypair: Keypair) {
  const jwt: string = (await axios.post(`${API}/auth/guest/start`, {})).data.token;
  // Any prior on-chain tx sig works as the message being signed for guest activation;
  // reuse a cheap one (system transfer of 0 to self would also work, but we already
  // have a funded key so just sign the JWT directly as the "txSig" slot is optional
  // on some deployments — fall back to a placeholder if activation requires a real sig).
  const messageString = `noop::${jwt}`;
  const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageString), keypair.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");
  let apiToken: string;
  try {
    const activation = await axios.post(
      `${API}/api/token/activate`,
      { txSig: "noop", walletSignature, leagues: [] },
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    apiToken = activation.data.token || activation.data;
  } catch {
    apiToken = jwt; // some endpoints accept the guest JWT alone for read-only score queries
  }
  return axios.create({
    timeout: 30000,
    baseURL: API,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  });
}

async function fetchLatestForFixture(http: any, fixtureId: number, statKey: number, sinceMs?: number): Promise<any | null> {
  for (let back = 1; back <= 24; back++) {
    const t = new Date(Date.now() - back * 5 * 60 * 1000);
    const epochDay = Math.floor(t.getTime() / 86400000);
    const hour = t.getUTCHours();
    const interval = Math.floor(t.getUTCMinutes() / 5);
    let updates: any;
    try {
      updates = (await http.get(`/api/scores/updates/${epochDay}/${hour}/${interval}`)).data;
    } catch {
      continue;
    }
    const list: any[] = Array.isArray(updates) ? updates : updates?.updates ?? updates?.data ?? [];
    const match = list.find((u) => (u.fixtureId ?? u.fixture_id ?? u.fixtureID) === fixtureId);
    if (!match) continue;
    const seq = match.seq ?? match.sequence ?? match.seqNo;
    try {
      const res = await http.get("/api/scores/stat-validation", { params: { fixtureId, seq, statKey } });
      const minTs = res.data?.summary?.updateStats?.minTimestamp;
      if (sinceMs != null && (minTs == null || minTs <= sinceMs)) continue;
      console.log(`  found batch: fixture=${fixtureId} seq=${seq} minTimestamp=${minTs}`);
      return res.data;
    } catch {
      continue;
    }
  }
  return null;
}

async function main() {
  const automationKeypairPath = process.env.AUTOMATION_KEYPAIR ?? process.env.HOME + "/.config/solana/automation-keypair.json";
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(automationKeypairPath, "utf8")));
  const writer = Keypair.fromSecretKey(secret);
  const wallet = new anchor.Wallet(writer);
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const strataIdl = JSON.parse(fs.readFileSync(__dirname + "/../target/idl/strata.json", "utf8"));
  const program = new anchor.Program(strataIdl as anchor.Idl, provider);

  console.log("writer (automation key):", writer.publicKey.toBase58());
  const balance = await connection.getBalance(writer.publicKey);
  console.log("balance:", balance / 1e9, "SOL");

  const [writerPool] = PublicKey.findProgramAddressSync([Buffer.from("writer_pool"), writer.publicKey.toBuffer()], program.programId);
  const [poolVault] = PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), writer.publicKey.toBuffer()], program.programId);

  const poolInfo = await connection.getAccountInfo(writerPool);
  if (!poolInfo) {
    console.log("initialize_writer_pool...");
    const sig = await program.methods.initializeWriterPool().accounts({ writerPool, poolVault, writer: writer.publicKey } as any).rpc();
    console.log("  ", sig);
  }
  console.log("fund_pool 0.05 SOL...");
  let sig = await program.methods.fundPool(new BN(50_000_000)).accounts({ writerPool, poolVault, writer: writer.publicKey } as any).rpc();
  console.log("  ", sig);

  const http = await authedHttp(writer);

  // 1. Wait for the fixture to actually be live/producing data.
  console.log(`Waiting for fixture ${FIXTURE_ID} to start producing data...`);
  let anyBatch: any = null;
  for (let i = 0; i < 60 && !anyBatch; i++) {
    anyBatch = await fetchLatestForFixture(http, FIXTURE_ID, STAT_KEY);
    if (!anyBatch) {
      console.log(`  not live yet, retry ${i + 1}/60 (60s interval)`);
      await sleep(60_000);
    }
  }
  if (!anyBatch) throw new Error("fixture never produced data in the wait window");
  console.log("fixture is live.");

  // 2. Create product + deposit, closing in a few seconds — before we know any future data.
  const nonce = Math.floor(Date.now() / 1000) % 1_000_000;
  const [product] = PublicKey.findProgramAddressSync(
    [Buffer.from("product"), new BN(FIXTURE_ID).toArrayLike(Buffer, "le", 8), new BN(nonce).toArrayLike(Buffer, "le", 4)],
    program.programId
  );
  const now = Math.floor(Date.now() / 1000);
  const closesAt = new BN(now + 15);
  const settleDeadline = new BN(now + 1800);
  const legs = [
    { statKeyA: STAT_KEY, statKeyB: 0, hasSecondStat: false, op: { add: {} }, threshold: THRESHOLD, comparison: { greaterThan: {} } },
  ];
  const capacity = new BN(5_000_000);
  const tiers = [{ minLegsTrue: 0, payoutBps: 0 }, { minLegsTrue: 1, payoutBps: 15000 }];

  console.log("create_product (closes_at =", closesAt.toString(), ")...");
  sig = await program.methods
    .createProduct(new BN(FIXTURE_ID), nonce, legs as any, tiers as any, closesAt, settleDeadline, capacity)
    .accounts({ product, writerPool, poolVault, payer: writer.publicKey } as any)
    .rpc();
  console.log("  ", sig);

  const [position] = PublicKey.findProgramAddressSync(
    [Buffer.from("pos"), product.toBuffer(), writer.publicKey.toBuffer()],
    program.programId
  );
  console.log("deposit 1,000,000 lamports as buyer (same key acting as buyer for this demo)...");
  sig = await program.methods
    .deposit(new BN(1_000_000))
    .accounts({ product, position, poolVault, user: writer.publicKey } as any)
    .rpc();
  console.log("  ", sig);
  console.log(`deposit locked in BEFORE any post-close data exists. Waiting for closes_at (${closesAt.toString()})...`);

  const waitMs = closesAt.toNumber() * 1000 - Date.now();
  if (waitMs > 0) await sleep(waitMs + 2000);

  // 3. Poll for a batch that genuinely postdates closes_at — this can take several
  // TxLINE batch cycles (~5 min each), so give it a long window.
  console.log("Polling for a fresh sealed batch with minTimestamp > closes_at...");
  const closesAtMs = closesAt.toNumber() * 1000;
  let proof: any = null;
  for (let i = 0; i < 30 && !proof; i++) {
    proof = await fetchLatestForFixture(http, FIXTURE_ID, STAT_KEY, closesAtMs);
    if (!proof) {
      console.log(`  no fresh-enough batch yet, retry ${i + 1}/30 (60s interval)`);
      await sleep(60_000);
    }
  }
  if (!proof) throw new Error("never got a batch sealed after closes_at within the wait window");
  fs.writeFileSync(__dirname + "/../tests/fixtures/live-buyer-flow-proof.json", JSON.stringify(proof, null, 2));
  console.log("got proof with minTimestamp", proof.summary.updateStats.minTimestamp, "( closes_at ms =", closesAtMs, ")");

  // 4. settle_leg (real CPI), finalize, claim.
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const epochDay = Math.floor(proof.summary.updateStats.minTimestamp / 86400000);
  const [dailyScoresPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), new BN(epochDay).toArrayLike(Buffer, "le", 2)],
    TXORACLE_PROGRAM_ID
  );

  console.log("settle_leg (real CPI into the real txoracle program)...");
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
  sig = await program.methods
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

  console.log("\nDONE — full live buyer-deposit flow completed for real, on devnet:");
  console.log("deposit made before data existed -> real batch sealed after close ->");
  console.log("real CPI settle -> finalize -> claim.");
  console.log("Product:", product.toBase58(), "Writer pool:", writerPool.toBase58());
}

main().catch((e) => {
  console.error("FAILED:", e?.logs ?? e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
