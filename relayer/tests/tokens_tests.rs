use ethers::types::U256;
use relayer::utils::tokens;

#[test]
fn test_is_eth_detection() {
    assert!(tokens::is_eth("0x0"));
    assert!(tokens::is_eth("0x0000000000000000000000000000000000000000"));
    assert!(!tokens::is_eth(
        "0x1111111111111111111111111111111111111111"
    ));
}

#[test]
fn test_get_token_symbol_with_registration() {
    tokens::register_pyusd_addresses(&[
        "0x3333333333333333333333333333333333333333".to_string(),
        "0x4444444444444444444444444444444444444444".to_string(),
    ]);

    assert_eq!(tokens::get_token_symbol("0x0"), "ETH");
    assert_eq!(
        tokens::get_token_symbol("0x3333333333333333333333333333333333333333"),
        "PYUSD"
    );
    assert_eq!(
        tokens::get_token_symbol("0x9999999999999999999999999999999999999999"),
        "UNKNOWN"
    );
}

#[test]
fn test_format_token_amount() {
    let eth_amount = U256::from_dec_str("1500000000000000000").unwrap();
    let pyusd_amount = U256::from_dec_str("1234567").unwrap();

    assert_eq!(tokens::format_token_amount(eth_amount, 18), "1.5");
    assert_eq!(tokens::format_token_amount(pyusd_amount, 6), "1.234567");
}
