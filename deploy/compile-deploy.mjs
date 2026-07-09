import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const solc = require('solc');

const FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const USDC_FUJI = '0x5425890298aed601595a70AB815c96711a31Bc65';

const source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

contract Ownable {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor() { _owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    function owner() public view returns (address) { return _owner; }
    modifier onlyOwner() { require(_owner == msg.sender, "Ownable: not owner"); _; }
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

contract NexPay is Ownable {
    IERC20 public immutable usdc;

    enum Category { PersonalRemittance, BusinessPayment, WalletTransfer }

    event WalletTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint8 category,
        string memo,
        uint256 timestamp
    );

    event CashoutRequested(
        address indexed from,
        uint256 amount,
        string bankRef,
        uint8 category,
        uint256 timestamp
    );

    mapping(address => bool) public kycVerified;

    modifier onlyKYC() {
        require(kycVerified[msg.sender], "NexPay: KYC required");
        _;
    }

    constructor(address _usdc) {
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
        emit WalletTransfer(msg.sender, to, amount, category, memo, block.timestamp);
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
        emit CashoutRequested(msg.sender, amount, bankRef, category, block.timestamp);
    }

    function releaseCashout(address to, uint256 amount) external onlyOwner {
        bool ok = usdc.transfer(to, amount);
        require(ok, "NexPay: release failed");
    }
}
`;

const input = {
  language: 'Solidity',
  sources: { 'NexPay.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) { console.error('Compilation errors:', errors); process.exit(1); }
}

const contract = output.contracts['NexPay.sol']['NexPay'];
const { abi, bytecode } = { abi: contract.abi, bytecode: contract.evm.bytecode.object };

console.log('Compilation successful.');
console.log('Bytecode size:', bytecode.length / 2, 'bytes');

const provider = new ethers.JsonRpcProvider(FUJI_RPC);

const privKey = process.argv[2];
if (!privKey) {
  const wallet = ethers.Wallet.createRandom();
  console.log('\nGenerated relayer wallet:');
  console.log('  Address:', wallet.address);
  console.log('  Private Key:', wallet.privateKey);
  console.log('\nFund this wallet at https://faucet.avax.network/');
  console.log('Then: node compile-deploy.mjs <private_key>');
  process.exit(0);
}

const deployer = new ethers.Wallet(privKey, provider);
const balance = await provider.getBalance(deployer.address);
console.log('\nDeployer:', deployer.address);
console.log('Balance:', ethers.formatEther(balance), 'AVAX');

if (balance < ethers.parseEther('0.05')) {
  console.error('Need at least 0.05 AVAX to deploy. Fund at: https://faucet.avax.network/');
  process.exit(1);
}

console.log('\nDeploying NexPay...');
const factory = new ethers.ContractFactory(abi, '0x' + bytecode, deployer);
const deployedContract = await factory.deploy(USDC_FUJI, { gasLimit: 2000000 });
await deployedContract.waitForDeployment();
const contractAddress = await deployedContract.getAddress();

console.log('\n=== DEPLOYMENT SUCCESS ===');
console.log('NexPay contract:', contractAddress);
console.log('USDC (Fuji):', USDC_FUJI);
console.log('Owner/Relayer:', deployer.address);
console.log('\n=== ENV VARS (add to Supabase secrets) ===');
console.log('NEXPAY_CONTRACT_ADDRESS=' + contractAddress);
console.log('RELAYER_PRIVATE_KEY=' + privKey);
console.log('RELAYER_ADDRESS=' + deployer.address);
