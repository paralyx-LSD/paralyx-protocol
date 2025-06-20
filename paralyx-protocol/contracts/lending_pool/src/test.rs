#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    symbol_short, Address, Env, Symbol
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
    pub fn transfer(env: Env, from: Address, to: Address, amount: I128) {
        // Mock implementation - just emit an event
        env.events().publish((symbol_short!("transfer"), from, to), amount);
    }
}

#[contract]
pub struct MockOracle;

#[contractimpl]
impl MockOracle {
    pub fn get_price(env: Env, asset: Symbol) -> I128 {
        // Mock prices for testing
        match asset {
            _ if asset == symbol_short!("XLM") => I128::new(&env, 0_1200000), // $0.12
            _ if asset == symbol_short!("USDC") => I128::new(&env, 1_0000000), // $1.00
            _ if asset == symbol_short!("stETH") => I128::new(&env, 1500_0000000), // $1500
            _ => I128::new(&env, 1_0000000), // Default $1.00
        }
    }
}

#[contract]
pub struct MockSToken;

#[contractimpl]
impl MockSToken {
    pub fn mint(env: Env, to: Address, amount: I128) {
        env.events().publish((symbol_short!("mint"), to), amount);
    }

    pub fn burn(env: Env, from: Address, amount: I128) {
        env.events().publish((symbol_short!("burn"), from), amount);
    }

    pub fn balance(env: Env, user: Address) -> I128 {
        // Return a fixed balance for testing
        I128::new(&env, 1000_0000000)
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

    client.initialize(&admin, &price_oracle);
}

#[test]
fn test_add_asset() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let asset_address = create_mock_token_contract(&env);
    let s_token_address = create_mock_stoken_contract(&env);

    client.initialize(&admin, &price_oracle);

    let asset_symbol = symbol_short!("XLM");
    let config = AssetConfig {
        asset_address: asset_address.clone(),
        s_token_address: s_token_address.clone(),
        ltv_ratio: 6000,
        liquidation_threshold: 8000,
        borrow_rate: 500,
        supply_rate: 300,
    };

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "add_asset",
                args: (&asset_symbol, &config).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).add_asset(&asset_symbol, &config);

    // Verify pool info is initialized
    let (total_liquidity, total_borrows, available_liquidity) = client.get_pool_info(&asset_symbol);
    assert_eq!(total_liquidity, I128::new(&env, 0));
    assert_eq!(total_borrows, I128::new(&env, 0));
    assert_eq!(available_liquidity, I128::new(&env, 0));
}

#[test]
fn test_pool_info() {
    let env = Env::default();
    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);

    client.initialize(&admin, &price_oracle);

    let asset_symbol = symbol_short!("XLM");
    
    // Should return all zeros for non-existent asset
    let (total_liquidity, total_borrows, available_liquidity) = client.get_pool_info(&asset_symbol);
    assert_eq!(total_liquidity, I128::new(&env, 0));
    assert_eq!(total_borrows, I128::new(&env, 0));
    assert_eq!(available_liquidity, I128::new(&env, 0));
}

#[test]
fn test_user_positions() {
    let env = Env::default();
    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &price_oracle);

    let asset_symbol = symbol_short!("XLM");
    
    // Test getter functions for user positions
    let collateral = client.get_user_collateral(&user, &asset_symbol);
    let borrow = client.get_user_borrow(&user, &asset_symbol);
    
    assert_eq!(collateral, I128::new(&env, 0));
    assert_eq!(borrow, I128::new(&env, 0));
}

#[test]
fn test_position_health_no_debt() {
    let env = Env::default();
    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &price_oracle);

    let collateral_symbol = symbol_short!("stETH");
    let borrow_symbol = symbol_short!("USDC");

    // Position should be healthy when no debt
    let is_healthy = client.is_position_healthy(&user, &collateral_symbol, &borrow_symbol);
    assert!(is_healthy);
}

#[test]
fn test_calculate_max_borrow_no_collateral() {
    let env = Env::default();
    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let user = Address::generate(&env);

    client.initialize(&admin, &price_oracle);

    let collateral_symbol = symbol_short!("stETH");
    let borrow_symbol = symbol_short!("USDC");

    let max_borrow_usd = client.calculate_max_borrow(&user, &collateral_symbol, &borrow_symbol);
    
    // Should be 0 when no collateral
    assert_eq!(max_borrow_usd, I128::new(&env, 0));
}

#[test]
fn test_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let asset_address = create_mock_token_contract(&env);
    let s_token_address = create_mock_stoken_contract(&env);

    // Initialize
    client.initialize(&admin, &price_oracle);

    // Add asset
    let asset_symbol = symbol_short!("XLM");
    let config = AssetConfig {
        asset_address: asset_address.clone(),
        s_token_address: s_token_address.clone(),
        ltv_ratio: 6000,
        liquidation_threshold: 8000,
        borrow_rate: 500,
        supply_rate: 300,
    };

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "add_asset",
                args: (&asset_symbol, &config).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).add_asset(&asset_symbol, &config);

    // Test deposit
    let deposit_amount = I128::new(&env, 1000_0000000);

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

    // Verify pool state updated
    let (total_liquidity, _, _) = client.get_pool_info(&asset_symbol);
    assert_eq!(total_liquidity, deposit_amount);

    // Check events were emitted
    let events = env.events().all();
    let deposit_event = events.iter().find(|event| {
        event.topics.first() == Some(&symbol_short!("deposit").into_val(&env))
    });
    assert!(deposit_event.is_some());
}

#[test]
#[should_panic(expected = "amount must be positive")]
fn test_deposit_negative_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);

    client.initialize(&admin, &price_oracle);

    let asset_symbol = symbol_short!("XLM");
    let negative_amount = I128::new(&env, -100_0000000);

    client.mock_auths(&[
        MockAuth {
            address: &user,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "deposit",
                args: (&user, &asset_symbol, &negative_amount).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).deposit(&user, &asset_symbol, &negative_amount);
}

#[test]
fn test_enable_collateral() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);
    let asset_address = create_mock_token_contract(&env);
    let s_token_address = create_mock_stoken_contract(&env);

    // Initialize and add asset
    client.initialize(&admin, &price_oracle);

    let asset_symbol = symbol_short!("XLM");
    let config = AssetConfig {
        asset_address: asset_address.clone(),
        s_token_address: s_token_address.clone(),
        ltv_ratio: 6000,
        liquidation_threshold: 8000,
        borrow_rate: 500,
        supply_rate: 300,
    };

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "add_asset",
                args: (&asset_symbol, &config).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).add_asset(&asset_symbol, &config);

    // Enable collateral
    client.mock_auths(&[
        MockAuth {
            address: &user,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "enable_collateral",
                args: (&user, &asset_symbol).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).enable_collateral(&user, &asset_symbol);

    // Verify collateral was set
    let collateral_amount = client.get_user_collateral(&user, &asset_symbol);
    assert!(collateral_amount > I128::new(&env, 0));
}

#[test]
fn test_asset_value_calculation() {
    let env = Env::default();
    let contract_id = create_lending_pool_contract(&env);
    let client = LendingPoolClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    let price_oracle = create_mock_oracle_contract(&env);

    client.initialize(&admin, &price_oracle);

    // Test USD value calculation
    let asset_symbol = symbol_short!("stETH"); // Mock price: $1500
    let amount = I128::new(&env, 2_0000000); // 2 stETH
    
    let usd_value = client.get_asset_value_usd(&asset_symbol, &amount);
    let expected_value = I128::new(&env, 3000_0000000); // 2 * $1500 = $3000
    
    assert_eq!(usd_value, expected_value);
} 