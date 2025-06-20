#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String,
    symbol_short
};

pub(crate) const DAY_IN_LEDGERS: u32 = 17280;
pub(crate) const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
pub(crate) const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    LendingPool,
    UnderlyingAsset,
    Name,
    Symbol,
    Decimals,
    TotalSupply,
    Balance(Address),
    ExchangeRate,
}

#[contract]
pub struct SToken;

#[contractimpl]
impl SToken {
    /// Initialize the sToken contract
    pub fn initialize(
        env: Env,
        admin: Address,
        lending_pool: Address,
        underlying_asset: Address,
        name: String,
        symbol: String,
        decimals: u32,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::LendingPool, &lending_pool);
        env.storage().instance().set(&DataKey::UnderlyingAsset, &underlying_asset);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
        env.storage().instance().set(&DataKey::ExchangeRate, &10_000_000i128); // 1.0 with 7 decimals
    }

    /// Mint new sTokens to a user (called by lending pool)
    pub fn mint(env: Env, to: Address, amount: i128) {
        let lending_pool: Address = env.storage().instance().get(&DataKey::LendingPool).unwrap();
        lending_pool.require_auth();

        let mut total_supply: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0i128);
        let mut balance: i128 = env.storage().instance().get(&DataKey::Balance(to.clone())).unwrap_or(0i128);

        total_supply = total_supply + amount;
        balance = balance + amount;

        env.storage().instance().set(&DataKey::TotalSupply, &total_supply);
        env.storage().instance().set(&DataKey::Balance(to.clone()), &balance);

        env.events().publish((symbol_short!("mint"), to.clone()), amount);
    }

    /// Burn sTokens from a user (called by lending pool)
    pub fn burn(env: Env, from: Address, amount: i128) {
        let lending_pool: Address = env.storage().instance().get(&DataKey::LendingPool).unwrap();
        lending_pool.require_auth();

        let mut total_supply: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap();
        let mut balance: i128 = env.storage().instance().get(&DataKey::Balance(from.clone())).unwrap();

        if balance < amount {
            panic!("insufficient balance");
        }

        total_supply = total_supply - amount;
        balance = balance - amount;

        env.storage().instance().set(&DataKey::TotalSupply, &total_supply);
        env.storage().instance().set(&DataKey::Balance(from.clone()), &balance);

        env.events().publish((symbol_short!("burn"), from.clone()), amount);
    }

    /// Get token balance for an address
    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage().instance().get(&DataKey::Balance(id)).unwrap_or(0i128)
    }

    /// Get total supply
    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0i128)
    }

    /// Get token name
    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    /// Get token symbol
    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&DataKey::Symbol).unwrap()
    }

    /// Get token decimals
    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Decimals).unwrap()
    }

    /// Get underlying asset
    pub fn underlying_asset(env: Env) -> Address {
        env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap()
    }

    /// Update exchange rate (called by lending pool to reflect accrued interest)
    pub fn update_exchange_rate(env: Env, new_rate: i128) {
        let lending_pool: Address = env.storage().instance().get(&DataKey::LendingPool).unwrap();
        lending_pool.require_auth();

        env.storage().instance().set(&DataKey::ExchangeRate, &new_rate);
        env.events().publish((symbol_short!("rate_upd"),), new_rate);
    }

    /// Get current exchange rate (how much underlying asset 1 sToken is worth)
    pub fn exchange_rate(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::ExchangeRate).unwrap_or(10_000_000i128)
    }

    /// Convert sToken amount to underlying asset amount
    pub fn s_token_to_underlying(env: Env, s_token_amount: i128) -> i128 {
        let rate = Self::exchange_rate(env.clone());
        s_token_amount * rate / 10_000_000i128
    }

    /// Convert underlying asset amount to sToken amount
    pub fn underlying_to_s_token(env: Env, underlying_amount: i128) -> i128 {
        let rate = Self::exchange_rate(env.clone());
        underlying_amount * 10_000_000i128 / rate
    }
}

mod test; 