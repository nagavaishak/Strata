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

  console.log(`Fetching stat-validation for fixture=${FIXTURE_ID} seq=${SEQ} statKey=${STAT_KEY}...`);
  const res = await http.get("/api/scores/stat-validation", {
    params: { fixtureId: FIXTURE_ID, seq: SEQ, statKey: STAT_KEY },
  });

  console.log(JSON.stringify(res.data, null, 2));
  fs.writeFileSync(__dirname + "/../tests/fixtures/real-devnet-proof.json", JSON.stringify(res.data, null, 2));
  console.log("\nSaved to tests/fixtures/real-devnet-proof.json");
}

main().catch((e) => {
  console.error("FAILED:", e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
