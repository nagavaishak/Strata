import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Strata } from "../target/types/strata";
import { MockTxoracle } from "../target/types/mock_txoracle";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

function productPdas(programId: PublicKey, fixtureId: BN, nonce: number) {
  const [product] = PublicKey.findProgramAddressSync(
    [Buffer.from("product"), fixtureId.toArrayLike(Buffer, "le", 8), new BN(nonce).toArrayLike(Buffer, "le", 4)],
    programId
  );
  return { product };
}

function poolPdas(programId: PublicKey, writer: PublicKey) {
  const [writerPool] = PublicKey.findProgramAddressSync([Buffer.from("writer_pool"), writer.toBuffer()], programId);
  const [poolVault] = PublicKey.findProgramAddressSync([Buffer.from("pool_vault"), writer.toBuffer()], programId);
  return { writerPool, poolVault };
}

function positionPda(programId: PublicKey, product: PublicKey, user: PublicKey) {
  const [position] = PublicKey.findProgramAddressSync(
    [Buffer.from("pos"), product.toBuffer(), user.toBuffer()],
    programId
  );
  return position;
}

describe("strata", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.Strata as Program<Strata>;

  const { writerPool, poolVault } = poolPdas(program.programId, provider.wallet.publicKey);

  before(async () => {
    await program.methods
      .initializeWriterPool()
      .accounts({ writerPool, poolVault, writer: provider.wallet.publicKey } as any)
      .rpc();
    await program.methods
      .fundPool(new BN(2 * anchor.web3.LAMPORTS_PER_SOL))
      .accounts({ writerPool, poolVault, writer: provider.wallet.publicKey } as any)
      .rpc();
  });

  const fixtureId = new BN(123456);
  const nonce = 1;
  const { product: productPda } = productPdas(program.programId, fixtureId, nonce);

  it("creates a product with a valid tiered payout table, reserving collateral from the pool", async () => {
    const closesAt = new BN(Math.floor(Date.now() / 1000) - 10); // already closed, for settle tests
    const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);

    const legs = [
      { statKeyA: 1001, statKeyB: 0, hasSecondStat: false, op: { add: {} }, threshold: 2, comparison: { greaterThan: {} } },
    ];
    const tiers = [
      { minLegsTrue: 0, payoutBps: 0 },
      { minLegsTrue: 1, payoutBps: 10000 },
    ];

    const maxCapacity = new BN(anchor.web3.LAMPORTS_PER_SOL / 20);
    const poolBefore = await program.account.writerPool.fetch(writerPool);

    await program.methods
      .createProduct(fixtureId, nonce, legs as any, tiers as any, closesAt, settleDeadline, maxCapacity)
      .accounts({ product: productPda, writerPool, poolVault, payer: provider.wallet.publicKey } as any)
      .rpc();

    const product = await program.account.product.fetch(productPda);
    assert.equal(product.numLegs, 1);
    assert.equal(product.numTiers, 2);
    assert.equal(product.status.open !== undefined, true);
    // top tier is 10000bps (100%) on maxCapacity -> collateral_locked == maxCapacity
    assert.equal(product.collateralLocked.toString(), maxCapacity.toString());
    assert.equal(product.writer.toBase58(), provider.wallet.publicKey.toBase58());
    assert.equal(product.writerPool.toBase58(), writerPool.toBase58());

    const poolAfter = await program.account.writerPool.fetch(writerPool);
    assert.equal(
      poolAfter.reserved.sub(poolBefore.reserved).toString(),
      maxCapacity.toString(),
      "writer_pool.reserved should increase by exactly this product's collateral_required"
    );
  });

  it("rejects a non-monotonic tier table", async () => {
    const badFixtureId = new BN(999999);
    const closesAt = new BN(Math.floor(Date.now() / 1000) + 60);
    const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);
    const legs = [
      { statKeyA: 1001, statKeyB: 0, hasSecondStat: false, op: { add: {} }, threshold: 2, comparison: { greaterThan: {} } },
    ];
    const badTiers = [
      { minLegsTrue: 0, payoutBps: 5000 },
      { minLegsTrue: 1, payoutBps: 1000 }, // decreasing payout -> should fail
    ];
    const { product } = productPdas(program.programId, badFixtureId, 2);

    let threw = false;
    try {
      await program.methods
        .createProduct(badFixtureId, 2, legs as any, badTiers as any, closesAt, settleDeadline, new BN(1))
        .accounts({ product, writerPool, poolVault, payer: provider.wallet.publicKey } as any)
        .rpc();
    } catch (e) {
      threw = true;
    }
    assert.isTrue(threw, "expected non-monotonic tier table to be rejected");
  });

  it("rejects create_product when it would reserve more than the pool's free capital", async () => {
    const hugeFixtureId = new BN(888888);
    const closesAt = new BN(Math.floor(Date.now() / 1000) + 60);
    const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);
    const legs = [
      { statKeyA: 1001, statKeyB: 0, hasSecondStat: false, op: { add: {} }, threshold: 2, comparison: { greaterThan: {} } },
    ];
    const tiers = [
      { minLegsTrue: 0, payoutBps: 0 },
      { minLegsTrue: 1, payoutBps: 10000 },
    ];
    // Far more than the 2 SOL funded into the pool.
    const absurdCapacity = new BN(1000 * anchor.web3.LAMPORTS_PER_SOL);
    const { product } = productPdas(program.programId, hugeFixtureId, 3);

    let threw = false;
    let code = "";
    try {
      await program.methods
        .createProduct(hugeFixtureId, 3, legs as any, tiers as any, closesAt, settleDeadline, absurdCapacity)
        .accounts({ product, writerPool, poolVault, payer: provider.wallet.publicKey } as any)
        .rpc();
    } catch (e: any) {
      threw = true;
      code = e?.error?.errorCode?.code ?? "";
    }
    assert.isTrue(threw, "expected create_product to be rejected when it exceeds free pool capital");
    assert.equal(code, "InsufficientPoolBalance");
  });

  describe("full lifecycle against mock-txoracle", () => {
    const mockProgram = anchor.workspace.MockTxoracle as Program<MockTxoracle>;
    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
    const dailyScoresRoots = Keypair.generate();

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
        SystemProgram.transfer({ fromPubkey: provider.wallet.publicKey, toPubkey: dailyScoresRoots.publicKey, lamports: rentExempt }),
        SystemProgram.assign({ accountPubkey: dailyScoresRoots.publicKey, programId: mockProgram.programId })
      );
      await provider.sendAndConfirm(assignTx, [dailyScoresRoots]);

      const info = await provider.connection.getAccountInfo(dailyScoresRoots.publicKey);
      assert.isNotNull(info, "daily_scores_merkle_roots account should exist after assign");
      assert.equal(info!.owner.toBase58(), mockProgram.programId.toBase58(), "assign should have set owner to mock program");

      const config = await program.account.config.fetch(configPda);
      assert.equal(config.txoracleProgramId.toBase58(), mockProgram.programId.toBase58());
    });

    it("runs two products sharing ONE pool end to end, proving cross-product solvency", async () => {
      // Product A: wins. Product B: loses. Both backed by the SAME writer pool.
      // This is the actual feature under test — not just that one product works, but
      // that the pool's reserved/owed accounting stays exactly correct across two
      // independent products settling to two different outcomes at once.
      const closesAt = new BN(Math.floor(Date.now() / 1000) + 3);
      const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);
      const legs = [
        { statKeyA: 1001, statKeyB: 0, hasSecondStat: false, op: { add: {} }, threshold: 2, comparison: { greaterThan: {} } },
      ];

      const fixtureA = new BN(777);
      const nonceA = 9;
      const stakeA = new BN(anchor.web3.LAMPORTS_PER_SOL / 10);
      const tiersA = [{ minLegsTrue: 0, payoutBps: 0 }, { minLegsTrue: 1, payoutBps: 25000 }]; // 2.5x on win
      const { product: productA } = productPdas(program.programId, fixtureA, nonceA);
      const buyerA = Keypair.generate();

      const fixtureB = new BN(778);
      const nonceB = 10;
      const stakeB = new BN(anchor.web3.LAMPORTS_PER_SOL / 20);
      const tiersB = [{ minLegsTrue: 0, payoutBps: 0 }, { minLegsTrue: 1, payoutBps: 15000 }]; // pays 0 since it'll lose
      const { product: productB } = productPdas(program.programId, fixtureB, nonceB);
      const buyerB = Keypair.generate();

      const poolBeforeCreate = await program.account.writerPool.fetch(writerPool);

      await program.methods
        .createProduct(fixtureA, nonceA, legs as any, tiersA as any, closesAt, settleDeadline, stakeA)
        .accounts({ product: productA, writerPool, poolVault, payer: provider.wallet.publicKey } as any)
        .rpc();
      await program.methods
        .createProduct(fixtureB, nonceB, legs as any, tiersB as any, closesAt, settleDeadline, stakeB)
        .accounts({ product: productB, writerPool, poolVault, payer: provider.wallet.publicKey } as any)
        .rpc();

      const collateralA = stakeA.muln(25000).divn(10000);
      const collateralB = stakeB.muln(15000).divn(10000);
      const poolAfterCreate = await program.account.writerPool.fetch(writerPool);
      assert.equal(
        poolAfterCreate.reserved.sub(poolBeforeCreate.reserved).toString(),
        collateralA.add(collateralB).toString(),
        "pool should reserve both products' worst cases simultaneously"
      );

      for (const [buyer, product, stake] of [[buyerA, productA, stakeA], [buyerB, productB, stakeB]] as const) {
        await provider.connection.confirmTransaction(
          await provider.connection.requestAirdrop(buyer.publicKey, anchor.web3.LAMPORTS_PER_SOL)
        );
        await program.methods
          .deposit(stake)
          .accounts({ product, poolVault, position: positionPda(program.programId, product, buyer.publicKey), user: buyer.publicKey } as any)
          .signers([buyer])
          .rpc();
      }

      await new Promise((resolve) => setTimeout(resolve, 4000));
      const batchMinTimestamp = new BN(closesAt.toNumber() + 1).muln(1000);

      // A: value=5 > threshold=2 -> true -> top tier hits.
      await program.methods
        .settleLeg(0, new BN(Math.floor(Date.now() / 1000)),
          { fixtureId: fixtureA, updateStats: { updateCount: 1, minTimestamp: batchMinTimestamp, maxTimestamp: batchMinTimestamp }, eventsSubTreeRoot: zeroRoot } as any,
          [], [], emptyStatTerm(1001, 5) as any, null)
        .accounts({ product: productA, config: configPda, txoracleProgram: mockProgram.programId, dailyScoresMerkleRoots: dailyScoresRoots.publicKey } as any)
        .rpc();

      // B: value=1, NOT > threshold=2 -> false -> bottom tier (0 payout).
      await program.methods
        .settleLeg(0, new BN(Math.floor(Date.now() / 1000)),
          { fixtureId: fixtureB, updateStats: { updateCount: 1, minTimestamp: batchMinTimestamp, maxTimestamp: batchMinTimestamp }, eventsSubTreeRoot: zeroRoot } as any,
          [], [], emptyStatTerm(1001, 1) as any, null)
        .accounts({ product: productB, config: configPda, txoracleProgram: mockProgram.programId, dailyScoresMerkleRoots: dailyScoresRoots.publicKey } as any)
        .rpc();

      await program.methods.finalizeProduct().accounts({ product: productA, writerPool } as any).rpc();
      await program.methods.finalizeProduct().accounts({ product: productB, writerPool } as any).rpc();

      const finalizedA = await program.account.product.fetch(productA);
      const finalizedB = await program.account.product.fetch(productB);
      assert.equal(finalizedA.finalPayoutBps, 25000);
      assert.equal(finalizedB.finalPayoutBps, 0);

      const payoutA = stakeA.muln(25000).divn(10000);
      const poolAfterFinalize = await program.account.writerPool.fetch(writerPool);
      assert.equal(
        poolAfterFinalize.reserved.toString(),
        poolBeforeCreate.reserved.toString(),
        "both reservations released — reserved back to its pre-test level"
      );
      assert.equal(poolAfterFinalize.owed.toString(), payoutA.toString(), "owed should reflect ONLY A's payout, B owes nothing");

      const balanceBeforeA = await provider.connection.getBalance(buyerA.publicKey);
      await program.methods
        .claim()
        .accounts({ product: productA, writerPool, poolVault, position: positionPda(program.programId, productA, buyerA.publicKey), user: buyerA.publicKey } as any)
        .signers([buyerA])
        .rpc();
      const balanceAfterA = await provider.connection.getBalance(buyerA.publicKey);
      assert.isAbove(balanceAfterA - balanceBeforeA, stakeA.toNumber(), "A's buyer should receive more than their own stake back");

      await program.methods
        .claim()
        .accounts({ product: productB, writerPool, poolVault, position: positionPda(program.programId, productB, buyerB.publicKey), user: buyerB.publicKey } as any)
        .signers([buyerB])
        .rpc();

      const poolAfterClaims = await program.account.writerPool.fetch(writerPool);
      assert.equal(poolAfterClaims.owed.toString(), "0", "owed should be fully released once the only owed buyer has claimed");

      // The writer can now safely pull out everything not tied up — across BOTH products
      // at once, a single pool-level operation, not two separate per-product withdrawals.
      const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(9);
      const vaultBalance = await provider.connection.getBalance(poolVault);
      const safeToWithdraw = vaultBalance - rentExempt - poolAfterClaims.reserved.toNumber() - poolAfterClaims.owed.toNumber();
      assert.isAbove(safeToWithdraw, 0);

      const writerBalanceBefore = await provider.connection.getBalance(provider.wallet.publicKey);
      await program.methods
        .withdrawFromPool(new BN(safeToWithdraw))
        .accounts({ writerPool, poolVault, writer: provider.wallet.publicKey } as any)
        .rpc();
      const writerBalanceAfter = await provider.connection.getBalance(provider.wallet.publicKey);
      assert.isAbove(writerBalanceAfter - writerBalanceBefore, safeToWithdraw - 10_000);

      // Trying to withdraw even one more lamport than the proven-safe amount must fail —
      // this is the actual solvency guarantee, not just a happy-path number.
      let threw = false;
      try {
        await program.methods
          .withdrawFromPool(new BN(1))
          .accounts({ writerPool, poolVault, writer: provider.wallet.publicKey } as any)
          .rpc();
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw, "withdrawing beyond the safe amount must be rejected");
    });

    it("rejects a deposit that would exceed max_capacity", async () => {
      // The previous test deliberately drained the pool down to its safe minimum —
      // top up before reserving fresh collateral for this product.
      await program.methods
        .fundPool(new BN(anchor.web3.LAMPORTS_PER_SOL / 10))
        .accounts({ writerPool, poolVault, writer: provider.wallet.publicKey } as any)
        .rpc();

      const capFixtureId = new BN(779);
      const capNonce = 11;
      const { product: capProduct } = productPdas(program.programId, capFixtureId, capNonce);
      const capUser = Keypair.generate();

      const closesAt = new BN(Math.floor(Date.now() / 1000) + 60);
      const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);
      const legs = [
        { statKeyA: 1001, statKeyB: 0, hasSecondStat: false, op: { add: {} }, threshold: 2, comparison: { greaterThan: {} } },
      ];
      const tiers = [{ minLegsTrue: 0, payoutBps: 0 }, { minLegsTrue: 1, payoutBps: 10000 }];
      const maxCapacity = new BN(anchor.web3.LAMPORTS_PER_SOL / 100); // tiny capacity, easy to exceed

      await program.methods
        .createProduct(capFixtureId, capNonce, legs as any, tiers as any, closesAt, settleDeadline, maxCapacity)
        .accounts({ product: capProduct, writerPool, poolVault, payer: provider.wallet.publicKey } as any)
        .rpc();

      await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(capUser.publicKey, anchor.web3.LAMPORTS_PER_SOL)
      );

      let threw = false;
      let code = "";
      try {
        await program.methods
          .deposit(maxCapacity.addn(1)) // one lamport over capacity
          .accounts({ product: capProduct, poolVault, position: positionPda(program.programId, capProduct, capUser.publicKey), user: capUser.publicKey } as any)
          .signers([capUser])
          .rpc();
      } catch (e: any) {
        threw = true;
        code = e?.error?.errorCode?.code ?? "";
      }

      assert.isTrue(threw, "expected a deposit over max_capacity to be rejected");
      assert.equal(code, "CapacityExceeded");
    });

    it("rejects settle_leg with a batch that predates closes_at (anti latency-sniping)", async () => {
      await program.methods
        .fundPool(new BN(anchor.web3.LAMPORTS_PER_SOL / 10))
        .accounts({ writerPool, poolVault, writer: provider.wallet.publicKey } as any)
        .rpc();

      const snipeFixtureId = new BN(780);
      const snipeNonce = 12;
      const { product: snipeProduct } = productPdas(program.programId, snipeFixtureId, snipeNonce);

      const closesAt = new BN(Math.floor(Date.now() / 1000) + 3);
      const settleDeadline = new BN(Math.floor(Date.now() / 1000) + 600);
      const legs = [
        { statKeyA: 1001, statKeyB: 0, hasSecondStat: false, op: { add: {} }, threshold: 2, comparison: { greaterThan: {} } },
      ];
      const tiers = [{ minLegsTrue: 0, payoutBps: 0 }, { minLegsTrue: 1, payoutBps: 10000 }];

      await program.methods
        .createProduct(snipeFixtureId, snipeNonce, legs as any, tiers as any, closesAt, settleDeadline, new BN(anchor.web3.LAMPORTS_PER_SOL / 10))
        .accounts({ product: snipeProduct, writerPool, poolVault, payer: provider.wallet.publicKey } as any)
        .rpc();

      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Batch timestamp is BEFORE closesAt — simulates a user trying to settle against
      // data that existed (on the live stream) before deposits even closed.
      const staleBatchMinTimestamp = new BN(closesAt.toNumber() - 60).muln(1000);

      let threw = false;
      let code = "";
      try {
        await program.methods
          .settleLeg(0, new BN(Math.floor(Date.now() / 1000)),
            { fixtureId: snipeFixtureId, updateStats: { updateCount: 1, minTimestamp: staleBatchMinTimestamp, maxTimestamp: staleBatchMinTimestamp }, eventsSubTreeRoot: zeroRoot } as any,
            [], [], emptyStatTerm(1001, 5) as any, null)
          .accounts({ product: snipeProduct, config: configPda, txoracleProgram: mockProgram.programId, dailyScoresMerkleRoots: dailyScoresRoots.publicKey } as any)
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
