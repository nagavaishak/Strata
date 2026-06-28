// Diagnostic: subscribe (free tier) + guest-auth + fetch a real stat-validation
// payload from TxLINE devnet, for a fixture/seq/statKey already confirmed working
// by another team's public submission. Doesn't touch the Strata program at all —
// just confirms we can pull a real proof before wiring it into settle_leg.
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import axios from "axios";
import nacl from "tweetnacl";
import * as fs from "fs";

const API = "https://txline-dev.txodds.com";
const RPC = "https://api.devnet.solana.com";
const TXORACLE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const SUBSCRIPTION_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");
const SERVICE_LEVEL_ID = 1; // free tier
const DURATION_WEEKS = 4;

const FIXTURE_ID = 17952170;
const SEQ = 941;
const STAT_KEY = 1002;

async function main() {
  const keypairPath = process.env.HOME + "/.config/solana/oracle-keypair.json";
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8")));
  const keypair = Keypair.fromSecretKey(secret);
  const wallet = new anchor.Wallet(keypair);
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const txoracleIdl = JSON.parse(
    fs.readFileSync(__dirname + "/../idls/txoracle.json", "utf8")
  );
  // The committed IDL's embedded address is TxLINE's mainnet program id —
  // override it so the client targets devnet instead.
  txoracleIdl.address = TXORACLE_PROGRAM_ID.toBase58();
  const txoracleProgram = new anchor.Program(txoracleIdl as anchor.Idl, provider);

  const pricingMatrix = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], TXORACLE_PROGRAM_ID)[0];
  const tokenTreasuryPda = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], TXORACLE_PROGRAM_ID)[0];
  const tokenTreasuryVault = getAssociatedTokenAddressSync(SUBSCRIPTION_MINT, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);
  const userTokenAccount = getAssociatedTokenAddressSync(SUBSCRIPTION_MINT, keypair.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const createUserAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    keypair.publicKey, userTokenAccount, keypair.publicKey, SUBSCRIPTION_MINT, TOKEN_2022_PROGRAM_ID
  );

  console.log("Subscribing (free tier, devnet)...");
  const txSig: string = await txoracleProgram.methods
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .preInstructions([createUserAtaIx])
    .accounts({
      user: keypair.publicKey,
      pricingMatrix,
      tokenMint: SUBSCRIPTION_MINT,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    } as any)
    .rpc();
  console.log("subscribed:", txSig);

  console.log("Getting guest JWT...");
  const jwt: string = (await axios.post(`${API}/auth/guest/start`, {})).data.token;

  const messageString = `${txSig}::${jwt}`;
  const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageString), keypair.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  console.log("Activating API token...");
  const activation = await axios.post(
    `${API}/api/token/activate`,
    { txSig, walletSignature, leagues: [] },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
  const apiToken = activation.data.token || activation.data;
  console.log("activated.");

  const http = axios.create({
    timeout: 30000,
    baseURL: API,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  });

  const discover = process.argv.includes("--discover");
  let data: any;

  if (!discover) {
    console.log(`Fetching stat-validation for fixture=${FIXTURE_ID} seq=${SEQ} statKey=${STAT_KEY}...`);
    const res = await http.get("/api/scores/stat-validation", {
      params: { fixtureId: FIXTURE_ID, seq: SEQ, statKey: STAT_KEY },
    });
    data = res.data;
  } else {
    // The documented example (FIXTURE_ID/SEQ/STAT_KEY above) is static historical data —
    // its minTimestamp never changes between calls. That's fine for a one-off smoke test,
    // but incompatible with settle_leg's anti-sniping check in a real deposit-then-settle
    // flow, since deposits require closes_at in the future while settling requires the
    // batch to postdate it — a frozen-in-the-past batch can never satisfy both. Find a
    // genuinely live fixture instead, the way proofkick's tracer does: scan recent score
    // updates (accounting for TxLINE's ~60s publish delay) and use whatever's actually
    // active right now.
    const pinFixtureArg = process.argv.find((a) => a.startsWith("--pinFixture="));
    const pinStatKeyArg = process.argv.find((a) => a.startsWith("--pinStatKey="));
    const pinFixture = pinFixtureArg ? Number(pinFixtureArg.split("=")[1]) : undefined;
    const pinStatKey = pinStatKeyArg ? Number(pinStatKeyArg.split("=")[1]) : undefined;

    if (pinFixture != null) {
      console.log(`Fetching the freshest available batch for pinned fixture=${pinFixture} statKey=${pinStatKey}...`);
      data = await fetchLatestForFixture(http, pinFixture, pinStatKey!);
      if (!data) throw new Error(`could not find a fresher batch for pinned fixture=${pinFixture} statKey=${pinStatKey}`);
    } else {
      console.log("Discovering a live fixture from recent score updates...");
      data = await discoverLiveValidation(http);
      if (!data) throw new Error("could not discover a live fixture/seq/statKey with a valid proof");
    }
  }

  console.log(JSON.stringify(data, null, 2));
  fs.writeFileSync(__dirname + "/../tests/fixtures/real-devnet-proof.json", JSON.stringify(data, null, 2));
  console.log("\nSaved to tests/fixtures/real-devnet-proof.json");
}

// Used for the second probe in a deposit-then-settle flow: must return data for the SAME
// fixture/stat the product was created with (settle_leg checks fixture_id and stat key
// match), just whatever the freshest available seq is for that pair — not a fresh
// discovery, which could surface an entirely different live fixture.
async function fetchLatestForFixture(http: any, fixtureId: number, statKey: number): Promise<any | null> {
  for (let back = 1; back <= 12; back++) {
    const t = new Date(Date.now() - back * 5 * 60 * 1000);
    const epochDay = Math.floor(t.getTime() / 86400000);
    const hour = t.getUTCHours();
    const interval = Math.floor(t.getUTCMinutes() / 5);

    let updates: any;
    try {
      updates = (await http.get(`/api/scores/updates/${epochDay}/${hour}/${interval}`)).data;
    } catch (e: any) {
      console.log(`  updates ${epochDay}/${hour}/${interval}: ${e.response?.status ?? e.message}`);
      continue;
    }
    const list: any[] = Array.isArray(updates) ? updates : updates?.updates ?? updates?.data ?? [];
    const match = list.find((u) => (u.fixtureId ?? u.fixture_id ?? u.fixtureID) === fixtureId);
    if (!match) continue;

    const seq = match.seq ?? match.sequence ?? match.seqNo;
    try {
      const res = await http.get("/api/scores/stat-validation", { params: { fixtureId, seq, statKey } });
      console.log(`  found fresher batch: fixture=${fixtureId} seq=${seq} statKey=${statKey}`);
      return res.data;
    } catch (e: any) {
      console.log(`  stat-validation failed for fixture=${fixtureId} seq=${seq}: ${e.response?.status ?? e.message}`);
    }
  }
  return null;
}

async function discoverLiveValidation(http: any): Promise<any | null> {
  for (let back = 1; back <= 12; back++) {
    const t = new Date(Date.now() - back * 5 * 60 * 1000);
    const epochDay = Math.floor(t.getTime() / 86400000);
    const hour = t.getUTCHours();
    const interval = Math.floor(t.getUTCMinutes() / 5);

    let updates: any;
    try {
      updates = (await http.get(`/api/scores/updates/${epochDay}/${hour}/${interval}`)).data;
    } catch (e: any) {
      console.log(`  updates ${epochDay}/${hour}/${interval}: ${e.response?.status ?? e.message}`);
      continue;
    }
    const list: any[] = Array.isArray(updates) ? updates : updates?.updates ?? updates?.data ?? [];
    console.log(`  updates ${epochDay}/${hour}/${interval}: ${list.length} entries`);
    if (!list.length) continue;

    for (const u of list.slice(0, 5)) {
      const fixtureId = u.fixtureId ?? u.fixture_id ?? u.fixtureID;
      const seq = u.seq ?? u.sequence ?? u.seqNo;
      const statKey = u.statKey ?? u.key ?? u.stat_key ?? STAT_KEY;
      if (fixtureId == null || seq == null) continue;
      try {
        const res = await http.get("/api/scores/stat-validation", { params: { fixtureId, seq, statKey } });
        console.log(`  found live proof: fixture=${fixtureId} seq=${seq} statKey=${statKey}`);
        return res.data;
      } catch (e: any) {
        console.log(`  stat-validation failed for fixture=${fixtureId} seq=${seq}: ${e.response?.status ?? e.message}`);
      }
    }
  }
  return null;
}

main().catch((e) => {
  console.error("FAILED:", e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
