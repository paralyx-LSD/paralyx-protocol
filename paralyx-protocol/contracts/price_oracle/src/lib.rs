#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Symbol, I128, symbol_short
};

pub(crate) const DAY_IN_LEDGERS: u32 = 17280;
pub(crate) const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
pub(crate) const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Price(Symbol), // asset symbol -> price in USD (with 7 decimals)
    LastUpdated(Symbol), // asset symbol -> last update timestamp
}

#[contract]
pub struct PriceOracle;

#[contractimpl]
impl PriceOracle {
    /// Initialize the price oracle contract
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        
        env.storage()
            .instance()
            .bump(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }

    /// Set price for an asset (admin only)
    pub fn set_price(env: Env, asset: Symbol, price_usd: I128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if price_usd <= I128::new(&env, 0) {
            panic!("price must be positive");
        }

        let current_ledger = env.ledger().sequence();
        
        env.storage().instance().set(&DataKey::Price(asset.clone()), &price_usd);
        env.storage().instance().set(&DataKey::LastUpdated(asset.clone()), &current_ledger);

        env.events().publish((symbol_short!("price_set"), asset.clone()), price_usd);
    }

    /// Get price for an asset in USD (with 7 decimals)
    pub fn get_price(env: Env, asset: Symbol) -> I128 {
        env.storage()
            .instance()
            .get(&DataKey::Price(asset.clone()))
            .unwrap_or_else(|| panic!("price not set for asset"))
    }

    /// Get the last update time for an asset's price
    pub fn get_last_updated(env: Env, asset: Symbol) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::LastUpdated(asset.clone()))
            .unwrap_or(0)
    }

    /// Check if price data is fresh (updated within specified ledgers)
    pub fn is_price_fresh(env: Env, asset: Symbol, max_age_ledgers: u32) -> bool {
        let last_updated = Self::get_last_updated(env.clone(), asset);
        let current_ledger = env.ledger().sequence();
        
        if last_updated == 0 {
            return false; // Never been updated
        }
        
        (current_ledger - last_updated) <= max_age_ledgers
    }

    /// Get price with freshness check
    pub fn get_price_checked(env: Env, asset: Symbol, max_age_ledgers: u32) -> I128 {
        if !Self::is_price_fresh(env.clone(), asset.clone(), max_age_ledgers) {
            panic!("price data too old");
        }
        
        Self::get_price(env, asset)
    }

    /// Batch set multiple prices (admin only)
    pub fn batch_set_prices(env: Env, assets: soroban_sdk::Vec<Symbol>, prices: soroban_sdk::Vec<I128>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if assets.len() != prices.len() {
            panic!("assets and prices length mismatch");
        }

        let current_ledger = env.ledger().sequence();

        for i in 0..assets.len() {
            let asset = assets.get(i).unwrap();
            let price = prices.get(i).unwrap();

            if price <= I128::new(&env, 0) {
                panic!("all prices must be positive");
            }

            env.storage().instance().set(&DataKey::Price(asset.clone()), &price);
            env.storage().instance().set(&DataKey::LastUpdated(asset.clone()), &current_ledger);

            env.events().publish((symbol_short!("price_set"), asset.clone()), price);
        }
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Update admin (current admin only)
    pub fn update_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.events().publish((symbol_short!("admin_upd"),), new_admin);
    }

    /// Convert asset amount to USD value
    pub fn to_usd_value(env: Env, asset: Symbol, amount: I128) -> I128 {
        let price = Self::get_price(env.clone(), asset);
        amount.mul(&price).div(&I128::new(&env, 1_0000000))
    }

    /// Convert USD value to asset amount
    pub fn from_usd_value(env: Env, asset: Symbol, usd_value: I128) -> I128 {
        let price = Self::get_price(env.clone(), asset);
        usd_value.mul(&I128::new(&env, 1_0000000)).div(&price)
    }
}

mod test; 