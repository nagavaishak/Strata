use anchor_lang::prelude::*;

declare_id!("37E8GYEQhcLdk9jneEAsWaPvKCyyJ1LF19iJNzNUUPRs");

#[program]
pub mod strata {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
