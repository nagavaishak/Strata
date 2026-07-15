import "server-only";

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import axios, { AxiosInstance } from "axios";
import nacl from "tweetnacl";
import fs from "fs";
import os from "os";
import { EventSource } from "eventsource";
import txoracleIdl from "@/lib/idl/txoracle.json";
import { RPC_URL, TXORACLE_PROGRAM_ID } from "@/lib/constants";

// Ported from scripts/live-buyer-flow.ts / scripts/watch-stream.ts — the same
// subscribe -> guest-JWT -> API-token-activation dance, run once per server
// process instead of once per script invocation. The keypair used here NEVER
// leaves this module: routes call the exported functions below, never read
// process.env keypair material themselves.

const TXLINE_API_BASE = process.env.TXLINE_API_BASE ?? "https://txline-dev.txodds.com";
const SUBSCRIPTION_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");

// Turbopack can't statically resolve `anchor.Wallet` through @coral-xyz/anchor's
// CJS/ESM interop shim (it's assigned via a conditional `require`, not a static
// export), so we implement the same minimal interface AnchorProvider expects
// directly instead of importing it.
class KeypairWallet implements anchor.Wallet {
  constructor(readonly payer: Keypair) {}
  get publicKey() {
    return this.payer.publicKey;
  }
  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof VersionedTransaction) {
      tx.sign([this.payer]);
    } else {
      tx.partialSign(this.payer);
    }
    return tx;
  }
  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((tx) => this.signTransaction(tx)));
  }
}

function loadOracleKeypair(): Keypair {
  const json = process.env.ORACLE_KEYPAIR_JSON;
  if (json) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(json)));
  }
  const rawPath = process.env.ORACLE_KEYPAIR_PATH ?? "~/.config/solana/oracle-keypair.json";
  const path = rawPath.startsWith("~") ? rawPath.replace("~", os.homedir()) : rawPath;
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8")));
  return Keypair.fromSecretKey(secret);
}

interface TxlineSession {
  http: AxiosInstance;
  jwt: string;
  apiToken: string;
  keypair: Keypair;
}

let sessionPromise: Promise<TxlineSession> | null = null;

async function buildSession(): Promise<TxlineSession> {
  const keypair = loadOracleKeypair();
  const wallet = new KeypairWallet(keypair);
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const idl = { ...(txoracleIdl as anchor.Idl), address: TXORACLE_PROGRAM_ID.toBase58() };
  const txoracleProgram = new anchor.Program(idl, provider);

  const pricingMatrix = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    TXORACLE_PROGRAM_ID
  )[0];
  const tokenTreasuryPda = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    TXORACLE_PROGRAM_ID
  )[0];
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    SUBSCRIPTION_MINT,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID
  );
  const userTokenAccount = getAssociatedTokenAddressSync(
    SUBSCRIPTION_MINT,
    keypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  const createUserAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    keypair.publicKey,
    userTokenAccount,
    keypair.publicKey,
    SUBSCRIPTION_MINT,
    TOKEN_2022_PROGRAM_ID
  );

  const txSig: string = await txoracleProgram.methods
    .subscribe(1, 4)
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

  const jwt: string = (await axios.post(`${TXLINE_API_BASE}/auth/guest/start`, {})).data.token;
  const messageString = `${txSig}::${jwt}`;
  const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageString), keypair.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");
  const activation = await axios.post(
    `${TXLINE_API_BASE}/api/token/activate`,
    { txSig, walletSignature, leagues: [] },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );
  const apiToken = activation.data.token || activation.data;

  const http = axios.create({
    timeout: 30000,
    baseURL: TXLINE_API_BASE,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
  });

  return { http, jwt, apiToken, keypair };
}

/** Cached per server process — the subscribe/guest/activate dance runs once, not per request. */
export async function getTxlineSession(): Promise<TxlineSession> {
  if (!sessionPromise) {
    sessionPromise = buildSession().catch((err) => {
      sessionPromise = null; // allow retry on next call if this attempt failed
      throw err;
    });
  }
  return sessionPromise;
}

/** Ported from live-buyer-flow.ts's fetchLatestForFixture — single-stat proof fetch (V1). */
export async function fetchLatestForFixture(
  fixtureId: number,
  statKey: number,
  sinceMs?: number
): Promise<any | null> {
  const { http } = await getTxlineSession();
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
    const matches = list.filter((u) => (u.FixtureId ?? u.fixtureId ?? u.fixture_id) === fixtureId);
    if (!matches.length) continue;
    matches.sort((a, b) => (b.Seq ?? b.seq ?? 0) - (a.Seq ?? a.seq ?? 0));
    const seq = matches[0].Seq ?? matches[0].seq;
    try {
      const res = await http.get("/api/scores/stat-validation", { params: { fixtureId, seq, statKey } });
      const minTs = res.data?.summary?.updateStats?.minTimestamp;
      if (sinceMs != null && (minTs == null || minTs <= sinceMs)) continue;
      return res.data;
    } catch {
      continue;
    }
  }
  return null;
}

/** V2 multi-stat proof fetch — ported to the same bucket-scan pattern, statKeys=a,b query. */
export async function fetchLatestForFixtureV2(
  fixtureId: number,
  statKeys: number[],
  sinceMs?: number
): Promise<any | null> {
  const { http } = await getTxlineSession();
  const statKeysParam = statKeys.join(",");
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
    const matches = list.filter((u) => (u.FixtureId ?? u.fixtureId ?? u.fixture_id) === fixtureId);
    if (!matches.length) continue;
    matches.sort((a, b) => (b.Seq ?? b.seq ?? 0) - (a.Seq ?? a.seq ?? 0));
    const seq = matches[0].Seq ?? matches[0].seq;
    try {
      const res = await http.get("/api/scores/stat-validation", {
        params: { fixtureId, seq, statKeys: statKeysParam },
      });
      const minTs = res.data?.summary?.updateStats?.minTimestamp;
      if (sinceMs != null && (minTs == null || minTs <= sinceMs)) continue;
      return res.data;
    } catch {
      continue;
    }
  }
  return null;
}

// ---------- fixture metadata: live team-name/competition lookup ----------

export interface FixtureMetadata {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  startTime: number;
}

const SECONDS_PER_DAY = 86400;
const METADATA_WINDOWS_BACK = 6; // ~6 months of 30-day windows

/** TxLINE's /api/fixtures/snapshot has no direct by-fixtureId query — it returns
 * every fixture starting at-or-within-30-days-after a given epoch day. Steps
 * backward through a handful of non-overlapping 30-day windows (covering
 * roughly the last 6 months) until the fixture turns up, since this app only
 * ever needs metadata for fixtures it has actually traded against. Used as a
 * live supplement to fixture-identity.ts's static, manually-verified list —
 * that list still wins when both exist, since it's already confirmed. */
export async function getFixtureMetadata(fixtureId: number): Promise<FixtureMetadata | null> {
  const { http } = await getTxlineSession();
  const today = Math.floor(Date.now() / 1000 / SECONDS_PER_DAY);

  for (let windowsBack = 0; windowsBack < METADATA_WINDOWS_BACK; windowsBack++) {
    const startEpochDay = today - windowsBack * 30;
    try {
      const res = await http.get("/api/fixtures/snapshot", { params: { startEpochDay } });
      const list: any[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      const match = list.find((f) => (f.FixtureId ?? f.fixtureId) === fixtureId);
      if (match) {
        return {
          homeTeam: match.Participant1 ?? match.participant1,
          awayTeam: match.Participant2 ?? match.participant2,
          competition: match.Competition ?? match.competition,
          startTime: match.StartTime ?? match.startTime,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ---------- live stream: one shared upstream connection, polled by many clients ----------

interface FixtureStreamState {
  gameState: string;
  statsCount: number;
  lastSeq: number;
  updatedAt: number;
}

const streamState = new Map<number, FixtureStreamState>();
let streamStarted = false;

async function startStreamListenerOnce() {
  if (streamStarted) return;
  streamStarted = true;

  const { jwt, apiToken } = await getTxlineSession();
  const url = `${TXLINE_API_BASE}/api/scores/stream`;

  const connect = () => {
    const es = new EventSource(url, {
      fetch: (input: string | URL | Request, init?: RequestInit) =>
        fetch(input, {
          ...init,
          headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken },
        }),
    } as any);

    es.onmessage = (ev: any) => {
      try {
        const data = JSON.parse(ev.data);
        const fixtureId = data.FixtureId;
        const statsCount = data.Stats ? Object.keys(data.Stats).length : 0;
        streamState.set(fixtureId, {
          gameState: data.GameState,
          statsCount,
          lastSeq: data.Seq,
          updatedAt: Date.now(),
        });
      } catch {
        // ignore unparseable events (heartbeats etc. handled by the listener below)
      }
    };
    es.onerror = () => {
      es.close();
      setTimeout(connect, 3000);
    };
  };

  connect();
}

/** Called by the stream-status route — starts the shared listener lazily on first use. */
export async function getFixtureStreamStatus(fixtureId: number) {
  await startStreamListenerOnce();
  const state = streamState.get(fixtureId);
  if (!state) return { live: false as const };
  return { live: true as const, ...state };
}
