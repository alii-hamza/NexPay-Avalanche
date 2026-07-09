// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NexPay is Ownable {
    IERC20 public immutable usdc;

    enum Category { PersonalRemittance, BusinessPayment, WalletTransfer }

    event WalletTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        Category category,
        string memo,
        uint256 timestamp
    );

    event CashoutRequested(
        address indexed from,
        uint256 amount,
        string bankRef,
        Category category,
        uint256 timestamp
    );

    mapping(address => bool) public kycVerified;

    modifier onlyKYC() {
        require(kycVerified[msg.sender], "NexPay: KYC required");
        _;
    }

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    function setKYC(address user, bool status) external onlyOwner {
        kycVerified[user] = status;
    }

    function setKYCBatch(address[] calldata users, bool status) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            kycVerified[users[i]] = status;
        }
    }

    function transferInstant(
        address to,
        uint256 amount,
        uint8 category,
        string calldata memo
    ) external onlyKYC {
        require(to != address(0), "NexPay: invalid recipient");
        require(amount > 0, "NexPay: amount must be > 0");
        require(category <= 2, "NexPay: invalid category");

        bool ok = usdc.transferFrom(msg.sender, to, amount);
        require(ok, "NexPay: USDC transfer failed");

        emit WalletTransfer(msg.sender, to, amount, Category(category), memo, block.timestamp);
    }

    function requestCashout(
        uint256 amount,
        string calldata bankRef,
        uint8 category
    ) external onlyKYC {
        require(amount > 0, "NexPay: amount must be > 0");
        require(category <= 2, "NexPay: invalid category");
        require(bytes(bankRef).length > 0, "NexPay: bankRef required");

        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        require(ok, "NexPay: USDC transfer failed");

        emit CashoutRequested(msg.sender, amount, bankRef, Category(category), block.timestamp);
    }

    // Owner can release locked cashout funds (simulates partner settlement)
    function releaseCashout(address to, uint256 amount) external onlyOwner {
        bool ok = usdc.transfer(to, amount);
        require(ok, "NexPay: release failed");
    }
}
