#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, MockAuth, MockAuthInvoke}, Address, Env, String, I128};

fn create_token_contract<'a>(e: &Env) -> Address {
    e.register_contract(None, SToken {})
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = create_token_contract(&env);
    let client = STokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let lending_pool = Address::generate(&env);
    let underlying_asset = Address::generate(&env);
    let name = String::from_str(&env, "Test sToken");
    let symbol = String::from_str(&env, "sTest");
    let decimals = 7u32;

    client.initialize(&admin, &lending_pool, &underlying_asset, &name, &symbol, &decimals);

    assert_eq!(client.name(), name);
    assert_eq!(client.symbol(), symbol);
    assert_eq!(client.decimals(), decimals);
    assert_eq!(client.total_supply(), I128::new(&env, 0));
    assert_eq!(client.underlying_asset(), underlying_asset);
    assert_eq!(client.exchange_rate(), I128::new(&env, 1_0000000));
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    let contract_id = create_token_contract(&env);
    let client = STokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let lending_pool = Address::generate(&env);
    let underlying_asset = Address::generate(&env);
    let name = String::from_str(&env, "Test sToken");
    let symbol = String::from_str(&env, "sTest");
    let decimals = 7u32;

    client.initialize(&admin, &lending_pool, &underlying_asset, &name, &symbol, &decimals);
    client.initialize(&admin, &lending_pool, &underlying_asset, &name, &symbol, &decimals);
}

#[test]
fn test_mint() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_token_contract(&env);
    let client = STokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let lending_pool = Address::generate(&env);
    let underlying_asset = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(
        &admin, 
        &lending_pool, 
        &underlying_asset, 
        &String::from_str(&env, "Test sToken"), 
        &String::from_str(&env, "sTest"), 
        &7u32
    );

    let mint_amount = I128::new(&env, 1000_0000000);
    
    client.mock_auths(&[
        MockAuth {
            address: &lending_pool,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "mint",
                args: (&user, &mint_amount).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).mint(&user, &mint_amount);

    assert_eq!(client.balance(&user), mint_amount);
    assert_eq!(client.total_supply(), mint_amount);
}

#[test]
fn test_burn() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_token_contract(&env);
    let client = STokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let lending_pool = Address::generate(&env);
    let underlying_asset = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(
        &admin, 
        &lending_pool, 
        &underlying_asset, 
        &String::from_str(&env, "Test sToken"), 
        &String::from_str(&env, "sTest"), 
        &7u32
    );

    let mint_amount = I128::new(&env, 1000_0000000);
    let burn_amount = I128::new(&env, 300_0000000);
    
    // First mint tokens
    client.mock_auths(&[
        MockAuth {
            address: &lending_pool,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "mint",
                args: (&user, &mint_amount).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).mint(&user, &mint_amount);

    // Then burn some tokens
    client.mock_auths(&[
        MockAuth {
            address: &lending_pool,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "burn",
                args: (&user, &burn_amount).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).burn(&user, &burn_amount);

    let expected_balance = mint_amount.sub(&burn_amount);
    assert_eq!(client.balance(&user), expected_balance);
    assert_eq!(client.total_supply(), expected_balance);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_burn_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_token_contract(&env);
    let client = STokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let lending_pool = Address::generate(&env);
    let underlying_asset = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(
        &admin, 
        &lending_pool, 
        &underlying_asset, 
        &String::from_str(&env, "Test sToken"), 
        &String::from_str(&env, "sTest"), 
        &7u32
    );

    let burn_amount = I128::new(&env, 1000_0000000);
    
    client.mock_auths(&[
        MockAuth {
            address: &lending_pool,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "burn",
                args: (&user, &burn_amount).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).burn(&user, &burn_amount);
}

#[test]
fn test_exchange_rate_conversion() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_token_contract(&env);
    let client = STokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let lending_pool = Address::generate(&env);
    let underlying_asset = Address::generate(&env);

    client.initialize(
        &admin, 
        &lending_pool, 
        &underlying_asset, 
        &String::from_str(&env, "Test sToken"), 
        &String::from_str(&env, "sTest"), 
        &7u32
    );

    // Test with initial 1:1 rate
    let underlying_amount = I128::new(&env, 1000_0000000);
    let s_token_amount = client.underlying_to_s_token(&underlying_amount);
    assert_eq!(s_token_amount, underlying_amount);

    let converted_back = client.s_token_to_underlying(&s_token_amount);
    assert_eq!(converted_back, underlying_amount);

    // Update exchange rate to 1.5 (meaning 1 sToken = 1.5 underlying)
    let new_rate = I128::new(&env, 1_5000000);
    client.mock_auths(&[
        MockAuth {
            address: &lending_pool,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "update_exchange_rate",
                args: (&new_rate,).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).update_exchange_rate(&new_rate);

    assert_eq!(client.exchange_rate(), new_rate);

    // Test conversion with new rate
    let s_token_amount_new = client.underlying_to_s_token(&underlying_amount);
    let expected_s_tokens = I128::new(&env, 666_6666666); // 1000 / 1.5 ≈ 666.67
    
    // Allow for small rounding differences
    let diff = if s_token_amount_new > expected_s_tokens {
        s_token_amount_new.sub(&expected_s_tokens)
    } else {
        expected_s_tokens.sub(&s_token_amount_new)
    };
    assert!(diff <= I128::new(&env, 10)); // Within 10 units for rounding
} 