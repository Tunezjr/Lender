/**
 * Lender frontend config — set addresses after contract deploy.
 * Override at runtime via window.__LENDER_CONFIG__ before modules load,
 * or edit these defaults.
 */
const defaults = {
  /** ParadiseNFTLoan or Bend LendPool address */
  lendPoolAddress: "",
  /** Circle USDC on Monad mainnet */
  usdcAddress: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  chainId: 143,
  chainIdHex: "0x8f",
  chainName: "Monad",
  rpcUrl: "https://rpc.monad.xyz",
  explorerUrl: "https://monadvision.com",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  /** Product rules (must match on-chain config) */
  ltvPercent: 30,
  loanDays: 7,
  usdcDecimals: 6,
};

export const config = {
  ...defaults,
  ...(typeof window !== "undefined" ? window.__LENDER_CONFIG__ || {} : {}),
};

export function isPoolConfigured() {
  return Boolean(
    config.lendPoolAddress && /^0x[a-fA-F0-9]{40}$/.test(config.lendPoolAddress)
  );
}

export function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
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
