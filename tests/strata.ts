import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Strata } from "../target/types/strata";
import { MockTxoracle } from "../target/types/mock_txoracle";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("strata", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.Strata as Program<Strata>;

  const fixtureId = new BN(123456);
  const nonce = 1;

  const [productPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("product"),
      fixtureId.toArrayLike(Buffer, "le", 8),
      new anchor.BN(nonce).toArrayLike(Buffer, "le", 4),
    ],
    program.programId
  );

  it("creates a product with a valid tiered payout table", async () => {
    const closesAt = new BN(Math.floor(Date.now() / 1000) - 10); // already closed, for settle tests
    const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);

    const legs = [
      {
        statKeyA: 1001,
        statKeyB: 0,
        hasSecondStat: false,
        op: { add: {} },
        threshold: 2,
        comparison: { greaterThan: {} },
      },
    ];
    const tiers = [
      { minLegsTrue: 0, payoutBps: 0 },
      { minLegsTrue: 1, payoutBps: 10000 },
    ];

    await program.methods
      .createProduct(fixtureId, nonce, legs as any, tiers as any, closesAt, settleDeadline)
      .rpc();

    const product = await program.account.product.fetch(productPda);
    assert.equal(product.numLegs, 1);
    assert.equal(product.numTiers, 2);
    assert.equal(product.status.open !== undefined, true);
  });

  it("rejects a non-monotonic tier table", async () => {
    const badFixtureId = new BN(999999);
    const closesAt = new BN(Math.floor(Date.now() / 1000) + 60);
    const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);
    const legs = [
      {
        statKeyA: 1001,
        statKeyB: 0,
        hasSecondStat: false,
        op: { add: {} },
        threshold: 2,
        comparison: { greaterThan: {} },
      },
    ];
    const badTiers = [
      { minLegsTrue: 0, payoutBps: 5000 },
      { minLegsTrue: 1, payoutBps: 1000 }, // decreasing payout -> should fail
    ];

    let threw = false;
    try {
      await program.methods
        .createProduct(badFixtureId, 2, legs as any, badTiers as any, closesAt, settleDeadline)
        .rpc();
    } catch (e) {
      threw = true;
    }
    assert.isTrue(threw, "expected non-monotonic tier table to be rejected");
  });

  describe("full lifecycle against mock-txoracle", () => {
    const mockProgram = anchor.workspace.MockTxoracle as Program<MockTxoracle>;
    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    const lifecycleFixtureId = new BN(777);
    const lifecycleNonce = 9;
    const [lifecycleProductPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("product"),
        lifecycleFixtureId.toArrayLike(Buffer, "le", 8),
        new anchor.BN(lifecycleNonce).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );
    const [lifecycleVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), lifecycleProductPda.toBuffer()],
      program.programId
    );
    const user = Keypair.generate();
    const dailyScoresRoots = Keypair.generate();
    const [positionPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pos"), lifecycleProductPda.toBuffer(), user.publicKey.toBuffer()],
      program.programId
    );

    const zeroRoot = new Array(32).fill(0);
    const emptyStatTerm = (key: number, value: number) => ({
      statToProve: { key, value, period: 0 },
      eventStatRoot: zeroRoot,
      statProof: [],
    });

    it("sets up config pointing at the mock oracle and a fake daily_scores account", async () => {
      await program.methods
        .initializeConfig(mockProgram.programId)
        .accounts({ config: configPda, authority: provider.wallet.publicKey } as any)
        .rpc();

      // Fund with the rent-exempt minimum first — a zero-lamport account is garbage
      // collected at the end of the transaction, which would silently undo the assign.
      const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(0);
      const assignTx = new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: provider.wallet.publicKey,
          toPubkey: dailyScoresRoots.publicKey,
          lamports: rentExempt,
        }),
        SystemProgram.assign({
          accountPubkey: dailyScoresRoots.publicKey,
          programId: mockProgram.programId,
        })
      );
      await provider.sendAndConfirm(assignTx, [dailyScoresRoots]);

      const info = await provider.connection.getAccountInfo(dailyScoresRoots.publicKey);
      assert.isNotNull(info, "daily_scores_merkle_roots account should exist after assign");
      assert.equal(info!.owner.toBase58(), mockProgram.programId.toBase58(), "assign should have set owner to mock program");

      const config = await program.account.config.fetch(configPda);
      assert.equal(config.txoracleProgramId.toBase58(), mockProgram.programId.toBase58());
    });

    it("runs create_product -> deposit -> settle_leg -> finalize_product -> claim end to end", async () => {
      // Needs to be in the future at create/deposit time (deposit requires now < closesAt)
      // but elapsed by the time settle_leg runs (settle_leg requires now >= closesAt).
      const closesAt = new BN(Math.floor(Date.now() / 1000) + 3);
      const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);
      const legs = [
        {
          statKeyA: 1001,
          statKeyB: 0,
          hasSecondStat: false,
          op: { add: {} },
          threshold: 2,
          comparison: { greaterThan: {} },
        },
      ];
      const tiers = [
        { minLegsTrue: 0, payoutBps: 0 },
        { minLegsTrue: 1, payoutBps: 10000 },
      ];

      await program.methods
        .createProduct(lifecycleFixtureId, lifecycleNonce, legs as any, tiers as any, closesAt, settleDeadline)
        .rpc();

      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(user.publicKey, anchor.web3.LAMPORTS_PER_SOL)
      );

      const stake = new BN(anchor.web3.LAMPORTS_PER_SOL / 10);
      await program.methods
        .deposit(stake)
        .accounts({ product: lifecycleProductPda, vault: lifecycleVaultPda, position: positionPda, user: user.publicKey } as any)
        .signers([user])
        .rpc();

      // Wait for closesAt to elapse — settle_leg requires now >= closesAt.
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Leg: statKeyA=1001, threshold=2, GreaterThan. Supply value=5 -> 5 > 2 -> true.
      // minTimestamp must postdate closesAt (in ms) — settle_leg now rejects batches that
      // existed before deposits closed, to block latency-sniping off the live stream.
      const batchMinTimestamp = new BN(closesAt.toNumber() + 1).muln(1000);
      await program.methods
        .settleLeg(
          0,
          new BN(Math.floor(Date.now() / 1000)),
          { fixtureId: lifecycleFixtureId, updateStats: { updateCount: 1, minTimestamp: batchMinTimestamp, maxTimestamp: batchMinTimestamp }, eventsSubTreeRoot: zeroRoot } as any,
          [],
          [],
          emptyStatTerm(1001, 5) as any,
          null
        )
        .accounts({
          product: lifecycleProductPda,
          config: configPda,
          txoracleProgram: mockProgram.programId,
          dailyScoresMerkleRoots: dailyScoresRoots.publicKey,
        } as any)
        .rpc();

      const settledProduct = await program.account.product.fetch(lifecycleProductPda);
      assert.deepEqual(settledProduct.legResults[0], { true: {} });

      await program.methods
        .finalizeProduct()
        .accounts({ product: lifecycleProductPda } as any)
        .rpc();

      const finalized = await program.account.product.fetch(lifecycleProductPda);
      assert.equal(finalized.finalPayoutBps, 10000); // 1/1 legs true -> top tier -> 100%

      const balanceBefore = await provider.connection.getBalance(user.publicKey);
      await program.methods
        .claim()
        .accounts({ product: lifecycleProductPda, vault: lifecycleVaultPda, position: positionPda, user: user.publicKey } as any)
        .signers([user])
        .rpc();
      const balanceAfter = await provider.connection.getBalance(user.publicKey);

      // 100% payout of the staked amount should come back (minus tx fee).
      assert.isAbove(balanceAfter - balanceBefore, stake.toNumber() - 10_000);
    });

    it("rejects settle_leg with a batch that predates closes_at (anti latency-sniping)", async () => {
      const snipeFixtureId = new BN(778);
      const snipeNonce = 10;
      const [snipeProductPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("product"),
          snipeFixtureId.toArrayLike(Buffer, "le", 8),
          new anchor.BN(snipeNonce).toArrayLike(Buffer, "le", 4),
        ],
        program.programId
      );

      const closesAt = new BN(Math.floor(Date.now() / 1000) + 3);
      const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);
      const legs = [
        {
          statKeyA: 1001,
          statKeyB: 0,
          hasSecondStat: false,
          op: { add: {} },
          threshold: 2,
          comparison: { greaterThan: {} },
        },
      ];
      const tiers = [
        { minLegsTrue: 0, payoutBps: 0 },
        { minLegsTrue: 1, payoutBps: 10000 },
      ];

      await program.methods
        .createProduct(snipeFixtureId, snipeNonce, legs as any, tiers as any, closesAt, settleDeadline)
        .accounts({ product: snipeProductPda } as any)
        .rpc();

      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Batch timestamp is BEFORE closesAt — simulates a user trying to settle against
      // data that existed (on the live stream) before deposits even closed.
      const staleBatchMinTimestamp = new BN(closesAt.toNumber() - 60).muln(1000);

      let threw = false;
      let code = "";
      try {
        await program.methods
          .settleLeg(
            0,
            new BN(Math.floor(Date.now() / 1000)),
            {
              fixtureId: snipeFixtureId,
              updateStats: { updateCount: 1, minTimestamp: staleBatchMinTimestamp, maxTimestamp: staleBatchMinTimestamp },
              eventsSubTreeRoot: zeroRoot,
            } as any,
            [],
            [],
            emptyStatTerm(1001, 5) as any,
            null
          )
          .accounts({
            product: snipeProductPda,
            config: configPda,
            txoracleProgram: mockProgram.programId,
            dailyScoresMerkleRoots: dailyScoresRoots.publicKey,
          } as any)
          .rpc();
      } catch (e: any) {
        threw = true;
        code = e?.error?.errorCode?.code ?? "";
      }

      assert.isTrue(threw, "expected a stale batch to be rejected");
      assert.equal(code, "BatchPredatesClose");
    });
  });
});
