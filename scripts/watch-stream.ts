// Connects directly to TxLINE's real-time SSE scores stream (devnet) and watches for
// genuinely live events, rather than polling historical/replay snapshots. Confirmed via
// TxLINE's own Telegram support: the stream is the correct way to find a live match, the
// /api/scores/historical/{fixtureId} and /api/scores/updates/{epochDay}/{hour}/{interval}
// endpoints we'd been using are for replay/historical browsing, not live discovery.
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
import { EventSource } from "eventsource";

const API = "https://txline-dev.txodds.com";
const RPC = "https://api.devnet.solana.com";
const TXORACLE_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const SUBSCRIPTION_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");
const WATCH_SECONDS = Number(process.argv[2] ?? 90);

async function main() {
  const keypairPath = process.env.HOME + "/.config/solana/oracle-keypair.json";
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8")));
  const keypair = Keypair.fromSecretKey(secret);
  const wallet = new anchor.Wallet(keypair);
  const connection = new Connection(RPC, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const txoracleIdl = JSON.parse(fs.readFileSync(__dirname + "/../idls/txoracle.json", "utf8"));
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
    .subscribe(1, 4)
    .preInstructions([createUserAtaIx])
    .accounts({
      user: keypair.publicKey, pricingMatrix, tokenMint: SUBSCRIPTION_MINT, userTokenAccount,
      tokenTreasuryVault, tokenTreasuryPda, tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    } as any)
    .rpc();
  console.log("subscribed:", txSig);

  const jwt: string = (await axios.post(`${API}/auth/guest/start`, {})).data.token;
  const messageString = `${txSig}::${jwt}`;
  const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageString), keypair.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");
  const activation = await axios.post(
    `${API}/api/token/activate`,
    { txSig, walletSignature, leagues: [] },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
  const apiToken = activation.data.token || activation.data;
  console.log("API token activated. Connecting to live SSE stream for", WATCH_SECONDS, "seconds...\n");

  const url = `${API}/api/scores/stream`;
  const es = new EventSource(url, {
    fetch: (input, init) =>
      fetch(input, {
        ...init,
        headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
      }),
  } as any);

  const seenFixtures = new Map<number, { gameState: string; statsCount: number; lastSeq: number }>();

  es.onmessage = (ev: any) => {
    try {
      const data = JSON.parse(ev.data);
      const fixtureId = data.FixtureId;
      const statsCount = data.Stats ? Object.keys(data.Stats).length : 0;
      seenFixtures.set(fixtureId, { gameState: data.GameState, statsCount, lastSeq: data.Seq });
      console.log(`[event] fixture=${fixtureId} seq=${data.Seq} state=${data.GameState} statsCount=${statsCount}`);
    } catch (e) {
      console.log("[event] (unparsed)", String(ev.data).slice(0, 200));
    }
  };
  es.onerror = (e: any) => console.log("[stream error]", e?.message ?? e);
  es.onopen = () => console.log("[stream opened]");
  es.addEventListener("heartbeat", (ev: any) => console.log("[heartbeat]", ev.data));

  await new Promise((r) => setTimeout(r, WATCH_SECONDS * 1000));
  es.close();

  console.log("\n=== Summary after", WATCH_SECONDS, "seconds ===");
  if (seenFixtures.size === 0) {
    console.log("No events received at all — stream connected but silent for the watch window.");
  }
  for (const [fixtureId, info] of seenFixtures) {
    console.log(`fixture=${fixtureId} state=${info.gameState} lastSeq=${info.lastSeq} statsCount=${info.statsCount}`);
  }
}

main().catch((e) => {
  console.error("FAILED:", e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
