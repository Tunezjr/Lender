/**
 * Lender frontend config — set addresses after contract deploy.
 * Override at runtime via window.__LENDER_CONFIG__ before modules load.
 */
const defaults = {
  lendPoolAddress: "0xc779850835B7C6872f7B2893A4d4A2cCf3733F15",
  usdcAddress: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  chainId: 143,
  chainIdHex: "0x8f",
  chainName: "Monad",
  rpcUrl: "https://rpc.monad.xyz",
  explorerUrl: "https://monadvision.com",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  ltvPercent: 30,
  loanDays: 7,
  usdcDecimals: 6,
  feePercent: 3,
  walletConnectProjectId: "",
};

export const config = {
  ...defaults,
  ...(typeof window !== "undefined" ? window.__LENDER_CONFIG__ || {} : {}),
};

export const DEMO_WALLET = "0xA11CE00000000000000000000000000000C0FFEE";

export const DUST = {
  token: "0xad96c3dffcd6374294e2573a7fbba96097cc8d7c",
  veNft: "0xbb4738d05ad1b3da57a4881bae62ce9bb1eeed6c",
  pair: "0x86dbf00485871c901c5129bd525348db96c2eb2d",
  usdc: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
};

export const COLLECTIONS = [
  {
    id: "chog",
    name: "Chog Genesis",
    address: "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763",
    tokenId: "",
    floorMon: 11800,
    floorUsd: 290,
    items: 1454,
    live: true,
    opensea: "https://opensea.io/collection/chog-genesis",
  },
  {
    id: "r3tards",
    name: "r3tards",
    address: "0x200723a706de0013316e5cd8eba2b3f53dd90c29",
    tokenId: "",
    floorMon: 5500,
    floorUsd: 138,
    items: 1033,
    live: true,
    opensea: "https://opensea.io/collection/r3tardsnft",
  },
  {
    id: "skrumpeys",
    name: "skrumpeys",
    address: "0xb0dad798c80e40dd6b8e8545074c6a5b7b97d2c0",
    tokenId: "",
    floorMon: 3343,
    floorUsd: 84,
    items: 3333,
    live: true,
    opensea: "https://opensea.io/collection/skrumpeys",
  },
  {
    id: "squad10k",
    name: "The 10k Squad",
    address: "0x818030837e8350ba63e64d7dc01a547fa73c8279",
    tokenId: "",
    floorMon: 2399,
    floorUsd: 60,
    items: 3333,
    live: true,
    opensea: "https://opensea.io/collection/the-10k-squad-350905768",
  },
  {
    id: "vedust",
    name: "Voting Escrow DUST",
    address: "0xbb4738d05ad1b3da57a4881bae62ce9bb1eeed6c",
    tokenId: "",
    floorMon: 0,
    floorUsd: 0,
    items: 0,
    live: true,
    valuation: "locked-dust",
    opensea: "https://opensea.io/collection/voting-escrow-dust",
  },
];

export function isPoolConfigured() {
  return Boolean(
    config.lendPoolAddress && /^0x[a-fA-F0-9]{40}$/.test(config.lendPoolAddress)
  );
}

export function isWalletConnectConfigured() {
  return Boolean(config.walletConnectProjectId);
}

export function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function money(n, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function isHexAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function toUsdcUnits(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Enter a USDC amount greater than 0");
  return Math.round(n * 10 ** config.usdcDecimals);
}
