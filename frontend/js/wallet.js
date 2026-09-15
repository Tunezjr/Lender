import { config, isWalletConnectConfigured, shortAddress } from "./config.js";

const SESSION_KEY = "lender-connector";
const SESSION_RDNS_KEY = "lender-connector-rdns";
const WC_PKG = "https://esm.sh/@walletconnect/ethereum-provider@2.21.1";
const QR_PKG = "https://esm.sh/qrcode@1.5.4";

let address = null;
let provider = null;
let walletConnectProvider = null;
let boundProvider = null;
let wcUriHandler = null;
const injectedByRdns = new Map();
const listeners = new Set();
let eip6963Bound = false;

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
  return provider;
}

function appOrigin() {
  try {
    return window.location.origin;
  } catch {
    return "https://lender-swart-zeta.vercel.app";
  }
}

function unbindProvider(p) {
  if (!p?.removeListener || !p.__lenderListenersBound) return;
  try {
    p.removeListener("accountsChanged", onAccountsChanged);
    p.removeListener("chainChanged", onChainChanged);
    p.removeListener("disconnect", onDisconnect);
    if (wcUriHandler) p.removeListener("display_uri", wcUriHandler);
  } catch {
    /* ignore */
  }
  p.__lenderListenersBound = false;
  if (boundProvider === p) boundProvider = null;
}

function onAccountsChanged(accounts) {
  address = accounts?.[0] || null;
  if (!address) {
    provider = null;
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_RDNS_KEY);
  }
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

function rememberInjected(detail) {
  const info = detail?.info || {};
  const p = detail?.provider;
  if (!p?.request) return;
  const rdns = String(info.rdns || (p.isMetaMask ? "io.metamask" : `injected-${injectedByRdns.size}`));
  injectedByRdns.set(rdns, {
    rdns,
    name: info.name || (p.isMetaMask ? "MetaMask" : "Browser wallet"),
    icon: info.icon || "",
    provider: p,
  });
}

function watchEip6963() {
  if (eip6963Bound || typeof window === "undefined") return;
  eip6963Bound = true;
  window.addEventListener("eip6963:announceProvider", (event) => rememberInjected(event.detail));
  try {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {
    /* ignore */
  }
}

export async function discoverInjected() {
  watchEip6963();
  await new Promise((r) => setTimeout(r, 80));
  if (!injectedByRdns.size && typeof window !== "undefined" && window.ethereum?.request) {
    rememberInjected({
      info: { name: window.ethereum.isMetaMask ? "MetaMask" : "Browser wallet", rdns: "injected" },
      provider: window.ethereum,
    });
  }
  return [...injectedByRdns.values()];
}

export async function ensureMonad(walletProvider = provider) {
  if (!walletProvider) throw new Error("Connect a wallet first.");
  try {
    await walletProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: config.chainIdHex }],
    });
  } catch (err) {
    const code = err?.code ?? err?.data?.originalError?.code;
    if (code === 4902 || /unrecognized chain/i.test(String(err?.message || ""))) {
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
    } else if (code === 4001) {
      throw new Error("Switch to Monad in your wallet to continue.");
    } else {
      throw err;
    }
  }
  const chainId = await walletProvider.request({ method: "eth_chainId" });
  if (String(chainId).toLowerCase() !== config.chainIdHex.toLowerCase()) {
    throw new Error("Wallet is not on Monad.");
  }
}

async function requestAccounts(walletProvider) {
  const requested = await walletProvider.request({ method: "eth_requestAccounts" }).catch(() => null);
  if (requested?.length) return requested;
  const existing = await walletProvider.request({ method: "eth_accounts" }).catch(() => null);
  if (existing?.length) return existing;
  throw new Error("No account returned from the wallet.");
}

export async function connectInjected(injected, rdns = "injected") {
  const wallet = injected || (await discoverInjected())[0]?.provider;
  if (!wallet) {
    throw new Error("No browser wallet found. Install MetaMask or Rabby, or use WalletConnect.");
  }
  const accounts = await requestAccounts(wallet);
  provider = wallet;
  bindProviderListeners(wallet);
  address = accounts[0];
  sessionStorage.setItem(SESSION_KEY, "injected");
  sessionStorage.setItem(SESSION_RDNS_KEY, rdns);
  emit();
  try {
    await ensureMonad(wallet);
  } catch {
    /* connected; network pill shows Wrong network until they switch */
  }
  return address;
}

async function loadEthereumProvider() {
  const mod = await import(WC_PKG);
  const EthereumProvider = mod.EthereumProvider || mod.default;
  if (!EthereumProvider?.init) {
    throw new Error("Unable to load WalletConnect. Check your connection and try again.");
  }
  return EthereumProvider;
}

async function getWalletConnectProvider() {
  if (walletConnectProvider) return walletConnectProvider;
  if (!isWalletConnectConfigured()) {
    throw new Error("WalletConnect project ID is missing.");
  }
  const EthereumProvider = await loadEthereumProvider();
  const origin = appOrigin();
  walletConnectProvider = await EthereumProvider.init({
    projectId: config.walletConnectProjectId,
    optionalChains: [config.chainId, 1],
    showQrModal: false,
    methods: [
      "eth_accounts",
      "eth_requestAccounts",
      "eth_sendTransaction",
      "eth_signTypedData_v4",
      "personal_sign",
    ],
    optionalMethods: [
      "eth_call",
      "eth_getBalance",
      "eth_chainId",
      "eth_getTransactionReceipt",
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
    ],
    events: ["accountsChanged", "chainChanged", "disconnect"],
    rpcMap: {
      [config.chainId]: config.rpcUrl,
    },
    metadata: {
      name: "Lender",
      description: "NFT-backed USDC credit on Monad",
      url: origin,
      icons: [`${origin}/favicon.svg`],
    },
  });
  return walletConnectProvider;
}

export async function renderWalletConnectQr(uri, canvas) {
  const mod = await import(QR_PKG);
  const QRCode = mod.default || mod;
  await QRCode.toCanvas(canvas, uri, {
    width: 280,
    margin: 1,
    color: { dark: "#0d253d", light: "#fff9f0" },
  });
}

export async function connectWalletConnect({ onUri } = {}) {
  if (walletConnectProvider && !walletConnectProvider.session) {
    try {
      await walletConnectProvider.disconnect();
    } catch {
      /* ignore */
    }
    walletConnectProvider = null;
  }

  const wc = await getWalletConnectProvider();

  if (wcUriHandler) {
    try {
      wc.removeListener("display_uri", wcUriHandler);
    } catch {
      /* ignore */
    }
  }
  wcUriHandler = (uri) => {
    if (typeof onUri === "function") onUri(uri);
  };
  wc.on("display_uri", wcUriHandler);

  if (!wc.session) {
    await wc.connect();
  }

  const accounts =
    wc.accounts?.length
      ? wc.accounts
      : (await wc.request({ method: "eth_requestAccounts" }).catch(() => null)) ||
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

  provider = wc;
  bindProviderListeners(wc);
  address = accounts[0];
  sessionStorage.setItem(SESSION_KEY, "wc");
  emit();
  try {
    await ensureMonad(wc);
  } catch {
    /* connected; prompt switch separately */
  }
  return address;
}

export async function connectWallet() {
  const injected = (await discoverInjected())[0]?.provider;
  if (injected) return connectInjected(injected);
  return connectWalletConnect();
}

export async function silentConnect() {
  try {
    const last = sessionStorage.getItem(SESSION_KEY);
    if (last === "wc") {
      const wc = await getWalletConnectProvider();
      if (wc.session) {
        const accounts = wc.accounts?.length
          ? wc.accounts
          : await wc.request({ method: "eth_accounts" });
        if (accounts?.length) {
          provider = wc;
          bindProviderListeners(wc);
          address = accounts[0];
          emit();
          return address;
        }
      }
      return null;
    }
    const injected = await discoverInjected();
    const rdns = sessionStorage.getItem(SESSION_RDNS_KEY);
    const match = (rdns && injected.find((w) => w.rdns === rdns)) || injected[0];
    if (!match?.provider) return null;
    const accounts = await match.provider.request({ method: "eth_accounts" });
    if (!accounts?.length) return null;
    provider = match.provider;
    bindProviderListeners(match.provider);
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
  sessionStorage.removeItem(SESSION_RDNS_KEY);
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
