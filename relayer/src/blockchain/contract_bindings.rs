use ethers::prelude::*;

abigen!(
    SubscriptionManager,
    "../artifacts/contracts/SubscriptionManager.sol/SubscriptionManager.json"
);

abigen!(
    IERC20,
    r#"[
        function balanceOf(address account) external view returns (uint256)
        function allowance(address owner, address spender) external view returns (uint256)
        function transfer(address to, uint256 amount) external returns (bool)
        function transferFrom(address from, address to, uint256 amount) external returns (bool)
        function approve(address spender, uint256 amount) external returns (bool)
        function decimals() external view returns (uint8)
        function symbol() external view returns (string memory)
        function name() external view returns (string memory)
        function totalSupply() external view returns (uint256)
        
        event Transfer(address indexed from, address indexed to, uint256 value)
        event Approval(address indexed owner, address indexed spender, uint256 value)
    ]"#
);
