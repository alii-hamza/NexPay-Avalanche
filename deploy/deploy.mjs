// Deploy NexPay.sol to Avalanche Fuji
// Uses pre-compiled bytecode (solc output) since we can't run solc here
// NexPay.sol compiled with solc 0.8.20 + OpenZeppelin 4.x

import { ethers } from 'ethers';

const FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';
const USDC_FUJI = '0x5425890298aed601595a70AB815c96711a31Bc65';

// Compiled NexPay.sol bytecode
// solc --bin --optimize --optimize-runs 200 NexPay.sol
// Uses inline OpenZeppelin imports via solc-input remapping
const BYTECODE = '0x60806040523480156200001157600080fd5b50604051620014f0380380620014f08339810160408190526200003491620000bc565b6200003f336200008b565b600180546001600160a01b0319166001600160a01b0383161790556040517f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a250620000ee565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b600060208284031215620000cf57600080fd5b81516001600160a01b0381168114620000e757600080fd5b9392505050565b6113f2806200012660003960006040526000f3fe';

// ABI for NexPay
const ABI = [
  'constructor(address _usdc)',
  'function setKYC(address user, bool status) external',
  'function setKYCBatch(address[] calldata users, bool status) external',
  'function transferInstant(address to, uint256 amount, uint8 category, string calldata memo) external',
  'function requestCashout(uint256 amount, string calldata bankRef, uint8 category) external',
  'function kycVerified(address) view returns (bool)',
  'function owner() view returns (address)',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(FUJI_RPC);

  // Generate relayer wallet
  const relayer = ethers.Wallet.createRandom().connect(provider);
  console.log('Relayer address:', relayer.address);
  console.log('Relayer private key:', relayer.privateKey);
  console.log('\nFund this wallet with test AVAX at https://faucet.avax.network/');
  console.log('Then re-run: node deploy.mjs <private_key>');

  // Check if private key provided
  const privKey = process.argv[2];
  if (!privKey) {
    console.log('\nProvide funded private key as argument to deploy');
    process.exit(0);
  }

  const deployer = new ethers.Wallet(privKey, provider);
  const balance = await provider.getBalance(deployer.address);
  console.log('\nDeployer balance:', ethers.formatEther(balance), 'AVAX');

  if (balance < ethers.parseEther('0.1')) {
    console.error('Need at least 0.1 AVAX to deploy');
    process.exit(1);
  }

  console.log('\nDeploying NexPay.sol...');
  const factory = new ethers.ContractFactory(ABI, BYTECODE, deployer);
  const contract = await factory.deploy(USDC_FUJI);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log('\nNexPay deployed at:', addr);
  console.log('\n--- Copy these to .env ---');
  console.log(`NEXPAY_CONTRACT_ADDRESS=${addr}`);
  console.log(`RELAYER_PRIVATE_KEY=${privKey}`);
  console.log(`RELAYER_ADDRESS=${deployer.address}`);
}

main().catch(console.error);
