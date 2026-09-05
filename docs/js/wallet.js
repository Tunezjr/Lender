import { config, shortAddress } from "./config.js";

let address = null;
let provider = null;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn({ address, short: shortAddress(address) }));
}

export function onWalletChange(fn) {
  listeners.add(fn);
  fn({ address, short: shortAddress(address) });
  return () => listeners.delete(fn);
}

export function getAddress() {
  return address;
}

export function getProvider() {
  return provider || window.ethereum || null;
}

function bindProviderListeners(nextProvider) {
  if (!nextProvider?.on || nextProvider.__lenderListenersBound) return;
  nextProvider.__lenderListenersBound = true;
  nextProvider.on("accountsChanged", (accounts) => {
    address = accounts?.[0] || null;
    emit();
  });
  nextProvider.on("chainChanged", () => emit());
  nextProvider.on("disconnect", () => {
    if (provider === nextProvider) {
      address = null;
      emit();
    }
  });
}

export async function ensureMonad(walletProvider = getProvider()) {
  if (!walletProvider) {
    throw new Error("No wallet found. Install a Monad-ready browser wallet.");
  }
  try {
    await walletProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.chainIdHex }],
    });
  } catch (err) {
    if (err?.code === 4902) {
      await walletProvider.request({
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
  const injected = window.ethereum;
  if (!injected) {
    throw new Error(
      "No injected wallet. WalletConnect is disabled until the production domain is verified in WalletConnect Cloud and the client is bundled locally."
    );
  }
  provider = injected;
  bindProviderListeners(provider);
  await ensureMonad(provider);
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts?.length) throw new Error("No account returned");
  address = accounts[0];
  emit();
  return address;
}

export async function connectWalletConnect() {
  throw new Error(
    "WalletConnect is off until the live domain is allowlisted and the provider is bundled. Use a browser wallet on Monad."
  );
}

export async function silentConnect() {
  try {
    const injected = window.ethereum;
    if (!injected) return null;
    provider = injected;
    bindProviderListeners(provider);
    const accounts = await provider.request({ method: "eth_accounts" });
    if (accounts?.length) {
      address = accounts[0];
      emit();
    }
  } catch {
    /* ignore */
  }
  return address;
}

export async function disconnectWallet() {
  address = null;
  provider = null;
  emit();
}

export function bindWalletListeners() {
  bindProviderListeners(getProvider());
}

export async function readChainId() {
  const p = getProvider();
  if (!p) return null;
  return p.request({ method: "eth_chainId" });
}
