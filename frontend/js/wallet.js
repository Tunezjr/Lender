import { config, isWalletConnectConfigured, shortAddress } from "./config.js";

const SESSION_KEY = "lender-connector";
const SESSION_RDNS_KEY = "lender-connector-rdns";
const WC_PKG = "https://esm.sh/@walletconnect/ethereum-provider@2.21.1";
const QR_PKG = "https://esm.sh/qrcode@1.5.4";
const WC_CONNECT_MS = 90000;

let address = null;
let provider = null;
let walletConnectProvider = null;
let boundProvider = null;
let wcUriHandler = null;
let wcGeneration = 0;
let connectLock = false;
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

function errCode(err) {
  return err?.code ?? err?.data?.originalError?.code ?? err?.cause?.code;
}

function rejectError(message = "Request rejected in the wallet.") {
  const e = new Error(message);
  e.code = 4001;
  return e;
}

export function isWcV2Uri(uri) {
  if (typeof uri !== "string" || uri.length > 2048) return false;
  if (/[\u0000-\u001F\u007F]/.test(uri)) return false;
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.protocol !== "wc:") return false;
  const path = `${parsed.hostname}${parsed.pathname}`.replace(/^\/*/, "");
  if (!/^[a-f0-9-]{32,64}@2$/i.test(path)) return false;
  const key = parsed.searchParams.get("symKey") || "";
  return Boolean(parsed.searchParams.get("relay-protocol") && /^[a-f0-9]{64}$/i.test(key));
}

function unbindProvider(p) {
  if (!p) return;
  try {
    p.removeListener?.("accountsChanged", onAccountsChanged);
    p.removeListener?.("chainChanged", onChainChanged);
    p.removeListener?.("disconnect", onDisconnect);
    if (wcUriHandler) p.removeListener?.("display_uri", wcUriHandler);
  } catch {
    /* ignore */
  }
  p.__lenderListenersBound = false;
  if (boundProvider === p) boundProvider = null;
}

async function clearWalletConnect() {
  const wc = walletConnectProvider;
  walletConnectProvider = null;
  wcUriHandler = null;
  if (!wc) return;
  try {
    await wc.disconnect();
  } catch {
    /* ignore */
  }
}

async function fullLogout() {
  const active = provider;
  address = null;
  provider = null;
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_RDNS_KEY);
  emit();
  unbindProvider(active);
  await clearWalletConnect();
}

function onAccountsChanged(accounts) {
  address = accounts?.[0] || null;
  if (!address) {
    void fullLogout();
    return;
  }
  sessionStorage.setItem(
    SESSION_KEY,
    sessionStorage.getItem(SESSION_KEY) || (walletConnectProvider === provider ? "wc" : "injected"),
  );
  emit();
}

function onChainChanged() {
  emit();
}

function onDisconnect() {
  void fullLogout();
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
  const rdns = String(info.rdns || (p.isMetaMask ? "io.metamask" : "")).trim();
  if (!rdns) return;
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
  await new Promise((r) => setTimeout(r, 200));
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
    const code = errCode(err);
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
      throw rejectError("Switch to Monad in your wallet to continue.");
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
  try {
    const requested = await walletProvider.request({ method: "eth_requestAccounts" });
    if (requested?.length) return requested;
  } catch (err) {
    if (errCode(err) === 4001) throw rejectError();
    throw err;
  }
  throw new Error("No account returned from the wallet.");
}

export async function connectInjected(injected, rdns = "injected") {
  const wallet = injected || (await discoverInjected())[0]?.provider;
  if (!wallet) {
    throw new Error("No browser wallet found. Install MetaMask or Rabby, or use WalletConnect.");
  }
  const accounts = await requestAccounts(wallet);
  if (walletConnectProvider && wallet !== walletConnectProvider) {
    await clearWalletConnect();
  }
  provider = wallet;
  bindProviderListeners(wallet);
  address = accounts[0];
  sessionStorage.setItem(SESSION_KEY, "injected");
  sessionStorage.setItem(SESSION_RDNS_KEY, rdns);
  emit();
  try {
    await ensureMonad(wallet);
  } catch (err) {
    if (errCode(err) === 4001) throw err;
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
    methods: ["eth_accounts", "eth_requestAccounts", "eth_sendTransaction"],
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
  if (!isWcV2Uri(uri)) throw new Error("WalletConnect returned an invalid pairing code.");
  const mod = await import(QR_PKG);
  const QRCode = mod.default || mod;
  await QRCode.toCanvas(canvas, uri, {
    width: 280,
    margin: 1,
    color: { dark: "#0d253d", light: "#fff9f0" },
  });
}

function withTimeout(promise, ms, message) {
  let timer = 0;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

export async function abortWalletConnect() {
  wcGeneration += 1;
  connectLock = false;
  if (walletConnectProvider && !walletConnectProvider.session) {
    await clearWalletConnect();
  }
}

export async function connectWalletConnect({ onUri } = {}) {
  if (connectLock) throw new Error("WalletConnect is already in progress.");
  connectLock = true;
  const gen = ++wcGeneration;
  try {
    if (walletConnectProvider && !walletConnectProvider.session) {
      await clearWalletConnect();
    }

    const wc = await getWalletConnectProvider();
    if (gen !== wcGeneration) throw new Error("WalletConnect cancelled.");

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
      await withTimeout(
        wc.connect(),
        WC_CONNECT_MS,
        "WalletConnect timed out. Scan again.",
      );
    }
    if (gen !== wcGeneration) throw new Error("WalletConnect cancelled.");

    const accounts = wc.accounts?.length
      ? wc.accounts
      : await wc.request({ method: "eth_accounts" });
    if (!accounts?.length) {
      await clearWalletConnect();
      throw new Error("No account returned from WalletConnect");
    }

    if (provider && provider !== wc) unbindProvider(provider);
    provider = wc;
    bindProviderListeners(wc);
    address = accounts[0];
    sessionStorage.setItem(SESSION_KEY, "wc");
    sessionStorage.removeItem(SESSION_RDNS_KEY);
    emit();
    try {
      await ensureMonad(wc);
    } catch {
      /* connected; prompt switch separately */
    }
    return address;
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (/reset|closed|rejected|denied|cancel/i.test(msg) || errCode(err) === 4001) {
      throw rejectError("WalletConnect cancelled.");
    }
    throw err;
  } finally {
    if (gen === wcGeneration) connectLock = false;
  }
}

export async function connectWallet() {
  const wallets = await discoverInjected();
  if (wallets[0]?.provider) return connectInjected(wallets[0].provider, wallets[0].rdns);
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
      sessionStorage.removeItem(SESSION_KEY);
      await clearWalletConnect();
      return null;
    }
    if (last !== "injected") return null;
    const injected = await discoverInjected();
    const rdns = sessionStorage.getItem(SESSION_RDNS_KEY);
    const match = rdns ? injected.find((w) => w.rdns === rdns) : null;
    if (!match?.provider) {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_RDNS_KEY);
      return null;
    }
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
  await fullLogout();
}

export function bindWalletListeners() {
  if (provider) bindProviderListeners(provider);
}

export async function readChainId() {
  if (!provider) return null;
  const id = await provider.request({ method: "eth_chainId" });
  if (id == null) return null;
  const hex = typeof id === "number" ? `0x${id.toString(16)}` : String(id);
  return hex.toLowerCase();
}

export async function assertActiveAccount(from) {
  if (!provider) throw new Error("Connect a wallet first");
  const accounts = await provider.request({ method: "eth_accounts" });
  const ok = (accounts || []).some((a) => a.toLowerCase() === String(from).toLowerCase());
  if (!ok) throw new Error("Connected wallet does not match the signer");
  const chainId = await readChainId();
  if (String(chainId || "").toLowerCase() !== config.chainIdHex.toLowerCase()) {
    throw new Error("Wallet is not on Monad.");
  }
}
