#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, vec, Address, Env, Symbol, Vec,
    symbol_short
};

pub(crate) const DAY_IN_LEDGERS: u32 = 17280;
pub(crate) const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
pub(crate) const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Price(Symbol),
    LastUpdated(Symbol),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceData {
    pub price: i128,      // Price with 7 decimals
    pub timestamp: u64,   // Last update timestamp
}

#[contract]
pub struct PriceOracle;

#[contractimpl]
impl PriceOracle {
    /// Initialize the price oracle
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);

        // Set initial mock prices (for testing)
        Self::set_price_internal(env.clone(), symbol_short!("stETH"), 1500_0000000i128); // $1500
        Self::set_price_internal(env.clone(), symbol_short!("XLM"), 12_0000000i128);     // $0.12  
        Self::set_price_internal(env.clone(), symbol_short!("USDC"), 1_0000000i128);    // $1.00
    }

    /// Set price for an asset (admin only)
    pub fn set_price(env: Env, asset: Symbol, price: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        Self::set_price_internal(env, asset, price);
    }

    /// Set multiple prices at once (admin only)  
    pub fn set_prices(env: Env, assets: Vec<Symbol>, prices: Vec<i128>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if assets.len() != prices.len() {
            panic!("assets and prices length mismatch");
        }

        for i in 0..assets.len() {
            Self::set_price_internal(env.clone(), assets.get(i).unwrap(), prices.get(i).unwrap());
        }
    }

    /// Get price for an asset in USD (with 7 decimals)
    pub fn get_price(env: Env, asset: Symbol) -> i128 {
        let price_data: PriceData = env.storage()
            .instance()
            .get(&DataKey::Price(asset))
            .unwrap_or_else(|| panic!("price not found for asset"));

        // Check if price is fresh (within 1 hour = 3600 seconds)
        let current_timestamp = env.ledger().timestamp();
        if current_timestamp > price_data.timestamp + 3600 {
            panic!("price data is stale");
        }

        price_data.price
    }

    /// Get price with freshness check disabled (for testing)
    pub fn get_price_unchecked(env: Env, asset: Symbol) -> i128 {
        let price_data: PriceData = env.storage()
            .instance()
            .get(&DataKey::Price(asset))
            .unwrap_or_else(|| panic!("price not found for asset"));

        price_data.price
    }

    /// Get multiple prices at once
    pub fn get_prices(env: Env, assets: Vec<Symbol>) -> Vec<i128> {
        let mut prices = vec![&env];

        for i in 0..assets.len() {
            let price = Self::get_price(env.clone(), assets.get(i).unwrap());
            prices.push_back(price);
        }

        prices
    }

    /// Convert amount from one asset to USD value
    pub fn convert_to_usd(env: Env, asset: Symbol, amount: i128) -> i128 {
        let price = Self::get_price(env, asset);
        amount * price / 10_000_000i128
    }

    /// Convert USD value to asset amount
    pub fn convert_from_usd(env: Env, asset: Symbol, usd_amount: i128) -> i128 {
        let price = Self::get_price(env, asset);
        usd_amount * 10_000_000i128 / price
    }

    /// Get the timestamp of last price update
    pub fn get_last_updated(env: Env, asset: Symbol) -> u64 {
        let price_data: PriceData = env.storage()
            .instance()
            .get(&DataKey::Price(asset))
            .unwrap_or_else(|| panic!("price not found for asset"));

        price_data.timestamp
    }

    /// Check if price data is fresh (within 1 hour)
    pub fn is_price_fresh(env: Env, asset: Symbol) -> bool {
        if let Some(price_data) = env.storage().instance().get::<DataKey, PriceData>(&DataKey::Price(asset)) {
            let current_timestamp = env.ledger().timestamp();
            current_timestamp <= price_data.timestamp + 3600
        } else {
            false
        }
    }

    // Internal helper function
    fn set_price_internal(env: Env, asset: Symbol, price: i128) {
        if price <= 0 {
            panic!("price must be positive");
        }

        let current_timestamp = env.ledger().timestamp();
        let price_data = PriceData {
            price,
            timestamp: current_timestamp,
        };

        env.storage().instance().set(&DataKey::Price(asset.clone()), &price_data);

        env.events().publish((symbol_short!("price_upd"), asset), price);
    }
}

mod test; 