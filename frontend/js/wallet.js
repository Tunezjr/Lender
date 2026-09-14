import { config, isWalletConnectConfigured, shortAddress } from "./config.js";

const WC_ORIGIN = "https://lender-swart-zeta.vercel.app";
const SESSION_KEY = "lender-connector";

let address = null;
let provider = null;
let walletConnectProvider = null;
let boundProvider = null;
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

function getInjectedProvider() {
  return window.ethereum || null;
}

export function getProvider() {
  return provider;
}

function unbindProvider(p) {
  if (!p?.removeListener || !p.__lenderListenersBound) return;
  try {
    p.removeListener("accountsChanged", onAccountsChanged);
    p.removeListener("chainChanged", onChainChanged);
    p.removeListener("disconnect", onDisconnect);
  } catch {
    /* ignore */
  }
  p.__lenderListenersBound = false;
  if (boundProvider === p) boundProvider = null;
}

function onAccountsChanged(accounts) {
  address = accounts?.[0] || null;
  if (!address) provider = null;
  emit();
}

function onChainChanged() {
  emit();
}

function onDisconnect() {
  address = null;
  provider = null;
  emit();
}

function bindProviderListeners(nextProvider) {
  if (!nextProvider?.on) return;
  if (boundProvider && boundProvider !== nextProvider) unbindProvider(boundProvider);
  if (nextProvider.__lenderListenersBound) {
    boundProvider = nextProvider;
    return;
  }
  nextProvider.__lenderListenersBound = true;
  nextProvider.on("accountsChanged", onAccountsChanged);
  nextProvider.on("chainChanged", onChainChanged);
  nextProvider.on("disconnect", onDisconnect);
  boundProvider = nextProvider;
}

async function getWalletConnectProvider() {
  if (walletConnectProvider) return walletConnectProvider;
  if (!isWalletConnectConfigured()) {
    throw new Error("WalletConnect project ID is missing.");
  }
  let EthereumProvider;
  try {
    ({ EthereumProvider } = await import(
      "https://esm.sh/@walletconnect/ethereum-provider@2.21.1"
    ));
  } catch {
    throw new Error("Unable to load WalletConnect. Check your connection and try again.");
  }
  walletConnectProvider = await EthereumProvider.init({
    projectId: config.walletConnectProjectId,
    chains: [config.chainId],
    optionalChains: [config.chainId],
    showQrModal: true,
    methods: [
      "eth_accounts",
      "eth_requestAccounts",
      "eth_sendTransaction",
      "eth_call",
      "eth_getBalance",
      "eth_chainId",
      "eth_getTransactionReceipt",
      "wallet_switchEthereumChain",
    ],
    events: ["accountsChanged", "chainChanged", "disconnect"],
    rpcMap: { [config.chainId]: config.rpcUrl },
    metadata: {
      name: "Lender",
      description: "NFT-backed USDC credit on Monad",
      url: WC_ORIGIN,
      icons: [`${WC_ORIGIN}/favicon.ico`],
    },
  });
  return walletConnectProvider;
}

export async function ensureMonad(walletProvider = provider) {
  if (!walletProvider) {
    throw new Error("Connect a wallet first.");
  }
  try {
    await walletProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.chainIdHex }],
    });
  } catch (err) {
    if (err?.code === 4902 && walletProvider !== walletConnectProvider) {
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
    } else if (walletProvider === walletConnectProvider) {
      throw new Error("Reconnect with a WalletConnect wallet set to Monad.");
    } else {
      throw err;
    }
  }
  const chainId = await walletProvider.request({ method: "eth_chainId" });
  if (String(chainId).toLowerCase() !== config.chainIdHex.toLowerCase()) {
    throw new Error("Wallet is not on Monad.");
  }
}

export async function connectWalletConnect() {
  const wc = await getWalletConnectProvider();
  await wc.connect();
  const accounts =
    (await wc.request({ method: "eth_requestAccounts" }).catch(() => null)) ||
    (await wc.request({ method: "eth_accounts" }));
  if (!accounts?.length) {
    try {
      await wc.disconnect();
    } catch {
      /* ignore */
    }
    walletConnectProvider = null;
    throw new Error("No account returned from WalletConnect");
  }
  const chainId = await wc.request({ method: "eth_chainId" });
  if (String(chainId).toLowerCase() !== config.chainIdHex.toLowerCase()) {
    throw new Error("Reconnect with a WalletConnect wallet set to Monad.");
  }
  provider = wc;
  bindProviderListeners(wc);
  address = accounts[0];
  sessionStorage.setItem(SESSION_KEY, "wc");
  emit();
  return address;
}

export async function connectWallet() {
  const injected = getInjectedProvider();
  if (!injected) return connectWalletConnect();
  await ensureMonad(injected);
  const accounts = await injected.request({ method: "eth_requestAccounts" });
  if (!accounts?.length) throw new Error("No account returned");
  provider = injected;
  bindProviderListeners(injected);
  address = accounts[0];
  sessionStorage.setItem(SESSION_KEY, "injected");
  emit();
  return address;
}

export async function silentConnect() {
  try {
    const last = sessionStorage.getItem(SESSION_KEY);
    if (last === "wc") {
      const wc = await getWalletConnectProvider();
      if (wc.session) {
        const accounts = await wc.request({ method: "eth_accounts" });
        const chainId = await wc.request({ method: "eth_chainId" });
        if (
          accounts?.length &&
          String(chainId).toLowerCase() === config.chainIdHex.toLowerCase()
        ) {
          provider = wc;
          bindProviderListeners(wc);
          address = accounts[0];
          emit();
          return address;
        }
      }
      return null;
    }
    const injected = getInjectedProvider();
    if (!injected || last === "wc") return null;
    const accounts = await injected.request({ method: "eth_accounts" });
    if (!accounts?.length) return null;
    const chainId = await injected.request({ method: "eth_chainId" });
    if (String(chainId).toLowerCase() !== config.chainIdHex.toLowerCase()) {
      return null;
    }
    provider = injected;
    bindProviderListeners(injected);
    address = accounts[0];
    emit();
  } catch {
    /* ignore */
  }
  return address;
}

export async function disconnectWallet() {
  const active = provider;
  address = null;
  provider = null;
  sessionStorage.removeItem(SESSION_KEY);
  emit();
  unbindProvider(active);
  if (walletConnectProvider) {
    try {
      await walletConnectProvider.disconnect();
    } catch {
      /* ignore */
    }
    walletConnectProvider = null;
  }
}

export function bindWalletListeners() {
  if (provider) bindProviderListeners(provider);
}

export async function readChainId() {
  if (!provider) return null;
  return provider.request({ method: "eth_chainId" });
}

export async function assertActiveAccount(from) {
  if (!provider) throw new Error("Connect a wallet first");
  const accounts = await provider.request({ method: "eth_accounts" });
  const ok = (accounts || []).some((a) => a.toLowerCase() === String(from).toLowerCase());
  if (!ok) throw new Error("Connected wallet does not match the signer");
  const chainId = await provider.request({ method: "eth_chainId" });
  if (String(chainId).toLowerCase() !== config.chainIdHex.toLowerCase()) {
    throw new Error("Wallet is not on Monad.");
  }
}
