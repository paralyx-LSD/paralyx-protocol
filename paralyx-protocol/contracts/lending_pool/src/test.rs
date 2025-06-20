#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke, Events},
    symbol_short, Address, Env, Symbol, IntoVal
};

fn create_lending_pool_contract<'a>(e: &Env) -> Address {
    e.register_contract(None, LendingPool {})
}

fn create_mock_token_contract<'a>(e: &Env) -> Address {
    e.register_contract(None, MockToken {})
}

fn create_mock_oracle_contract<'a>(e: &Env) -> Address {
    e.register_contract(None, MockOracle {})
}

// Mock token contract for testing
use soroban_sdk::{contract, contractimpl};

#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        // Mock implementation - just emit an event
        env.events().publish((symbol_short!("transfer"), from, to), amount);
    }
}

#[contract]
pub struct MockOracle;

#[contractimpl]
impl MockOracle {
    pub fn get_price(env: Env, asset: Symbol) -> i128 {
        // Mock prices for testing
        match asset {
            _ if asset == symbol_short!("XLM") => 12_0000000i128, // $0.12
            _ if asset == symbol_short!("USDC") => 1_0000000i128, // $1.00
            _ if asset == symbol_short!("stETH") => 1500_0000000i128, // $1500
            _ => 1_0000000i128, // Default $1.00
        }
    }
}

#[contract]
pub struct MockSToken;

#[contractimpl]
impl MockSToken {
    pub fn mint(env: Env, to: Address, amount: i128) {
        env.events().publish((symbol_short!("mint"), to), amount);
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        env.events().publish((symbol_short!("burn"), from), amount);
    }

    pub fn balance(env: Env, user: Address) -> i128 {
        // Return a fixed balance for testing
        1000_0000000i128
    }
}

fn create_mock_stoken_contract<'a>(e: &Env) -> Address {
    e.register_contract(None, MockSToken {})
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let s_token_contract = create_mock_stoken_contract(&env);

    client.initialize(&admin, &s_token_contract, &price_oracle);
}

#[test]
fn test_configure_asset() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let s_token_contract = create_mock_stoken_contract(&env);

    client.initialize(&admin, &s_token_contract, &price_oracle);

    let asset_symbol = symbol_short!("XLM");

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "configure_asset",
                args: (&asset_symbol, &6000u32, &8000u32, &1000u32).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).configure_asset(&asset_symbol, &6000u32, &8000u32, &1000u32);

    // Verify configuration is set
    let config = client.get_asset_config(&asset_symbol);
    assert_eq!(config.ltv_ratio, 6000u32);
    assert_eq!(config.liquidation_threshold, 8000u32);
    assert_eq!(config.reserve_factor, 1000u32);
}

#[test]
fn test_pool_info() {
    let env = Env::default();
    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let s_token_contract = create_mock_stoken_contract(&env);

    client.initialize(&admin, &s_token_contract, &price_oracle);

    let asset_symbol = symbol_short!("XLM");
    
    // Should return all zeros for non-configured asset
    let (total_supplied, total_borrowed, utilization_rate) = client.get_pool_info(&asset_symbol);
    assert_eq!(total_supplied, 0i128);
    assert_eq!(total_borrowed, 0i128);
    assert_eq!(utilization_rate, 0u32);
}

#[test]
fn test_user_account_data() {
    let env = Env::default();
    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let s_token_contract = create_mock_stoken_contract(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &s_token_contract, &price_oracle);
    
    // Test getter functions for user account data
    let account_data = client.get_user_account_data(&user);
    
    assert_eq!(account_data.total_collateral_usd, 0i128);
    assert_eq!(account_data.total_debt_usd, 0i128);
}

#[test]
fn test_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let s_token_contract = create_mock_stoken_contract(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &s_token_contract, &price_oracle);

    let asset_symbol = symbol_short!("XLM");

    // Configure asset first
    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "configure_asset",
                args: (&asset_symbol, &6000u32, &8000u32, &1000u32).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).configure_asset(&asset_symbol, &6000u32, &8000u32, &1000u32);

    let deposit_amount = 1000_0000000i128;

    // Test deposit
    client.mock_auths(&[
        MockAuth {
            address: &user,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "deposit",
                args: (&user, &asset_symbol, &deposit_amount).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).deposit(&user, &asset_symbol, &deposit_amount);

    // Check that a deposit event was published
    let events = env.events().all();
    assert!(events.len() > 0);
    let event = &events[events.len()-1];
    assert!(event.topics.first() == Some(&symbol_short!("deposit").into_val(&env)));
}

#[test]
fn test_withdraw() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let s_token_contract = create_mock_stoken_contract(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &s_token_contract, &price_oracle);

    let asset_symbol = symbol_short!("XLM");
    let amount = 100_0000000i128;

    // Test withdraw (simplified - assumes user has balance)
    client.mock_auths(&[
        MockAuth {
            address: &user,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "withdraw",
                args: (&user, &asset_symbol, &amount).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).withdraw(&user, &asset_symbol, &amount);
}

#[test]
fn test_deposit_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let s_token_contract = create_mock_stoken_contract(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &s_token_contract, &price_oracle);

    let asset_symbol = symbol_short!("stETH");

    // Configure asset as collateral
    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "configure_asset",
                args: (&asset_symbol, &6000u32, &8000u32, &1000u32).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).configure_asset(&asset_symbol, &6000u32, &8000u32, &1000u32);

    let collateral_amount = 1_0000000i128; // 1 stETH

    // Test deposit collateral
    client.mock_auths(&[
        MockAuth {
            address: &user,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "deposit_collateral",
                args: (&user, &asset_symbol, &collateral_amount).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).deposit_collateral(&user, &asset_symbol, &collateral_amount);
} 