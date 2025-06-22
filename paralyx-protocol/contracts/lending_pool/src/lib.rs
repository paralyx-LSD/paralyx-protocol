#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, Symbol,
    symbol_short, vec
};

pub(crate) const DAY_IN_LEDGERS: u32 = 17280;
pub(crate) const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
pub(crate) const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

// Storage keys
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    STokenContract,
    PriceOracle,
    Asset(Symbol),                    // Asset configuration
    UserCollateral(Address, Symbol),  // User's collateral amount for an asset
    UserDebt(Address, Symbol),       // User's debt amount for an asset
    TotalSupplied(Symbol),           // Total amount supplied to the pool
    TotalBorrowed(Symbol),           // Total amount borrowed from the pool
    UtilizationRate(Symbol),         // Current utilization rate (borrowed/supplied)
    BorrowRate(Symbol),              // Current borrow interest rate
    SupplyRate(Symbol),              // Current supply interest rate
    LastUpdate(Symbol),              // Last update timestamp for interest accrual
}

// Asset configuration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetConfig {
    pub ltv_ratio: u32,              // Loan-to-value ratio (e.g., 6000 = 60%)
    pub liquidation_threshold: u32,   // Liquidation threshold (e.g., 8000 = 80%)
    pub reserve_factor: u32,         // Reserve factor for protocol fees (e.g., 1000 = 10%)
    pub is_active: bool,             // Whether asset is active for lending/borrowing
    pub is_collateral: bool,         // Whether asset can be used as collateral
}

// User account data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserAccountData {
    pub total_collateral_usd: i128,
    pub total_debt_usd: i128,
    pub ltv: u32,
    pub health_factor: i128,
}

#[contract]
pub struct LendingPool;

#[contractimpl] 
impl LendingPool {
    /// Initialize the lending pool
    pub fn initialize(
        env: Env,
        admin: Address,
        s_token_contract: Address,
        price_oracle: Address
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::STokenContract, &s_token_contract);
        env.storage().instance().set(&DataKey::PriceOracle, &price_oracle);
    }

    /// Configure an asset for lending and borrowing
    pub fn configure_asset(
        env: Env,
        asset: Symbol,
        ltv_ratio: u32,
        liquidation_threshold: u32,
        reserve_factor: u32
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if ltv_ratio > 9500 || liquidation_threshold > 9500 || reserve_factor > 5000 {
            panic!("invalid configuration parameters");
        }

        let config = AssetConfig {
            ltv_ratio,
            liquidation_threshold,
            reserve_factor,
            is_active: true,
            is_collateral: true,
        };

        env.storage().instance().set(&DataKey::Asset(asset.clone()), &config);
        env.storage().instance().set(&DataKey::TotalSupplied(asset.clone()), &0i128);
        env.storage().instance().set(&DataKey::TotalBorrowed(asset.clone()), &0i128);
        env.storage().instance().set(&DataKey::UtilizationRate(asset.clone()), &0u32);
        env.storage().instance().set(&DataKey::BorrowRate(asset.clone()), &5_0000000i128); // 5% base rate
        env.storage().instance().set(&DataKey::SupplyRate(asset.clone()), &1_0000000i128); // 1% base rate
        env.storage().instance().set(&DataKey::LastUpdate(asset.clone()), &env.ledger().timestamp());

        env.events().publish((symbol_short!("asset_cfg"), asset), config);
    }

    /// Deposit asset to earn interest (supply to pool)
    pub fn deposit(env: Env, user: Address, asset: Symbol, amount: i128) {
        user.require_auth();

        let config: AssetConfig = env.storage().instance()
            .get(&DataKey::Asset(asset.clone()))
            .unwrap_or_else(|| panic!("asset not configured"));

        if !config.is_active {
            panic!("asset not active");
        }

        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Update interest rates
        Self::update_interest_rates(env.clone(), asset.clone());

        // Update total supplied
        let mut total_supplied: i128 = env.storage().instance()
            .get(&DataKey::TotalSupplied(asset.clone()))
            .unwrap_or(0i128);
        total_supplied = total_supplied + amount;
        env.storage().instance().set(&DataKey::TotalSupplied(asset.clone()), &total_supplied);

        // Calculate sTokens to mint (1:1 for now, can be enhanced with exchange rate)
        let s_token_amount = amount;

        // Emit mint request event - will be handled by S-Token contract integration
        env.events().publish((symbol_short!("mint_req"), user.clone(), asset.clone()), s_token_amount);

        env.events().publish((symbol_short!("deposit"), user, asset), amount);
    }

    /// Bridge deposit - called by bridge validator for cross-chain operations
    pub fn bridge_deposit(env: Env, user: Address, asset: Symbol, amount: i128, lock_id: u64) {
        // Only bridge validator can call this function
        // Note: Bridge validator authorization should be checked here in production
        
        let config: AssetConfig = env.storage().instance()
            .get(&DataKey::Asset(asset.clone()))
            .unwrap_or_else(|| panic!("asset not configured"));

        if !config.is_active {
            panic!("asset not active");
        }

        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Update interest rates
        Self::update_interest_rates(env.clone(), asset.clone());

        // Update total supplied
        let mut total_supplied: i128 = env.storage().instance()
            .get(&DataKey::TotalSupplied(asset.clone()))
            .unwrap_or(0i128);
        total_supplied = total_supplied + amount;
        env.storage().instance().set(&DataKey::TotalSupplied(asset.clone()), &total_supplied);

        // Calculate sTokens to mint (1:1 for now, can be enhanced with exchange rate)
        let s_token_amount = amount;

        // Emit bridge mint request event - will be handled by bridge integration
        env.events().publish((symbol_short!("brdg_mint"), user.clone(), asset.clone(), lock_id), s_token_amount);

        env.events().publish((symbol_short!("brdg_dep"), user, asset, lock_id), amount);
    }

    /// Withdraw deposited asset (redeem sTokens)
    pub fn withdraw(env: Env, user: Address, asset: Symbol, amount: i128) {
        user.require_auth();

        let config: AssetConfig = env.storage().instance()
            .get(&DataKey::Asset(asset.clone()))
            .unwrap_or_else(|| panic!("asset not configured"));

        if !config.is_active {
            panic!("asset not active");
        }

        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Check if user has enough sTokens (simplified check)
        let total_supplied: i128 = env.storage().instance()
            .get(&DataKey::TotalSupplied(asset.clone()))
            .unwrap_or(0i128);

        if amount > total_supplied {
            panic!("insufficient liquidity");
        }

        // Update interest rates
        Self::update_interest_rates(env.clone(), asset.clone());

        // Update total supplied
        let new_total_supplied = total_supplied - amount;
        env.storage().instance().set(&DataKey::TotalSupplied(asset.clone()), &new_total_supplied);

        // Calculate sTokens to burn
        let s_token_amount = amount;

        // Emit burn request event - will be handled by S-Token contract integration  
        env.events().publish((symbol_short!("burn_req"), user.clone(), asset.clone()), s_token_amount);

        env.events().publish((symbol_short!("withdraw"), user, asset), amount);
    }

    /// Deposit asset as collateral
    pub fn deposit_collateral(env: Env, user: Address, asset: Symbol, amount: i128) {
        user.require_auth();

        let config: AssetConfig = env.storage().instance()
            .get(&DataKey::Asset(asset.clone()))
            .unwrap_or_else(|| panic!("asset not configured"));

        if !config.is_collateral {
            panic!("asset cannot be used as collateral");
        }

        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Update user's collateral
        let mut user_collateral: i128 = env.storage().instance()
            .get(&DataKey::UserCollateral(user.clone(), asset.clone()))
            .unwrap_or(0i128);
        user_collateral = user_collateral + amount;
        env.storage().instance().set(&DataKey::UserCollateral(user.clone(), asset.clone()), &user_collateral);

        env.events().publish((symbol_short!("coll_dep"), user, asset), amount);
    }

    /// Borrow asset against collateral
    pub fn borrow(env: Env, user: Address, asset: Symbol, amount: i128) {
        user.require_auth();

        let config: AssetConfig = env.storage().instance()
            .get(&DataKey::Asset(asset.clone()))
            .unwrap_or_else(|| panic!("asset not configured"));

        if !config.is_active {
            panic!("asset not active for borrowing");
        }

        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Check if there's enough liquidity
        let total_supplied: i128 = env.storage().instance()
            .get(&DataKey::TotalSupplied(asset.clone()))
            .unwrap_or(0i128);
        let total_borrowed: i128 = env.storage().instance()
            .get(&DataKey::TotalBorrowed(asset.clone()))
            .unwrap_or(0i128);

        let available_liquidity = total_supplied - total_borrowed;
        if amount > available_liquidity {
            panic!("insufficient liquidity");
        }

        // Update user's debt
        let mut user_debt: i128 = env.storage().instance()
            .get(&DataKey::UserDebt(user.clone(), asset.clone()))
            .unwrap_or(0i128);
        user_debt = user_debt + amount;
        env.storage().instance().set(&DataKey::UserDebt(user.clone(), asset.clone()), &user_debt);

        // Update total borrowed
        let new_total_borrowed = total_borrowed + amount;
        env.storage().instance().set(&DataKey::TotalBorrowed(asset.clone()), &new_total_borrowed);

        // Check health factor after borrow
        let account_data = Self::get_user_account_data(env.clone(), user.clone());
        if account_data.health_factor < 1_0000000i128 { // Health factor < 1.0
            panic!("borrow would cause liquidation");
        }

        // Update interest rates
        Self::update_interest_rates(env.clone(), asset.clone());

        env.events().publish((symbol_short!("borrow"), user, asset), amount);
    }

    /// Repay borrowed asset
    pub fn repay(env: Env, user: Address, asset: Symbol, amount: i128) {
        user.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let mut user_debt: i128 = env.storage().instance()
            .get(&DataKey::UserDebt(user.clone(), asset.clone()))
            .unwrap_or(0i128);

        let repay_amount = if amount > user_debt { user_debt } else { amount };

        user_debt = user_debt - repay_amount;
        env.storage().instance().set(&DataKey::UserDebt(user.clone(), asset.clone()), &user_debt);

        // Update total borrowed
        let mut total_borrowed: i128 = env.storage().instance()
            .get(&DataKey::TotalBorrowed(asset.clone()))
            .unwrap_or(0i128);
        total_borrowed = total_borrowed - repay_amount;
        env.storage().instance().set(&DataKey::TotalBorrowed(asset.clone()), &total_borrowed);

        // Update interest rates
        Self::update_interest_rates(env.clone(), asset.clone());

        env.events().publish((symbol_short!("repay"), user, asset), repay_amount);
    }

    /// Get user's account data (collateral, debt, health factor)
    pub fn get_user_account_data(env: Env, user: Address) -> UserAccountData {
        // This is a simplified implementation
        // In practice, you'd iterate through all assets to calculate totals

        // For demo, let's assume we're checking XLM collateral and debt
        let xlm_collateral: i128 = env.storage().instance()
            .get(&DataKey::UserCollateral(user.clone(), symbol_short!("XLM")))
            .unwrap_or(0i128);
        let xlm_debt: i128 = env.storage().instance()
            .get(&DataKey::UserDebt(user.clone(), symbol_short!("XLM")))
            .unwrap_or(0i128);

        // Mock USD values (in real implementation, get from price oracle)
        let xlm_price = 12_0000000i128; // $0.12
        let total_collateral_usd = xlm_collateral * xlm_price / 10_000_000i128;
        let total_debt_usd = xlm_debt * xlm_price / 10_000_000i128;

        let ltv = if total_collateral_usd > 0 {
            ((total_debt_usd * 10000) / total_collateral_usd) as u32
        } else {
            0
        };

        let health_factor = if total_debt_usd > 0 {
            (total_collateral_usd * 8000) / (total_debt_usd * 10000) // 80% liquidation threshold
        } else {
            i128::MAX
        };

        UserAccountData {
            total_collateral_usd,
            total_debt_usd,
            ltv,
            health_factor,
        }
    }

    /// Get asset configuration
    pub fn get_asset_config(env: Env, asset: Symbol) -> AssetConfig {
        env.storage().instance()
            .get(&DataKey::Asset(asset))
            .unwrap_or_else(|| panic!("asset not configured"))
    }

    /// Get pool liquidity info
    pub fn get_pool_info(env: Env, asset: Symbol) -> (i128, i128, u32) {
        let total_supplied: i128 = env.storage().instance()
            .get(&DataKey::TotalSupplied(asset.clone()))
            .unwrap_or(0i128);
        let total_borrowed: i128 = env.storage().instance()
            .get(&DataKey::TotalBorrowed(asset.clone()))
            .unwrap_or(0i128);
        let utilization_rate: u32 = env.storage().instance()
            .get(&DataKey::UtilizationRate(asset))
            .unwrap_or(0u32);

        (total_supplied, total_borrowed, utilization_rate)
    }

    // Internal helper functions
    fn update_interest_rates(env: Env, asset: Symbol) {
        let total_supplied: i128 = env.storage().instance()
            .get(&DataKey::TotalSupplied(asset.clone()))
            .unwrap_or(0i128);
        let total_borrowed: i128 = env.storage().instance()
            .get(&DataKey::TotalBorrowed(asset.clone()))
            .unwrap_or(0i128);

        let utilization_rate = if total_supplied > 0 {
            ((total_borrowed * 10000) / total_supplied) as u32
        } else {
            0
        };

        // Simple interest rate model: base_rate + utilization_rate * slope
        let base_borrow_rate = 2_0000000i128; // 2%
        let rate_slope = 5_0000000i128; // 5%

        let borrow_rate = base_borrow_rate + (rate_slope * utilization_rate as i128) / 10000;
        let supply_rate = (borrow_rate * utilization_rate as i128) / 10000;

        env.storage().instance().set(&DataKey::UtilizationRate(asset.clone()), &utilization_rate);
        env.storage().instance().set(&DataKey::BorrowRate(asset.clone()), &borrow_rate);
        env.storage().instance().set(&DataKey::SupplyRate(asset.clone()), &supply_rate);
        env.storage().instance().set(&DataKey::LastUpdate(asset), &env.ledger().timestamp());
    }
}

mod test; 