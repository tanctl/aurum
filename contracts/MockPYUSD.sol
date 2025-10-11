// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPYUSD is ERC20 {
    uint8 private _decimals;
    bool public transferFailing;
    mapping(address => bool) public forceFailOnTransfer;

    constructor() ERC20("PayPal USD", "PYUSD") {
        _decimals = 6;
        _mint(msg.sender, 1000000 * 10**_decimals); // 1m pyusd for testing
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function setBalance(address account, uint256 amount) external {
        uint256 currentBalance = balanceOf(account);
        if (amount > currentBalance) {
            _mint(account, amount - currentBalance);
        } else if (amount < currentBalance) {
            _burn(account, currentBalance - amount);
        }
    }

    function setTransferFailing(bool failing) external {
        transferFailing = failing;
    }

    function setForceFailOnTransfer(address account, bool fail) external {
        forceFailOnTransfer[account] = fail;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (transferFailing || forceFailOnTransfer[msg.sender]) {
            return false; // simulate transfer failures for testing
        }
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (transferFailing || forceFailOnTransfer[from]) {
            return false;
        }
        return super.transferFrom(from, to, amount);
    }
}