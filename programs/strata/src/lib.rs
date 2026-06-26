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

    /// Permissionless. Caller supplies only proof material; the program constructs the
    /// TraderPredicate from Product.legs[leg_index] and binds the proof to this fixture.
    pub fn settle_leg(
        ctx: Context<SettleLeg>,
        leg_index: u8,
        ts: i64,
        fixture_summary: ScoresBatchSummary,
        fixture_proof: Vec<ProofNode>,
        main_tree_proof: Vec<ProofNode>,
        stat_a: StatTerm,
        stat_b: Option<StatTerm>,
    ) -> Result<()> {
        let p = &ctx.accounts.product;
        require!(p.status == ProductStatus::Open, StrataError::ProductNotOpen);
        require!(Clock::get()?.unix_timestamp >= p.closes_at, StrataError::TooEarlyToSettle);
        let idx = leg_index as usize;
        require!(idx < p.num_legs as usize, StrataError::BadLegIndex);
        require!(p.leg_results[idx] == LegResult::Unsettled, StrataError::LegAlreadySettled);
        require!(fixture_summary.fixture_id == p.fixture_id, StrataError::FixtureMismatch);

        let leg = p.legs[idx];
        require!(stat_a.stat_to_prove.key == leg.stat_key_a, StrataError::StatKeyMismatch);
        let (op, stat_b_arg) = if leg.has_second_stat {
            let sb = stat_b.ok_or(StrataError::MissingSecondStat)?;
            require!(sb.stat_to_prove.key == leg.stat_key_b, StrataError::StatKeyMismatch);
            (Some(leg.op), Some(sb))
        } else {
            (None, None)
        };

        let args = ValidateStatArgs {
            ts,
            fixture_summary,
            fixture_proof,
            main_tree_proof,
            predicate: TraderPredicate { threshold: leg.threshold, comparison: leg.comparison },
            stat_a,
            stat_b: stat_b_arg,
            op,
        };

        let won = cpi_validate_stat(
            &ctx.accounts.txoracle_program.to_account_info(),
            &ctx.accounts.daily_scores_merkle_roots.to_account_info(),
            args,
        )?;

        let p = &mut ctx.accounts.product;
        p.leg_results[idx] = if won { LegResult::True } else { LegResult::False };
        emit!(LegSettled { product: p.key(), leg_index, won });
        Ok(())
    }

    /// Tallies proven legs into the tier table. Legs left unsettled past settle_deadline
    /// default to False so the product always resolves to a payout.
    pub fn finalize_product(ctx: Context<FinalizeProduct>) -> Result<()> {
        let p = &mut ctx.accounts.product;
        require!(p.status == ProductStatus::Open, StrataError::ProductNotOpen);
        let now = Clock::get()?.unix_timestamp;

        let mut legs_true: u8 = 0;
        for i in 0..(p.num_legs as usize) {
            match p.leg_results[i] {
                LegResult::True => legs_true += 1,
                LegResult::False => {}
                LegResult::Unsettled => {
                    require!(now >= p.settle_deadline, StrataError::LegsStillPending);
                    p.leg_results[i] = LegResult::False;
                }
            }
        }

        let mut payout_bps: u16 = 0;
        for i in 0..(p.num_tiers as usize) {
            if legs_true >= p.tiers[i].min_legs_true {
                payout_bps = p.tiers[i].payout_bps;
            }
        }

        p.status = ProductStatus::Settled;
        p.final_payout_bps = payout_bps;
        emit!(ProductSettled { product: p.key(), fixture_id: p.fixture_id, legs_true, payout_bps });
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let p = &ctx.accounts.product;
        require!(p.status == ProductStatus::Settled, StrataError::NotSettled);
        require!(!ctx.accounts.position.claimed, StrataError::AlreadyClaimed);

        let stake = ctx.accounts.position.stake;
        require!(stake > 0, StrataError::NothingToClaim);

        let payout = (stake as u128)
            .checked_mul(p.final_payout_bps as u128).ok_or(StrataError::Overflow)?
            .checked_div(10_000u128).ok_or(StrataError::Overflow)? as u64;

        if payout > 0 {
            **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= payout;
            **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;
        }

        ctx.accounts.position.claimed = true;
        emit!(Claimed { product: p.key(), user: ctx.accounts.user.key(), payout });
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

#[derive(Accounts)]
pub struct SettleLeg<'info> {
    #[account(mut, seeds = [PRODUCT_SEED, &product.fixture_id.to_le_bytes(), &product.nonce.to_le_bytes()], bump = product.bump)]
    pub product: Account<'info, Product>,
    /// CHECK: must be the TxLINE txoracle program
    #[account(address = TXORACLE_ID)]
    pub txoracle_program: UncheckedAccount<'info>,
    /// CHECK: daily_scores roots PDA; txoracle validates its discriminator+owner internally
    #[account(owner = TXORACLE_ID)]
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct FinalizeProduct<'info> {
    #[account(mut, seeds = [PRODUCT_SEED, &product.fixture_id.to_le_bytes(), &product.nonce.to_le_bytes()], bump = product.bump)]
    pub product: Account<'info, Product>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(seeds = [PRODUCT_SEED, &product.fixture_id.to_le_bytes(), &product.nonce.to_le_bytes()], bump = product.bump)]
    pub product: Account<'info, Product>,
    #[account(mut, seeds = [VAULT_SEED, product.key().as_ref()], bump = product.vault_bump)]
    pub vault: Account<'info, Vault>,
    #[account(
        mut, seeds = [POS_SEED, product.key().as_ref(), user.key().as_ref()], bump = position.bump,
        has_one = user @ StrataError::Unauthorized
    )]
    pub position: Account<'info, Position>,
    #[account(mut)]
    pub user: Signer<'info>,
}

// ---------- events ----------

#[event]
pub struct LegSettled {
    pub product: Pubkey,
    pub leg_index: u8,
    pub won: bool,
}

#[event]
pub struct ProductSettled {
    pub product: Pubkey,
    pub fixture_id: i64,
    pub legs_true: u8,
    pub payout_bps: u16,
}

#[event]
pub struct Claimed {
    pub product: Pubkey,
    pub user: Pubkey,
    pub payout: u64,
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
    #[msg("too early to settle, wait for closes_at")] TooEarlyToSettle,
    #[msg("bad leg index")] BadLegIndex,
    #[msg("leg already settled")] LegAlreadySettled,
    #[msg("fixture id mismatch")] FixtureMismatch,
    #[msg("stat key mismatch")] StatKeyMismatch,
    #[msg("leg requires a second stat term")] MissingSecondStat,
    #[msg("legs still pending and before settle_deadline")] LegsStillPending,
    #[msg("product not settled")] NotSettled,
    #[msg("already claimed")] AlreadyClaimed,
    #[msg("nothing to claim")] NothingToClaim,
    #[msg("unauthorized")] Unauthorized,
    #[msg("overflow")] Overflow,
}
