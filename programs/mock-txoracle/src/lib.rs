// Local stand-in for TxLINE's txoracle.validate_stat, for testing settle_leg without
// devnet, a live fixture, or real Merkle proof material.
//
// Skips proof verification entirely (no Merkle checking) and just evaluates the predicate
// directly against the stat value(s) the caller supplies. That's fine for testing Strata's
// own settlement logic (tier math, account state transitions, permissionless settle) — it
// is NOT a security model and must never be pointed at by anything except localnet tests.
//
// Anchor instruction discriminators are sha256("global:<fn_name>")[..8], a function of the
// name alone, not the program id. Naming this instruction `validate_stat` makes Anchor emit
// the exact same discriminator as TxLINE's real on-chain program, so Strata's CPI code
// (which hardcodes that discriminator) works against this mock unmodified.
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::set_return_data;

declare_id!("FdPN4osW8F7r4vRqW9N6A9ch1yXPJ1c9iSoJcnDyVDRn");

#[program]
pub mod mock_txoracle {
    use super::*;

    pub fn validate_stat(
        _ctx: Context<ValidateStat>,
        _ts: i64,
        _fixture_summary: ScoresBatchSummary,
        _fixture_proof: Vec<ProofNode>,
        _main_tree_proof: Vec<ProofNode>,
        predicate: TraderPredicate,
        stat_a: StatTerm,
        stat_b: Option<StatTerm>,
        op: Option<BinaryExpression>,
    ) -> Result<()> {
        let combined = match (stat_b, op) {
            (Some(sb), Some(BinaryExpression::Add)) => stat_a.stat_to_prove.value + sb.stat_to_prove.value,
            (Some(sb), Some(BinaryExpression::Subtract)) => stat_a.stat_to_prove.value - sb.stat_to_prove.value,
            _ => stat_a.stat_to_prove.value,
        };

        let result = match predicate.comparison {
            Comparison::GreaterThan => combined > predicate.threshold,
            Comparison::LessThan => combined < predicate.threshold,
            Comparison::EqualTo => combined == predicate.threshold,
        };

        set_return_data(&[if result { 1u8 } else { 0u8 }]);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateStat<'info> {
    /// CHECK: mock — real txoracle validates this PDA's discriminator+owner internally,
    /// this stand-in doesn't need to read it at all.
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
}

// ---------- types (mirrors txoracle's IDL exactly — field order + enum variant order = borsh layout) ----------

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoresUpdateStats {
    pub update_count: i32,
    pub min_timestamp: i64,
    pub max_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoresBatchSummary {
    pub fixture_id: i64,
    pub update_stats: ScoresUpdateStats,
    pub events_sub_tree_root: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProofNode {
    pub hash: [u8; 32],
    pub is_right_sibling: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Comparison {
    GreaterThan,
    LessThan,
    EqualTo,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TraderPredicate {
    pub threshold: i32,
    pub comparison: Comparison,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ScoreStat {
    pub key: u32,
    pub value: i32,
    pub period: i32,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StatTerm {
    pub stat_to_prove: ScoreStat,
    pub event_stat_root: [u8; 32],
    pub stat_proof: Vec<ProofNode>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BinaryExpression {
    Add,
    Subtract,
}
