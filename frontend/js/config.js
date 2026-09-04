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
    id: "helix",
    name: "Helix",
    address: "0x8f3C2A91E04B7d6eA1C5b0C4F2D9E8A7B6C5D4E3",
    tokenId: "8812",
    floor: 2400,
  },
  {
    id: "sorbets",
    name: "Sorbets",
    address: "0x2B14D7A0C9E8F3B1A5D6C7E9F001223344556677",
    tokenId: "42",
    floor: 860,
  },
  {
    id: "vault",
    name: "Vault Keys",
    address: "0xA01B23C45D67E89F01A2B3C4D5E6F70819283746",
    tokenId: "7",
    floor: 1500,
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
