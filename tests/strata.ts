import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Strata } from "../target/types/strata";
import { assert } from "chai";

describe("strata", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
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
});
