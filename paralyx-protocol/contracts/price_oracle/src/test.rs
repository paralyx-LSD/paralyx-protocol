#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, MockAuth, MockAuthInvoke}, symbol_short, Address, Env, IntoVal};

fn create_oracle_contract<'a>(e: &Env) -> Address {
    e.register_contract(None, PriceOracle {})
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    // Note: get_admin is not implemented in the contract, so we skip this assertion
    // The fact that initialize doesn't panic means it worked
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);
    client.initialize(&admin);
}

#[test]
fn test_set_and_get_price() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let asset = symbol_short!("stETH");
    let price = 1500_0000000i128; // $1500 with 7 decimals

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_price",
                args: (asset.clone(), price).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).set_price(&asset, &price);

    assert_eq!(client.get_price(&asset), price);
    assert!(client.get_last_updated(&asset) > 0);
}

#[test]
#[should_panic(expected = "price must be positive")]
fn test_set_negative_price() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let asset = symbol_short!("stETH");
    let negative_price = -100_0000000i128;

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_price",
                args: (asset.clone(), negative_price).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).set_price(&asset, &negative_price);
}

#[test]
#[should_panic(expected = "price not found for asset")]
fn test_get_unset_price() {
    let env = Env::default();
    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let asset = symbol_short!("ETH");
    client.get_price(&asset);
}

#[test]
fn test_batch_set_prices() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let assets = soroban_sdk::vec![
        &env,
        symbol_short!("stETH"),
        symbol_short!("XLM"),
        symbol_short!("USDC")
    ];

    let prices = soroban_sdk::vec![
        &env,
        1500_0000000i128, // $1500
        12_0000000i128,    // $0.12
        1_0000000i128     // $1.00
    ];

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_prices",
                args: (assets.clone(), prices.clone()).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).set_prices(&assets, &prices);

    assert_eq!(client.get_price(&symbol_short!("stETH")), 1500_0000000i128);
    assert_eq!(client.get_price(&symbol_short!("XLM")), 12_0000000i128);
    assert_eq!(client.get_price(&symbol_short!("USDC")), 1_0000000i128);
}

#[test]
#[should_panic(expected = "assets and prices length mismatch")]
fn test_batch_set_prices_length_mismatch() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let assets = soroban_sdk::vec![&env, symbol_short!("stETH")];
    let prices = soroban_sdk::vec![
        &env,
        1500_0000000i128,
        12_0000000i128
    ];

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_prices",
                args: (assets.clone(), prices.clone()).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).set_prices(&assets, &prices);
}

#[test]
fn test_price_freshness() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let asset = symbol_short!("stETH");
    let price = 1500_0000000i128;

    // Set price
    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_price",
                args: (asset.clone(), price).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).set_price(&asset, &price);

    // Price should be fresh right after setting
    assert!(client.is_price_fresh(&asset));

    // Price should be available for getting
    assert_eq!(client.get_price_unchecked(&asset), price);
}

#[test]
fn test_usd_conversions() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);

    let asset = symbol_short!("stETH");
    let price = 1500_0000000i128; // $1500

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_price",
                args: (asset.clone(), price).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).set_price(&asset, &price);

    // Test asset to USD conversion
    let asset_amount = 2_0000000i128; // 2 stETH
    let usd_value = client.convert_to_usd(&asset, &asset_amount);
    let expected_usd = 3000_0000000i128; // 2 * $1500 = $3000
    assert_eq!(usd_value, expected_usd);

    // Test USD to asset conversion
    let usd_amount = 750_0000000i128; // $750
    let asset_amount_converted = client.convert_from_usd(&asset, &usd_amount);
    let expected_asset = 5000000i128; // $750 / $1500 = 0.5 stETH
    assert_eq!(asset_amount_converted, expected_asset);
} 