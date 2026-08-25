import { config, shortAddress, DEMO_WALLET } from "./config.js";

let address = null;
let kind = null;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn({ address, short: shortAddress(address), kind }));
}

export function onWalletChange(fn) {
  listeners.add(fn);
  fn({ address, short: shortAddress(address), kind });
  return () => listeners.delete(fn);
}

export function getAddress() {
  return address;
}

export async function ensureMonad() {
  if (!window.ethereum) {
    throw new Error("No wallet found. Install MetaMask or another injected wallet.");
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.chainIdHex }],
    });
  } catch (err) {
    if (err?.code === 4902 || err?.code === -32603) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: config.chainIdHex,
            chainName: config.chainName,
            nativeCurrency: config.nativeCurrency,
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: [config.explorerUrl],
          },
        ],
      });
    } else if (err?.code === 4001) {
      throw new Error("Switch to Monad in your wallet to continue.");
    } else {
      throw err;
    }
  }
}

export async function connectWallet() {
  if (window.ethereum) {
    await ensureMonad();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts?.length) throw new Error("No account returned");
    address = accounts[0];
    kind = "injected";
    emit();
    return address;
  }
  address = DEMO_WALLET;
  kind = "demo";
  emit();
  return address;
}

export async function silentConnect() {
  if (!window.ethereum) return null;
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts?.length) {
      address = accounts[0];
      kind = "injected";
      emit();
    }
  } catch {
    /* ignore */
  }
  return address;
}

export function disconnectWallet() {
  address = null;
  kind = null;
  emit();
}

export function bindWalletListeners() {
  if (!window.ethereum?.on) return;
  window.ethereum.on("accountsChanged", (accounts) => {
    address = accounts?.[0] || null;
    kind = address ? "injected" : null;
    emit();
  });
  window.ethereum.on("chainChanged", () => {
    emit();
  });
}
