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
};

export const config = {
  ...defaults,
  ...(typeof window !== "undefined" ? window.__LENDER_CONFIG__ || {} : {}),
};

export const DEMO_WALLET = "0xA11CE00000000000000000000000000000C0FFEE";

export const COLLECTIONS = [
  {
    id: "molandaks",
    name: "Molandaks",
    address: "0x36982448e77658b8f58f4665696e3173d1e696c2",
    tokenId: "",
    floorMon: 400,
    floorUsd: 12.4,
    items: 3333,
    opensea: "https://opensea.io/collection/molandaks-monad",
  },
  {
    id: "chewy",
    name: "Chewy",
    address: "0xe1ddf619bb352e6eb25367be99606be02836cbbc",
    tokenId: "",
    floorMon: 64.6,
    floorUsd: 1.72,
    items: 2448,
    opensea: "https://opensea.io/collection/chewy-monad",
  },
];

export function isPoolConfigured() {
  return Boolean(
    config.lendPoolAddress && /^0x[a-fA-F0-9]{40}$/.test(config.lendPoolAddress)
  );
}

export function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function money(n, digits = 2) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function toUsdcUnits(amountStr) {
  const s = String(amountStr || "").trim();
  if (!s || Number(s) < 0) throw new Error("Invalid amount");
  const [whole, frac = ""] = s.split(".");
  const padded = frac.padEnd(config.usdcDecimals, "0").slice(0, config.usdcDecimals);
  return BigInt(whole + padded || "0").toString();
}

export function fromUsdcUnits(raw, digits = 2) {
  try {
    const v = BigInt(raw || "0");
    const base = 10n ** BigInt(config.usdcDecimals);
    const whole = v / base;
    const frac = v % base;
    if (frac === 0n) return whole.toString();
    const fracStr = frac
      .toString()
      .padStart(config.usdcDecimals, "0")
      .slice(0, digits)
      .replace(/0+$/, "");
    return fracStr ? `${whole}.${fracStr}` : whole.toString();
  } catch {
    return "0";
  }
}
