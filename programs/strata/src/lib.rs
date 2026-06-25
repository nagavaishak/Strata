// Strata — structured parametric payoffs settled by TxLINE Merkle proofs.
use anchor_lang::prelude::*;
use anchor_lang::system_program;

pub mod txoracle_cpi;
use txoracle_cpi::*;

declare_id!("37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs");

pub const TXORACLE_ID: Pubkey = anchor_lang::solana_program::pubkey!("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

pub const MAX_LEGS: usize = 5;
pub const MAX_TIERS: usize = 6;
pub const PRODUCT_SEED: &[u8] = b"product";
pub const VAULT_SEED: &[u8] = b"vault";
pub const POS_SEED: &[u8] = b"pos";

#[program]
pub mod strata {
    use super::*;

    pub fn create_product(
        ctx: Context<CreateProduct>,
        fixture_id: i64,
        nonce: u32,
        legs: Vec<Leg>,
        tiers: Vec<Tier>,
        closes_at: i64,
        settle_deadline: i64,
    ) -> Result<()> {
        require!(!legs.is_empty() && legs.len() <= MAX_LEGS, StrataError::BadLegCount);
        require!(!tiers.is_empty() && tiers.len() <= MAX_TIERS, StrataError::BadTierCount);
        require!(settle_deadline > closes_at, StrataError::BadDeadline);

        // tiers must be sorted ascending by min_legs_true and payout strictly non-decreasing
        let mut last_min = -1i32;
        let mut last_bps = -1i32;
        for t in tiers.iter() {
            require!((t.min_legs_true as usize) <= legs.len(), StrataError::TierOutOfRange);
            require!((t.min_legs_true as i32) > last_min, StrataError::TiersNotMonotonic);
            require!((t.payout_bps as i32) >= last_bps, StrataError::TiersNotMonotonic);
            last_min = t.min_legs_true as i32;
            last_bps = t.payout_bps as i32;
        }
        require!(tiers[0].min_legs_true == 0, StrataError::MissingZeroTier);

        let p = &mut ctx.accounts.product;
        p.fixture_id = fixture_id;
        p.nonce = nonce;
        p.num_legs = legs.len() as u8;
        p.legs = [Leg::default(); MAX_LEGS];
        for (i, leg) in legs.iter().enumerate() {
            p.legs[i] = *leg;
        }
        p.num_tiers = tiers.len() as u8;
        p.tiers = [Tier::default(); MAX_TIERS];
        for (i, tier) in tiers.iter().enumerate() {
            p.tiers[i] = *tier;
        }
        p.leg_results = [LegResult::Unsettled; MAX_LEGS];
        p.status = ProductStatus::Open;
        p.closes_at = closes_at;
        p.settle_deadline = settle_deadline;
        p.total_stake = 0;
        p.final_payout_bps = 0;
        p.bump = ctx.bumps.product;
        p.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(ctx.accounts.product.status == ProductStatus::Open, StrataError::ProductNotOpen);
        require!(Clock::get()?.unix_timestamp < ctx.accounts.product.closes_at, StrataError::ProductClosed);
        require!(amount > 0, StrataError::ZeroAmount);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        let pos = &mut ctx.accounts.position;
        pos.user = ctx.accounts.user.key();
        pos.product = ctx.accounts.product.key();
        pos.stake = pos.stake.checked_add(amount).ok_or(StrataError::Overflow)?;
        pos.claimed = false;
        pos.bump = ctx.bumps.position;

        let p = &mut ctx.accounts.product;
        p.total_stake = p.total_stake.checked_add(amount).ok_or(StrataError::Overflow)?;
        Ok(())
    }
}

// ---------- state ----------

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct Leg {
    pub stat_key_a: u32,
    pub stat_key_b: u32,
    pub has_second_stat: bool,
    pub op: BinaryExpression,
    pub threshold: i32,
    pub comparison: Comparison,
}
impl Default for BinaryExpression {
    fn default() -> Self { BinaryExpression::Add }
}
impl Default for Comparison {
    fn default() -> Self { Comparison::GreaterThan }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct Tier {
    pub min_legs_true: u8,
    pub payout_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum LegResult {
    #[default]
    Unsettled,
    True,
    False,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum ProductStatus {
    #[default]
    Open,
    Settled,
}

#[account]
pub struct Product {
    pub fixture_id: i64,
    pub nonce: u32,
    pub num_legs: u8,
    pub legs: [Leg; MAX_LEGS],
    pub num_tiers: u8,
    pub tiers: [Tier; MAX_TIERS],
    pub leg_results: [LegResult; MAX_LEGS],
    pub status: ProductStatus,
    pub closes_at: i64,
    pub settle_deadline: i64,
    pub total_stake: u64,
    pub final_payout_bps: u16,
    pub bump: u8,
    pub vault_bump: u8,
}
impl Product {
    const LEG_SIZE: usize = 4 + 4 + 1 + 1 + 4 + 1;
    const TIER_SIZE: usize = 1 + 2;
    pub const SPACE: usize = 8 + 8 + 4 + 1 + (Self::LEG_SIZE * MAX_LEGS) + 1
        + (Self::TIER_SIZE * MAX_TIERS) + (1 * MAX_LEGS) + 1 + 8 + 8 + 8 + 2 + 1 + 1;
}

#[account]
pub struct Vault {
    pub bump: u8,
}
impl Vault {
    pub const SPACE: usize = 8 + 1;
}

#[account]
pub struct Position {
    pub user: Pubkey,
    pub product: Pubkey,
    pub stake: u64,
    pub claimed: bool,
    pub bump: u8,
}
impl Position {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1 + 1;
}

// ---------- contexts ----------

#[derive(Accounts)]
#[instruction(fixture_id: i64, nonce: u32)]
pub struct CreateProduct<'info> {
    #[account(
        init, payer = payer, space = Product::SPACE,
        seeds = [PRODUCT_SEED, &fixture_id.to_le_bytes(), &nonce.to_le_bytes()], bump
    )]
    pub product: Account<'info, Product>,
    #[account(
        init, payer = payer, space = Vault::SPACE,
        seeds = [VAULT_SEED, product.key().as_ref()], bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [PRODUCT_SEED, &product.fixture_id.to_le_bytes(), &product.nonce.to_le_bytes()], bump = product.bump)]
    pub product: Account<'info, Product>,
    #[account(mut, seeds = [VAULT_SEED, product.key().as_ref()], bump = product.vault_bump)]
    pub vault: Account<'info, Vault>,
    #[account(
        init_if_needed, payer = user, space = Position::SPACE,
        seeds = [POS_SEED, product.key().as_ref(), user.key().as_ref()], bump
    )]
    pub position: Account<'info, Position>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ---------- errors ----------

#[error_code]
pub enum StrataError {
    #[msg("leg count must be 1..=MAX_LEGS")] BadLegCount,
    #[msg("tier count must be 1..=MAX_TIERS")] BadTierCount,
    #[msg("settle_deadline must be after closes_at")] BadDeadline,
    #[msg("tier min_legs_true exceeds leg count")] TierOutOfRange,
    #[msg("tiers must be strictly increasing in legs and non-decreasing in payout")] TiersNotMonotonic,
    #[msg("must include a tier for 0 legs true")] MissingZeroTier,
    #[msg("product not open")] ProductNotOpen,
    #[msg("product has closed for deposits")] ProductClosed,
    #[msg("amount must be > 0")] ZeroAmount,
    #[msg("overflow")] Overflow,
}
