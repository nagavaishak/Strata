import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Strata } from "../target/types/strata";

describe("strata", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Strata as Program<Strata>;

  it("Is initialized!", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
