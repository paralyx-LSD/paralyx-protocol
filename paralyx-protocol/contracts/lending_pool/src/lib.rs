#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Symbol, I128, symbol_short
};

pub(crate) const DAY_IN_LEDGERS: u32 = 17280;
pub(crate) const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
pub(crate) const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    PriceOracle,
    // Asset configuration
    Asset(Symbol),              // symbol -> asset contract address
    SToken(Symbol),             // symbol -> sToken contract address
    
    // Pool state
    TotalLiquidity(Symbol),     // symbol -> total deposited amount
    TotalBorrows(Symbol),       // symbol -> total borrowed amount
    
    // User positions
    UserCollateral(Address, Symbol), // (user, asset) -> collateral amount
    UserBorrow(Address, Symbol),     // (user, asset) -> borrowed amount
    
    // Risk parameters
    LtvRatio(Symbol),           // symbol -> loan-to-value ratio (basis points)
    LiquidationThreshold(Symbol), // symbol -> liquidation threshold (basis points)
    
    // Interest rates (simplified - fixed for now)
    BorrowRate(Symbol),         // symbol -> annual borrow rate (basis points)
    SupplyRate(Symbol),         // symbol -> annual supply rate (basis points)
    
    // Timestamps for interest accrual
    LastUpdateTime(Symbol),     // symbol -> last interest update timestamp
}

#[derive(Clone)]
#[contracttype]
pub struct AssetConfig {
    pub asset_address: Address,
    pub s_token_address: Address,
    pub ltv_ratio: u32,              // basis points (6000 = 60%)
    pub liquidation_threshold: u32,   // basis points (8000 = 80%)
    pub borrow_rate: u32,            // basis points (500 = 5% annually)
    pub supply_rate: u32,            // basis points (300 = 3% annually)
}

#[contract]
pub struct LendingPool;

#[contractimpl]
impl LendingPool {
    /// Initialize the lending pool
    pub fn initialize(env: Env, admin: Address, price_oracle: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PriceOracle, &price_oracle);

        env.storage()
            .instance()
            .bump(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }

    /// Add a new asset to the lending pool
    pub fn add_asset(
        env: Env, 
        asset_symbol: Symbol,
        config: AssetConfig
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().instance().set(&DataKey::Asset(asset_symbol.clone()), &config.asset_address);
        env.storage().instance().set(&DataKey::SToken(asset_symbol.clone()), &config.s_token_address);
        env.storage().instance().set(&DataKey::LtvRatio(asset_symbol.clone()), &config.ltv_ratio);
        env.storage().instance().set(&DataKey::LiquidationThreshold(asset_symbol.clone()), &config.liquidation_threshold);
        env.storage().instance().set(&DataKey::BorrowRate(asset_symbol.clone()), &config.borrow_rate);
        env.storage().instance().set(&DataKey::SupplyRate(asset_symbol.clone()), &config.supply_rate);
        
        // Initialize pool state
        env.storage().instance().set(&DataKey::TotalLiquidity(asset_symbol.clone()), &I128::new(&env, 0));
        env.storage().instance().set(&DataKey::TotalBorrows(asset_symbol.clone()), &I128::new(&env, 0));
        env.storage().instance().set(&DataKey::LastUpdateTime(asset_symbol.clone()), &env.ledger().timestamp());

        env.events().publish((symbol_short!("asset_add"), asset_symbol), config);
    }

    /// Deposit assets to the pool and receive sTokens
    pub fn deposit(env: Env, user: Address, asset_symbol: Symbol, amount: I128) {
        user.require_auth();

        if amount <= I128::new(&env, 0) {
            panic!("amount must be positive");
        }

        let asset_address: Address = env.storage().instance().get(&DataKey::Asset(asset_symbol.clone())).unwrap();
        let s_token_address: Address = env.storage().instance().get(&DataKey::SToken(asset_symbol.clone())).unwrap();

        // Transfer tokens from user to contract
        let token_client = token::Client::new(&env, &asset_address);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        // Update total liquidity
        let mut total_liquidity: I128 = env.storage().instance().get(&DataKey::TotalLiquidity(asset_symbol.clone())).unwrap_or(I128::new(&env, 0));
        total_liquidity = total_liquidity.add(&amount);
        env.storage().instance().set(&DataKey::TotalLiquidity(asset_symbol.clone()), &total_liquidity);

        // Mint sTokens to user (1:1 for now - can be improved with interest accrual)
        env.invoke_contract::<()>(&s_token_address, &symbol_short!("mint"), soroban_sdk::vec![&env, user.clone().into_val(&env), amount.into_val(&env)]);

        env.events().publish((symbol_short!("deposit"), user, asset_symbol), amount);
    }

    /// Withdraw assets from the pool by burning sTokens
    pub fn withdraw(env: Env, user: Address, asset_symbol: Symbol, s_token_amount: I128) {
        user.require_auth();

        if s_token_amount <= I128::new(&env, 0) {
            panic!("amount must be positive");
        }

        let asset_address: Address = env.storage().instance().get(&DataKey::Asset(asset_symbol.clone())).unwrap();
        let s_token_address: Address = env.storage().instance().get(&DataKey::SToken(asset_symbol.clone())).unwrap();

        // Convert sTokens to underlying asset amount (1:1 for now)
        let underlying_amount = s_token_amount; // TODO: Apply exchange rate

        // Check available liquidity
        let total_liquidity: I128 = env.storage().instance().get(&DataKey::TotalLiquidity(asset_symbol.clone())).unwrap_or(I128::new(&env, 0));
        let total_borrows: I128 = env.storage().instance().get(&DataKey::TotalBorrows(asset_symbol.clone())).unwrap_or(I128::new(&env, 0));
        let available_liquidity = total_liquidity.sub(&total_borrows);

        if underlying_amount > available_liquidity {
            panic!("insufficient liquidity");
        }

        // Burn sTokens from user
        env.invoke_contract::<()>(&s_token_address, &symbol_short!("burn"), soroban_sdk::vec![&env, user.clone().into_val(&env), s_token_amount.into_val(&env)]);

        // Update total liquidity
        let new_total_liquidity = total_liquidity.sub(&underlying_amount);
        env.storage().instance().set(&DataKey::TotalLiquidity(asset_symbol.clone()), &new_total_liquidity);

        // Transfer underlying tokens to user
        let token_client = token::Client::new(&env, &asset_address);
        token_client.transfer(&env.current_contract_address(), &user, &underlying_amount);

        env.events().publish((symbol_short!("withdraw"), user, asset_symbol), underlying_amount);
    }

    /// Use deposited assets as collateral to borrow other assets
    pub fn borrow(env: Env, user: Address, collateral_symbol: Symbol, borrow_symbol: Symbol, borrow_amount: I128) {
        user.require_auth();

        if borrow_amount <= I128::new(&env, 0) {
            panic!("amount must be positive");
        }

        // Check if user has sufficient collateral
        let user_collateral = Self::get_user_collateral(env.clone(), user.clone(), collateral_symbol.clone());
        if user_collateral <= I128::new(&env, 0) {
            panic!("no collateral deposited");
        }

        // Calculate borrowing power
        let max_borrow_usd = Self::calculate_max_borrow(env.clone(), user.clone(), collateral_symbol.clone(), borrow_symbol.clone());
        let borrow_value_usd = Self::get_asset_value_usd(env.clone(), borrow_symbol.clone(), borrow_amount);

        if borrow_value_usd > max_borrow_usd {
            panic!("insufficient collateral");
        }

        // Check available liquidity in the borrow asset pool
        let total_liquidity: I128 = env.storage().instance().get(&DataKey::TotalLiquidity(borrow_symbol.clone())).unwrap_or(I128::new(&env, 0));
        let total_borrows: I128 = env.storage().instance().get(&DataKey::TotalBorrows(borrow_symbol.clone())).unwrap_or(I128::new(&env, 0));
        let available_liquidity = total_liquidity.sub(&total_borrows);

        if borrow_amount > available_liquidity {
            panic!("insufficient pool liquidity");
        }

        // Update user's borrow position
        let current_borrow: I128 = env.storage().instance().get(&DataKey::UserBorrow(user.clone(), borrow_symbol.clone())).unwrap_or(I128::new(&env, 0));
        let new_borrow = current_borrow.add(&borrow_amount);
        env.storage().instance().set(&DataKey::UserBorrow(user.clone(), borrow_symbol.clone()), &new_borrow);

        // Update total borrows
        let new_total_borrows = total_borrows.add(&borrow_amount);
        env.storage().instance().set(&DataKey::TotalBorrows(borrow_symbol.clone()), &new_total_borrows);

        // Transfer borrowed tokens to user
        let borrow_asset_address: Address = env.storage().instance().get(&DataKey::Asset(borrow_symbol.clone())).unwrap();
        let token_client = token::Client::new(&env, &borrow_asset_address);
        token_client.transfer(&env.current_contract_address(), &user, &borrow_amount);

        env.events().publish((symbol_short!("borrow"), user.clone(), borrow_symbol.clone()), borrow_amount);
    }

    /// Repay borrowed assets
    pub fn repay(env: Env, user: Address, asset_symbol: Symbol, repay_amount: I128) {
        user.require_auth();

        if repay_amount <= I128::new(&env, 0) {
            panic!("amount must be positive");
        }

        let current_borrow: I128 = env.storage().instance().get(&DataKey::UserBorrow(user.clone(), asset_symbol.clone())).unwrap_or(I128::new(&env, 0));
        
        if repay_amount > current_borrow {
            panic!("repay amount exceeds debt");
        }

        // Transfer repayment from user to contract
        let asset_address: Address = env.storage().instance().get(&DataKey::Asset(asset_symbol.clone())).unwrap();
        let token_client = token::Client::new(&env, &asset_address);
        token_client.transfer(&user, &env.current_contract_address(), &repay_amount);

        // Update user's borrow position
        let new_borrow = current_borrow.sub(&repay_amount);
        env.storage().instance().set(&DataKey::UserBorrow(user.clone(), asset_symbol.clone()), &new_borrow);

        // Update total borrows
        let total_borrows: I128 = env.storage().instance().get(&DataKey::TotalBorrows(asset_symbol.clone())).unwrap();
        let new_total_borrows = total_borrows.sub(&repay_amount);
        env.storage().instance().set(&DataKey::TotalBorrows(asset_symbol.clone()), &new_total_borrows);

        env.events().publish((symbol_short!("repay"), user.clone(), asset_symbol.clone()), repay_amount);
    }

    /// Enable an asset as collateral for the user
    pub fn enable_collateral(env: Env, user: Address, asset_symbol: Symbol) {
        user.require_auth();

        // Get user's sToken balance (this represents their deposit)
        let s_token_address: Address = env.storage().instance().get(&DataKey::SToken(asset_symbol.clone())).unwrap();
        let s_token_balance: I128 = env.invoke_contract(&s_token_address, &symbol_short!("balance"), soroban_sdk::vec![&env, user.clone().into_val(&env)]);

        if s_token_balance <= I128::new(&env, 0) {
            panic!("no deposits to use as collateral");
        }

        // Convert sToken balance to underlying amount (1:1 for now)
        let collateral_amount = s_token_balance;

        env.storage().instance().set(&DataKey::UserCollateral(user.clone(), asset_symbol.clone()), &collateral_amount);
        env.events().publish((symbol_short!("coll_en"), user.clone(), asset_symbol.clone()), collateral_amount);
    }

    /// Helper function to get user's collateral amount
    pub fn get_user_collateral(env: Env, user: Address, asset_symbol: Symbol) -> I128 {
        env.storage().instance().get(&DataKey::UserCollateral(user, asset_symbol)).unwrap_or(I128::new(&env, 0))
    }

    /// Helper function to get user's borrow amount
    pub fn get_user_borrow(env: Env, user: Address, asset_symbol: Symbol) -> I128 {
        env.storage().instance().get(&DataKey::UserBorrow(user, asset_symbol)).unwrap_or(I128::new(&env, 0))
    }

    /// Calculate maximum borrowing capacity for a user
    pub fn calculate_max_borrow(env: Env, user: Address, collateral_symbol: Symbol, borrow_symbol: Symbol) -> I128 {
        let collateral_amount = Self::get_user_collateral(env.clone(), user, collateral_symbol.clone());
        
        if collateral_amount <= I128::new(&env, 0) {
            return I128::new(&env, 0);
        }

        let collateral_value_usd = Self::get_asset_value_usd(env.clone(), collateral_symbol.clone(), collateral_amount);
        let ltv_ratio: u32 = env.storage().instance().get(&DataKey::LtvRatio(collateral_symbol)).unwrap_or(6000); // Default 60%
        
        // Apply LTV ratio
        let max_borrow_usd = collateral_value_usd.mul(&I128::new(&env, ltv_ratio as i128)).div(&I128::new(&env, 10000));
        
        max_borrow_usd
    }

    /// Get asset value in USD using the price oracle
    pub fn get_asset_value_usd(env: Env, asset_symbol: Symbol, amount: I128) -> I128 {
        let price_oracle: Address = env.storage().instance().get(&DataKey::PriceOracle).unwrap();
        let asset_price_usd: I128 = env.invoke_contract(&price_oracle, &symbol_short!("get_price"), soroban_sdk::vec![&env, asset_symbol.into_val(&env)]);
        
        amount.mul(&asset_price_usd).div(&I128::new(&env, 1_0000000))
    }

    /// Get pool info for an asset
    pub fn get_pool_info(env: Env, asset_symbol: Symbol) -> (I128, I128, I128) {
        let total_liquidity: I128 = env.storage().instance().get(&DataKey::TotalLiquidity(asset_symbol.clone())).unwrap_or(I128::new(&env, 0));
        let total_borrows: I128 = env.storage().instance().get(&DataKey::TotalBorrows(asset_symbol.clone())).unwrap_or(I128::new(&env, 0));
        let available_liquidity = total_liquidity.sub(&total_borrows);
        
        (total_liquidity, total_borrows, available_liquidity)
    }

    /// Check if a position is healthy (below liquidation threshold)
    pub fn is_position_healthy(env: Env, user: Address, collateral_symbol: Symbol, borrow_symbol: Symbol) -> bool {
        let collateral_amount = Self::get_user_collateral(env.clone(), user.clone(), collateral_symbol.clone());
        let borrow_amount = Self::get_user_borrow(env.clone(), user.clone(), borrow_symbol.clone());
        
        if borrow_amount <= I128::new(&env, 0) {
            return true; // No debt = healthy
        }

        if collateral_amount <= I128::new(&env, 0) {
            return false; // Debt but no collateral = unhealthy
        }

        let collateral_value_usd = Self::get_asset_value_usd(env.clone(), collateral_symbol.clone(), collateral_amount);
        let borrow_value_usd = Self::get_asset_value_usd(env.clone(), borrow_symbol.clone(), borrow_amount);
        
        let liquidation_threshold: u32 = env.storage().instance().get(&DataKey::LiquidationThreshold(collateral_symbol)).unwrap_or(8000); // Default 80%
        let max_debt_value_usd = collateral_value_usd.mul(&I128::new(&env, liquidation_threshold as i128)).div(&I128::new(&env, 10000));
        
        borrow_value_usd <= max_debt_value_usd
    }
}

mod test; 