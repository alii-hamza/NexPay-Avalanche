import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc";
const USDC_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
const CONTRACT_ADDRESS = Deno.env.get("NEXPAY_CONTRACT_ADDRESS") ?? "";
const RELAYER_PRIVATE_KEY = Deno.env.get("RELAYER_PRIVATE_KEY") ?? "";

// Simulation mode when contract isn't deployed yet
const SIMULATION_MODE = !CONTRACT_ADDRESS || !RELAYER_PRIVATE_KEY;

const NEXPAY_ABI = [
  "function setKYC(address user, bool status) external",
  "function setKYCBatch(address[] calldata users, bool status) external",
  "function transferInstant(address to, uint256 amount, uint8 category, string calldata memo) external",
  "function requestCashout(uint256 amount, string calldata bankRef, uint8 category) external",
  "function kycVerified(address) view returns (bool)",
  "event WalletTransfer(address indexed from, address indexed to, uint256 amount, uint8 category, string memo, uint256 timestamp)",
  "event CashoutRequested(address indexed from, uint256 amount, string bankRef, uint8 category, uint256 timestamp)",
];

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

const CATEGORY_LABELS: Record<number, string> = {
  0: "PersonalRemittance",
  1: "BusinessPayment",
  2: "WalletTransfer",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function getProvider() {
  return new ethers.JsonRpcProvider(FUJI_RPC);
}

function getRelayer() {
  return new ethers.Wallet(RELAYER_PRIVATE_KEY, getProvider());
}

function getNexPay(signer?: ethers.Signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, NEXPAY_ABI, signer ?? getProvider());
}

function getUSDC(signerOrProvider?: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(USDC_ADDRESS, USDC_ABI, signerOrProvider ?? getProvider());
}

function mockTxHash() {
  return "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// --- KYC Verify ---
async function handleKYCVerify(req: Request) {
  const { address } = await req.json();
  if (!address) return json({ error: "address required" }, 400);

  const db = getSupabase();

  if (SIMULATION_MODE) {
    // Simulate: just update DB
    await db.from("wallets").update({ kyc_verified: true }).eq("address", address.toLowerCase());
    return json({ success: true, txHash: mockTxHash(), address, mode: "simulation" });
  }

  try {
    const relayer = getRelayer();
    const contract = getNexPay(relayer);
    const tx = await contract.setKYC(address, true, { gasLimit: 100000 });
    await tx.wait();
    await db.from("wallets").update({ kyc_verified: true }).eq("address", address.toLowerCase());
    return json({ success: true, txHash: tx.hash, address });
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// --- Onramp ---
async function handleOnramp(req: Request) {
  const { address, amount, currency } = await req.json();
  if (!address || !amount) return json({ error: "address and amount required" }, 400);

  const mockRef = `ONRAMP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const db = getSupabase();
  const { data: wallet } = await db.from("wallets").select("usdc_balance").eq("address", address.toLowerCase()).maybeSingle();

  if (wallet) {
    const newBalance = (parseFloat(wallet.usdc_balance ?? "0") + parseFloat(amount)).toFixed(6);
    await db.from("wallets").update({ usdc_balance: newBalance }).eq("address", address.toLowerCase());
  }

  return json({
    success: true,
    reference: mockRef,
    address,
    amount,
    currency: currency ?? "USD",
    usdcReceived: amount,
    message: "Mock fiat onramp complete. USDC credited to wallet.",
  });
}

// --- Transfer ---
async function handleTransfer(req: Request) {
  const { fromAddress, toAddress, amount, category, memo } = await req.json();
  if (!fromAddress || !toAddress || !amount) return json({ error: "fromAddress, toAddress, amount required" }, 400);
  if (category === undefined || category < 0 || category > 2) return json({ error: "category must be 0, 1, or 2" }, 400);

  const db = getSupabase();
  const { data: senderWalletData } = await db.from("wallets").select("*").eq("address", fromAddress.toLowerCase()).maybeSingle();
  if (!senderWalletData) return json({ error: "Sender wallet not found in system" }, 404);
  if (!senderWalletData.kyc_verified) return json({ error: "KYC not verified for sender" }, 403);

  const usdcAmount = ethers.parseUnits(String(amount), 6);
  const { data: transfer } = await db.from("transfers").insert({
    from_address: fromAddress.toLowerCase(),
    to_address: toAddress.toLowerCase(),
    amount: String(amount),
    category: parseInt(category),
    category_label: CATEGORY_LABELS[category] ?? "WalletTransfer",
    memo: memo ?? "",
    status: "pending",
  }).select().single();

  if (SIMULATION_MODE) {
    // Simulate on-chain transfer with DB balance updates
    await new Promise(r => setTimeout(r, 800)); // simulate ~800ms finality

    const txHash = mockTxHash();
    await db.from("transfers").update({ tx_hash: txHash, status: "confirmed" }).eq("id", transfer?.id);

    const senderBal = parseFloat(senderWalletData.usdc_balance ?? "0");
    const newSenderBal = Math.max(0, senderBal - parseFloat(amount)).toFixed(6);
    await db.from("wallets").update({ usdc_balance: newSenderBal }).eq("address", fromAddress.toLowerCase());

    const { data: recipientData } = await db.from("wallets").select("usdc_balance").eq("address", toAddress.toLowerCase()).maybeSingle();
    if (recipientData) {
      const newRecipientBal = (parseFloat(recipientData.usdc_balance ?? "0") + parseFloat(amount)).toFixed(6);
      await db.from("wallets").update({ usdc_balance: newRecipientBal }).eq("address", toAddress.toLowerCase());
    }

    return json({
      success: true,
      txHash,
      from: fromAddress,
      to: toAddress,
      amount,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      memo: memo ?? "",
      transferId: transfer?.id,
      mode: "simulation",
    });
  }

  // Live on-chain path
  try {
    const provider = getProvider();
    const senderWallet = new ethers.Wallet(senderWalletData.private_key, provider);
    const usdc = getUSDC(senderWallet);
    const allowance = await (usdc as ethers.Contract).allowance(fromAddress, CONTRACT_ADDRESS);
    if (allowance < usdcAmount) {
      const approveTx = await (usdc as ethers.Contract).approve(CONTRACT_ADDRESS, usdcAmount, { gasLimit: 80000 });
      await approveTx.wait();
    }
    const contract = getNexPay(senderWallet);
    const tx = await contract.transferInstant(toAddress, usdcAmount, parseInt(category), memo ?? "", { gasLimit: 150000 });
    const receipt = await tx.wait();
    const status = receipt?.status === 1 ? "confirmed" : "failed";
    await db.from("transfers").update({ tx_hash: tx.hash, status }).eq("id", transfer?.id);

    const [fromBal, toBal] = await Promise.all([
      (getUSDC(provider) as ethers.Contract).balanceOf(fromAddress),
      (getUSDC(provider) as ethers.Contract).balanceOf(toAddress),
    ]);
    await Promise.all([
      db.from("wallets").update({ usdc_balance: ethers.formatUnits(fromBal, 6) }).eq("address", fromAddress.toLowerCase()),
      db.from("wallets").update({ usdc_balance: ethers.formatUnits(toBal, 6) }).eq("address", toAddress.toLowerCase()),
    ]);

    return json({ success: true, txHash: tx.hash, from: fromAddress, to: toAddress, amount, category, categoryLabel: CATEGORY_LABELS[category], memo: memo ?? "", transferId: transfer?.id });
  } catch (err: unknown) {
    if (transfer?.id) await db.from("transfers").update({ status: "failed" }).eq("id", transfer.id);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// --- Cashout ---
async function handleCashout(req: Request) {
  const { fromAddress, amount, bankRef, category } = await req.json();
  if (!fromAddress || !amount || !bankRef) return json({ error: "fromAddress, amount, bankRef required" }, 400);

  const db = getSupabase();
  const { data: walletData } = await db.from("wallets").select("*").eq("address", fromAddress.toLowerCase()).maybeSingle();
  if (!walletData) return json({ error: "Wallet not found" }, 404);
  if (!walletData.kyc_verified) return json({ error: "KYC not verified" }, 403);

  const cat = category ?? 0;
  const { data: cashout } = await db.from("cashout_requests").insert({
    from_address: fromAddress.toLowerCase(),
    amount: String(amount),
    bank_ref: bankRef,
    category: cat,
    status: "pending",
  }).select().single();

  if (SIMULATION_MODE) {
    await new Promise(r => setTimeout(r, 600));
    const txHash = mockTxHash();
    await db.from("cashout_requests").update({ tx_hash: txHash, status: "processing" }).eq("id", cashout?.id);
    const newBal = Math.max(0, parseFloat(walletData.usdc_balance ?? "0") - parseFloat(amount)).toFixed(6);
    await db.from("wallets").update({ usdc_balance: newBal }).eq("address", fromAddress.toLowerCase());
    return json({ success: true, txHash, cashoutId: cashout?.id, bankRef, amount, status: "processing", message: "Cashout request submitted. Partner will process within 1-2 business days.", mode: "simulation" });
  }

  try {
    const provider = getProvider();
    const senderWallet = new ethers.Wallet(walletData.private_key, provider);
    const usdcAmount = ethers.parseUnits(String(amount), 6);
    const usdc = getUSDC(senderWallet);
    const allowance = await (usdc as ethers.Contract).allowance(fromAddress, CONTRACT_ADDRESS);
    if (allowance < usdcAmount) {
      const approveTx = await (usdc as ethers.Contract).approve(CONTRACT_ADDRESS, usdcAmount, { gasLimit: 80000 });
      await approveTx.wait();
    }
    const contract = getNexPay(senderWallet);
    const tx = await contract.requestCashout(usdcAmount, bankRef, cat, { gasLimit: 150000 });
    const receipt = await tx.wait();
    const status = receipt?.status === 1 ? "processing" : "failed";
    await db.from("cashout_requests").update({ tx_hash: tx.hash, status }).eq("id", cashout?.id);
    const newBal = await (getUSDC(provider) as ethers.Contract).balanceOf(fromAddress);
    await db.from("wallets").update({ usdc_balance: ethers.formatUnits(newBal, 6) }).eq("address", fromAddress.toLowerCase());
    return json({ success: true, txHash: tx.hash, cashoutId: cashout?.id, bankRef, amount, status: "processing", message: "Cashout request submitted." });
  } catch (err: unknown) {
    if (cashout?.id) await db.from("cashout_requests").update({ status: "failed" }).eq("id", cashout.id);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
}

// --- Transfers history ---
async function handleGetTransfers(userAddress: string) {
  if (!userAddress) return json({ error: "user address required" }, 400);
  const addr = userAddress.toLowerCase();
  const db = getSupabase();
  const [{ data: sent }, { data: received }, { data: cashouts }] = await Promise.all([
    db.from("transfers").select("*").eq("from_address", addr).order("created_at", { ascending: false }),
    db.from("transfers").select("*").eq("to_address", addr).order("created_at", { ascending: false }),
    db.from("cashout_requests").select("*").eq("from_address", addr).order("created_at", { ascending: false }),
  ]);

  const all = [
    ...(sent ?? []).map((t: Record<string, unknown>) => ({ ...t, direction: "sent" })),
    ...(received ?? []).map((t: Record<string, unknown>) => ({ ...t, direction: "received" })),
  ].sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());

  return json({ transfers: all, cashouts: cashouts ?? [] });
}

// --- Balance ---
async function handleGetBalance(address: string) {
  if (!address) return json({ error: "address required" }, 400);
  try {
    const provider = getProvider();
    const [usdcBal, avaxBal] = await Promise.all([
      (getUSDC(provider) as ethers.Contract).balanceOf(address),
      provider.getBalance(address),
    ]);
    return json({ address, usdc: ethers.formatUnits(usdcBal, 6), avax: ethers.formatEther(avaxBal) });
  } catch (err: unknown) {
    // If on-chain fails, return DB balance
    const db = getSupabase();
    const { data } = await db.from("wallets").select("usdc_balance").eq("address", address.toLowerCase()).maybeSingle();
    return json({ address, usdc: data?.usdc_balance ?? "0", avax: "0", source: "db" });
  }
}

// --- Wallet list ---
async function handleGetWallets() {
  const db = getSupabase();
  const { data } = await db.from("wallets").select("address, label, kyc_verified, usdc_balance, created_at").order("created_at");
  return json({ wallets: data ?? [] });
}

// --- Seed demo wallets ---
async function handleSeed() {
  const db = getSupabase();
  const { data: existing } = await db.from("wallets").select("address");
  if (existing && existing.length >= 3) {
    return json({ message: "Demo wallets already seeded", wallets: existing });
  }

  const provider = getProvider();
  const demoWallets = [
    { label: "Alice (Overseas Worker)", balance: "100.000000" },
    { label: "Bob (Freelancer)", balance: "100.000000" },
    { label: "Carol (Wallet User)", balance: "100.000000" },
  ];

  const created = [];
  for (const w of demoWallets) {
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address.toLowerCase();
    const { data, error } = await db.from("wallets").insert({
      address,
      private_key: wallet.privateKey,
      label: w.label,
      kyc_verified: false,
      usdc_balance: w.balance,
    }).select("address, label, kyc_verified, usdc_balance").single();
    if (!error && data) created.push(data);
  }

  return json({ seeded: created, message: `${created.length} demo wallets created with 100 USDC each. Call /kyc/verify to enable transfers.` });
}

// --- Main router ---
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/nexpay-api/, "");

  try {
    if (path === "/kyc/verify" && req.method === "POST") return await handleKYCVerify(req);
    if (path === "/onramp" && req.method === "POST") return await handleOnramp(req);
    if (path === "/transfer" && req.method === "POST") return await handleTransfer(req);
    if (path === "/cashout" && req.method === "POST") return await handleCashout(req);
    if (path.startsWith("/transfers/") && req.method === "GET") return await handleGetTransfers(path.split("/transfers/")[1]);
    if (path.startsWith("/balance/") && req.method === "GET") return await handleGetBalance(path.split("/balance/")[1]);
    if (path === "/wallets" && req.method === "GET") return await handleGetWallets();
    if (path === "/seed" && req.method === "POST") return await handleSeed();
    if (path === "/health" && req.method === "GET") {
      return json({ status: "ok", contract: CONTRACT_ADDRESS || "not-deployed", network: "Fuji", mode: SIMULATION_MODE ? "simulation" : "live" });
    }
    return json({ error: "Not found", path }, 404);
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
