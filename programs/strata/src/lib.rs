// Strata — structured parametric payoffs settled by TxLINE Merkle proofs.
// Settlement is permissionless: the program builds each leg's TraderPredicate from the
// Product's own definition and binds proof material to fixture + stat keys, so no caller
// (keeper, bot, user) can misrepresent which condition resolved. Trust = the proof, not a signer.
use anchor_lang::prelude::*;
use anchor_lang::system_program;

pub mod txoracle_cpi;
use txoracle_cpi::*;

declare_id!("37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs");

pub const MAX_LEGS: usize = 5;
pub const MAX_TIERS: usize = 6;
pub const PRODUCT_SEED: &[u8] = b"product";
pub const POS_SEED: &[u8] = b"pos";
pub const CONFIG_SEED: &[u8] = b"config";
pub const POOL_SEED: &[u8] = b"writer_pool";
pub const POOL_VAULT_SEED: &[u8] = b"pool_vault";

#[program]
pub mod strata {
    use super::*;

    /// One-time setup. Stores which program `settle_leg` CPIs into, so a future TxLINE
    /// program migration (e.g. validate_stat_v2 under a new program id) doesn't require
    /// redeploying Strata — just calling update_config again.
    pub fn initialize_config(ctx: Context<InitializeConfig>, txoracle_program_id: Pubkey) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.authority = ctx.accounts.authority.key();
        c.txoracle_program_id = txoracle_program_id;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn update_config(ctx: Context<UpdateConfig>, txoracle_program_id: Pubkey) -> Result<()> {
        ctx.accounts.config.txoracle_program_id = txoracle_program_id;
        Ok(())
    }

    /// One pool per writer, shared across every product they create. Solvency is a single
    /// running invariant, never a per-product calculation: at all times,
    ///   pool_vault_balance >= reserved (open products' worst cases) + owed (settled,
    ///   confirmed, not-yet-claimed payouts)
    /// Every instruction below that touches reserved/owed preserves this invariant by
    /// construction — see each one's doc comment for the specific argument.
    pub fn initialize_writer_pool(ctx: Context<InitializeWriterPool>) -> Result<()> {
        let pool = &mut ctx.accounts.writer_pool;
        pool.writer = ctx.accounts.writer.key();
        pool.reserved = 0;
        pool.owed = 0;
        pool.bump = ctx.bumps.writer_pool;
        pool.vault_bump = ctx.bumps.pool_vault;
        Ok(())
    }

    /// Writer adds capital ahead of creating products. Pure balance increase — trivially
    /// preserves the solvency invariant (both sides of `>=` keep their values; only the
    /// left side grows).
    pub fn fund_pool(ctx: Context<FundPool>, amount: u64) -> Result<()> {
        require!(amount > 0, StrataError::ZeroAmount);
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.writer.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }

    /// Writer withdraws idle capital. Only ever allows taking out what's neither reserved
    /// for an open product's worst case nor owed to a settled product's buyers — provably
    /// safe across the writer's ENTIRE book of products at once, not product-by-product.
    pub fn withdraw_from_pool(ctx: Context<WithdrawFromPool>, amount: u64) -> Result<()> {
        require!(amount > 0, StrataError::ZeroAmount);
        let pool = &ctx.accounts.writer_pool;
        let rent_exempt = Rent::get()?.minimum_balance(PoolVault::SPACE);
        let vault_balance = ctx.accounts.pool_vault.to_account_info().lamports();
        let locked = pool.reserved.checked_add(pool.owed).ok_or(StrataError::Overflow)?;
        let available = vault_balance
            .checked_sub(rent_exempt).ok_or(StrataError::Overflow)?
            .checked_sub(locked).ok_or(StrataError::Overflow)?;
        require!(amount <= available, StrataError::InsufficientPoolBalance);

        **ctx.accounts.pool_vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.writer.to_account_info().try_borrow_mut_lamports()? += amount;
        emit!(PoolWithdrawn { writer: ctx.accounts.writer.key(), amount });
        Ok(())
    }

    /// Creator's writer pool reserves this product's worst-case obligation instead of
    /// moving fresh collateral — the capital was already posted via fund_pool, possibly
    /// backing other open products from the same writer too. This is the cross-product
    /// capital efficiency: one pool, many products, one solvency check, not N separate
    /// dedicated vaults.
    pub fn create_product(
        ctx: Context<CreateProduct>,
        fixture_id: i64,
        nonce: u32,
        legs: Vec<Leg>,
        tiers: Vec<Tier>,
        closes_at: i64,
        settle_deadline: i64,
        max_capacity: u64,
    ) -> Result<()> {
        require!(!legs.is_empty() && legs.len() <= MAX_LEGS, StrataError::BadLegCount);
        require!(!tiers.is_empty() && tiers.len() <= MAX_TIERS, StrataError::BadTierCount);
        require!(settle_deadline > closes_at, StrataError::BadDeadline);
        require!(max_capacity > 0, StrataError::ZeroAmount);

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
        // tier covering 0 legs true must exist so settlement always resolves
        require!(tiers[0].min_legs_true == 0, StrataError::MissingZeroTier);

        // Worst case is the top tier (tiers are monotonic, so the last one is highest).
        let top_tier_bps = tiers[tiers.len() - 1].payout_bps;
        let collateral_required = (max_capacity as u128)
            .checked_mul(top_tier_bps as u128).ok_or(StrataError::Overflow)?
            .checked_div(10_000u128).ok_or(StrataError::Overflow)? as u64;

        // Reserve against the pool: require enough capital sits unreserved/unowed in the
        // pool vault already (posted via fund_pool ahead of time), then book the reservation.
        let pool = &mut ctx.accounts.writer_pool;
        let rent_exempt = Rent::get()?.minimum_balance(PoolVault::SPACE);
        let vault_balance = ctx.accounts.pool_vault.to_account_info().lamports();
        let locked = pool.reserved.checked_add(pool.owed).ok_or(StrataError::Overflow)?;
        let available = vault_balance
            .checked_sub(rent_exempt).ok_or(StrataError::Overflow)?
            .checked_sub(locked).ok_or(StrataError::Overflow)?;
        require!(collateral_required <= available, StrataError::InsufficientPoolBalance);
        pool.reserved = pool.reserved.checked_add(collateral_required).ok_or(StrataError::Overflow)?;

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
        p.writer = ctx.accounts.payer.key();
        p.writer_pool = ctx.accounts.writer_pool.key();
        p.max_capacity = max_capacity;
        p.collateral_locked = collateral_required;
        p.bump = ctx.bumps.product;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(ctx.accounts.product.status == ProductStatus::Open, StrataError::ProductNotOpen);
        require!(Clock::get()?.unix_timestamp < ctx.accounts.product.closes_at, StrataError::ProductClosed);
        require!(amount > 0, StrataError::ZeroAmount);
        let new_total = ctx.accounts.product.total_stake.checked_add(amount).ok_or(StrataError::Overflow)?;
        require!(new_total <= ctx.accounts.product.max_capacity, StrataError::CapacityExceeded);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.pool_vault.to_account_info(),
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

        ctx.accounts.product.total_stake = new_total;
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
        // Defends against latency-sniping: a user who watches the live (unprovable) stream
        // and deposits right before closes_at, betting on something they already saw but
        // that TxLINE hasn't sealed into a batch yet. closes_at is unix seconds; TxLINE
        // timestamps are unix millis.
        let closes_at_ms = p.closes_at.checked_mul(1000).ok_or(StrataError::Overflow)?;
        require!(
            fixture_summary.update_stats.min_timestamp > closes_at_ms,
            StrataError::BatchPredatesClose
        );

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
    /// default to False so the product always resolves to a payout. Also moves this
    /// product's obligation from the pool's `reserved` (worst case, while open) to `owed`
    /// (the actual confirmed liability) — a pure transfer between the two counters, so the
    /// pool's solvency invariant (vault_balance >= reserved + owed) is unaffected by this
    /// instruction; it only ever changes which bucket an amount sits in, never the total.
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

        let total_owed = (p.total_stake as u128)
            .checked_mul(payout_bps as u128).ok_or(StrataError::Overflow)?
            .checked_div(10_000u128).ok_or(StrataError::Overflow)? as u64;

        let pool = &mut ctx.accounts.writer_pool;
        pool.reserved = pool.reserved.checked_sub(p.collateral_locked).ok_or(StrataError::Overflow)?;
        pool.owed = pool.owed.checked_add(total_owed).ok_or(StrataError::Overflow)?;

        p.status = ProductStatus::Settled;
        p.final_payout_bps = payout_bps;
        emit!(ProductSettled { product: p.key(), fixture_id: p.fixture_id, legs_true, payout_bps });
        Ok(())
    }

    /// Pays from the shared pool vault, not a per-product vault, and releases this
    /// buyer's share of `owed` on the pool — keeping the pool-wide invariant exact as
    /// claims happen one at a time, in any order, by any number of buyers.
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
            **ctx.accounts.pool_vault.to_account_info().try_borrow_mut_lamports()? -= payout;
            **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;
            ctx.accounts.writer_pool.owed = ctx.accounts.writer_pool.owed.checked_sub(payout).ok_or(StrataError::Overflow)?;
        }

        ctx.accounts.position.claimed = true;
        emit!(Claimed { product: p.key(), user: ctx.accounts.user.key(), payout });
        Ok(())
    }
}

// ---------- state ----------

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub txoracle_program_id: Pubkey,
    pub bump: u8,
}
impl Config {
    pub const SPACE: usize = 8 + 32 + 32 + 1;
}

#[account]
pub struct WriterPool {
    pub writer: Pubkey,
    pub reserved: u64,
    pub owed: u64,
    pub bump: u8,
    pub vault_bump: u8,
}
impl WriterPool {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 1 + 1;
}

#[account]
pub struct PoolVault {
    pub bump: u8,
}
impl PoolVault {
    pub const SPACE: usize = 8 + 1;
}

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
    pub writer: Pubkey,
    pub writer_pool: Pubkey,
    pub max_capacity: u64,
    pub collateral_locked: u64,
}
impl Product {
    // 8 disc + fixture_id 8 + nonce 4 + num_legs 1 + legs(MAX_LEGS*leg_size) + num_tiers 1 +
    // tiers(MAX_TIERS*tier_size) + leg_results(MAX_LEGS*1) + status 1 + closes_at 8 +
    // settle_deadline 8 + total_stake 8 + final_payout_bps 2 + bump 1 +
    // writer 32 + writer_pool 32 + max_capacity 8 + collateral_locked 8
    const LEG_SIZE: usize = 4 + 4 + 1 + 1 + 4 + 1;
    const TIER_SIZE: usize = 1 + 2;
    pub const SPACE: usize = 8 + 8 + 4 + 1 + (Self::LEG_SIZE * MAX_LEGS) + 1
        + (Self::TIER_SIZE * MAX_TIERS) + (1 * MAX_LEGS) + 1 + 8 + 8 + 8 + 2 + 1
        + 32 + 32 + 8 + 8;
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
pub struct InitializeConfig<'info> {
    #[account(
        init, payer = authority, space = Config::SPACE,
        seeds = [CONFIG_SEED], bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut, seeds = [CONFIG_SEED], bump = config.bump,
        has_one = authority @ StrataError::Unauthorized
    )]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeWriterPool<'info> {
    #[account(
        init, payer = writer, space = WriterPool::SPACE,
        seeds = [POOL_SEED, writer.key().as_ref()], bump
    )]
    pub writer_pool: Account<'info, WriterPool>,
    #[account(
        init, payer = writer, space = PoolVault::SPACE,
        seeds = [POOL_VAULT_SEED, writer.key().as_ref()], bump
    )]
    pub pool_vault: Account<'info, PoolVault>,
    #[account(mut)]
    pub writer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundPool<'info> {
    #[account(seeds = [POOL_SEED, writer.key().as_ref()], bump = writer_pool.bump, has_one = writer @ StrataError::Unauthorized)]
    pub writer_pool: Account<'info, WriterPool>,
    #[account(mut, seeds = [POOL_VAULT_SEED, writer.key().as_ref()], bump = writer_pool.vault_bump)]
    pub pool_vault: Account<'info, PoolVault>,
    #[account(mut)]
    pub writer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawFromPool<'info> {
    #[account(seeds = [POOL_SEED, writer.key().as_ref()], bump = writer_pool.bump, has_one = writer @ StrataError::Unauthorized)]
    pub writer_pool: Account<'info, WriterPool>,
    #[account(mut, seeds = [POOL_VAULT_SEED, writer.key().as_ref()], bump = writer_pool.vault_bump)]
    pub pool_vault: Account<'info, PoolVault>,
    #[account(mut)]
    pub writer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(fixture_id: i64, nonce: u32)]
pub struct CreateProduct<'info> {
    #[account(
        init, payer = payer, space = Product::SPACE,
        seeds = [PRODUCT_SEED, &fixture_id.to_le_bytes(), &nonce.to_le_bytes()], bump
    )]
    pub product: Account<'info, Product>,
    // seeds alone prove payer owns this pool — only one WriterPool exists per writer key.
    #[account(mut, seeds = [POOL_SEED, payer.key().as_ref()], bump = writer_pool.bump)]
    pub writer_pool: Account<'info, WriterPool>,
    #[account(seeds = [POOL_VAULT_SEED, payer.key().as_ref()], bump = writer_pool.vault_bump)]
    pub pool_vault: Account<'info, PoolVault>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [PRODUCT_SEED, &product.fixture_id.to_le_bytes(), &product.nonce.to_le_bytes()], bump = product.bump)]
    pub product: Account<'info, Product>,
    #[account(mut, seeds = [POOL_VAULT_SEED, product.writer.as_ref()], bump)]
    pub pool_vault: Account<'info, PoolVault>,
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
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, Config>,
    /// CHECK: must match config.txoracle_program_id
    #[account(address = config.txoracle_program_id)]
    pub txoracle_program: UncheckedAccount<'info>,
    /// CHECK: daily_scores roots PDA; the oracle program validates its discriminator+owner internally
    #[account(owner = config.txoracle_program_id)]
    pub daily_scores_merkle_roots: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct FinalizeProduct<'info> {
    #[account(mut, seeds = [PRODUCT_SEED, &product.fixture_id.to_le_bytes(), &product.nonce.to_le_bytes()], bump = product.bump)]
    pub product: Account<'info, Product>,
    #[account(mut, seeds = [POOL_SEED, product.writer.as_ref()], bump = writer_pool.bump, address = product.writer_pool @ StrataError::Unauthorized)]
    pub writer_pool: Account<'info, WriterPool>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(seeds = [PRODUCT_SEED, &product.fixture_id.to_le_bytes(), &product.nonce.to_le_bytes()], bump = product.bump)]
    pub product: Account<'info, Product>,
    #[account(mut, seeds = [POOL_SEED, product.writer.as_ref()], bump = writer_pool.bump, address = product.writer_pool @ StrataError::Unauthorized)]
    pub writer_pool: Account<'info, WriterPool>,
    #[account(mut, seeds = [POOL_VAULT_SEED, product.writer.as_ref()], bump = writer_pool.vault_bump)]
    pub pool_vault: Account<'info, PoolVault>,
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

#[event]
pub struct PoolWithdrawn {
    pub writer: Pubkey,
    pub amount: u64,
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
    #[msg("withdrawal would dip into reserved or owed pool capital")] InsufficientPoolBalance,
    #[msg("deposit would exceed product's max_capacity")] CapacityExceeded,
    #[msg("too early to settle, wait for closes_at")] TooEarlyToSettle,
    #[msg("bad leg index")] BadLegIndex,
    #[msg("leg already settled")] LegAlreadySettled,
    #[msg("fixture id mismatch")] FixtureMismatch,
    #[msg("batch predates closes_at — can't settle on data that existed before deposits closed")] BatchPredatesClose,
    #[msg("stat key mismatch")] StatKeyMismatch,
    #[msg("leg requires a second stat term")] MissingSecondStat,
    #[msg("legs still pending and before settle_deadline")] LegsStillPending,
    #[msg("product not settled")] NotSettled,
    #[msg("already claimed")] AlreadyClaimed,
    #[msg("nothing to claim")] NothingToClaim,
    #[msg("unauthorized")] Unauthorized,
    #[msg("overflow")] Overflow,
}
