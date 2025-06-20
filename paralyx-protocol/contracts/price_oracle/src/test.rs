#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, MockAuth, MockAuthInvoke}, symbol_short, Address, Env, Symbol, I128};

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

    assert_eq!(client.get_admin(), admin);
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
    let price = I128::new(&env, 1500_0000000); // $1500 with 7 decimals

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_price",
                args: (&asset, &price).into_val(&env),
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
    let negative_price = I128::new(&env, -100_0000000);

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_price",
                args: (&asset, &negative_price).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).set_price(&asset, &negative_price);
}

#[test]
#[should_panic(expected = "price not set for asset")]
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
        I128::new(&env, 1500_0000000), // $1500
        I128::new(&env, 0_1200000),    // $0.12
        I128::new(&env, 1_0000000)     // $1.00
    ];

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "batch_set_prices",
                args: (&assets, &prices).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).batch_set_prices(&assets, &prices);

    assert_eq!(client.get_price(&symbol_short!("stETH")), I128::new(&env, 1500_0000000));
    assert_eq!(client.get_price(&symbol_short!("XLM")), I128::new(&env, 0_1200000));
    assert_eq!(client.get_price(&symbol_short!("USDC")), I128::new(&env, 1_0000000));
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
        I128::new(&env, 1500_0000000),
        I128::new(&env, 0_1200000)
    ];

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "batch_set_prices",
                args: (&assets, &prices).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).batch_set_prices(&assets, &prices);
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
    let price = I128::new(&env, 1500_0000000);

    // Set price
    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_price",
                args: (&asset, &price).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).set_price(&asset, &price);

    // Price should be fresh right after setting
    assert!(client.is_price_fresh(&asset, &100));

    // Price should be considered fresh within reasonable time
    assert_eq!(client.get_price_checked(&asset, &100), price);
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
    let price = I128::new(&env, 1500_0000000); // $1500

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_price",
                args: (&asset, &price).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).set_price(&asset, &price);

    // Test asset to USD conversion
    let asset_amount = I128::new(&env, 2_0000000); // 2 stETH
    let usd_value = client.to_usd_value(&asset, &asset_amount);
    let expected_usd = I128::new(&env, 3000_0000000); // 2 * $1500 = $3000
    assert_eq!(usd_value, expected_usd);

    // Test USD to asset conversion
    let usd_amount = I128::new(&env, 750_0000000); // $750
    let asset_amount_converted = client.from_usd_value(&asset, &usd_amount);
    let expected_asset = I128::new(&env, 0_5000000); // $750 / $1500 = 0.5 stETH
    assert_eq!(asset_amount_converted, expected_asset);
}

#[test]
fn test_update_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = create_oracle_contract(&env);
    let client = PriceOracleClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);

    client.initialize(&admin);

    client.mock_auths(&[
        MockAuth {
            address: &admin,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "update_admin",
                args: (&new_admin,).into_val(&env),
                sub_invokes: &[],
            },
        }
    ]).update_admin(&new_admin);

    assert_eq!(client.get_admin(), new_admin);
} 