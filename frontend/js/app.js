import { initNavDropdown } from "./nav-dropdown.js";
import {
  config,
  isPoolConfigured,
  shortAddress,
  toUsdcUnits,
  fromUsdcUnits,
} from "./config.js";
import {
  connectWallet,
  silentConnect,
  disconnectWallet,
  onWalletChange,
  bindWalletListeners,
  getAddress,
} from "./wallet.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setStatus(el, message, kind) {
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("status--ok", "status--err");
  if (kind === "ok") el.classList.add("status--ok");
  if (kind === "err") el.classList.add("status--err");
}

function initTabs() {
  const tabs = $$(".tab");
  const panels = $$("[data-tab-panel]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = tab.dataset.tab;
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      panels.forEach((p) => {
        if (p.dataset.tabPanel === id) p.removeAttribute("hidden");
        else p.setAttribute("hidden", "");
      });
    });
  });
}

function initWalletUi() {
  const btn = $("#wallet-btn");
  const netDot = $("#network-dot");
  const netLabel = $("#network-label");

  onWalletChange(({ address, short }) => {
    if (!btn) return;
    if (address) {
      btn.textContent = short;
      btn.classList.add("wallet-btn--connected");
      btn.dataset.connected = "1";
    } else {
      btn.textContent = "Connect wallet";
      btn.classList.remove("wallet-btn--connected");
      delete btn.dataset.connected;
    }
  });

  btn?.addEventListener("click", async () => {
    try {
      if (btn.dataset.connected) {
        disconnectWallet();
        return;
      }
      await connectWallet();
    } catch (e) {
      alert(e?.message || "Wallet connection failed");
    }
  });

  async function refreshNetwork() {
    if (!window.ethereum || !netDot || !netLabel) return;
    try {
      const id = await window.ethereum.request({ method: "eth_chainId" });
      const onMonad = id === config.chainIdHex;
      netDot.classList.toggle("network-pill__dot--warn", !onMonad);
      netLabel.textContent = onMonad ? "Monad" : "Wrong network";
    } catch {
      netLabel.textContent = "Network";
    }
  }

  bindWalletListeners();
  silentConnect().then(refreshNetwork);
  window.ethereum?.on?.("chainChanged", refreshNetwork);
}

function initConfigBanner() {
  const banner = $("#config-banner");
  if (!banner) return;
  if (isPoolConfigured()) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  banner.innerHTML = `<strong>Pool not connected yet.</strong> Lending actions stay local until you set <code>lendPoolAddress</code> in <code>js/config.js</code>. USDC on Monad defaults to <code>${shortAddress(config.usdcAddress)}</code>.`;
}

function initForms() {
  const borrowStatus = $("#borrow-status");
  const supplyStatus = $("#supply-status");
  const repayStatus = $("#repay-status");

  $("#borrow-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const collection = String(fd.get("collection") || "").trim();
    const tokenId = String(fd.get("tokenId") || "").trim();
    const amount = String(fd.get("amount") || "").trim();
    try {
      if (!getAddress()) await connectWallet();
      if (!isPoolConfigured()) throw new Error("Set lendPoolAddress in config before borrowing on-chain");
      if (!/^0x[a-fA-F0-9]{40}$/.test(collection)) throw new Error("Enter a valid NFT collection address");
      if (tokenId === "" || Number.isNaN(Number(tokenId))) throw new Error("Enter a valid token ID");
      const units = toUsdcUnits(amount);
      if (units === "0") throw new Error("Enter a USDC amount greater than 0");
      setStatus(
        borrowStatus,
        `Ready: borrow ${fromUsdcUnits(units)} USDC against ${shortAddress(collection)} #${tokenId} for ${config.loanDays} days (max ${config.ltvPercent}% LTV). Wire contract calls next.`,
        "ok"
      );
    } catch (err) {
      setStatus(borrowStatus, err?.message || "Borrow failed", "err");
    }
  });

  $("#supply-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amount = String(fd.get("amount") || "").trim();
    try {
      if (!getAddress()) await connectWallet();
      if (!isPoolConfigured()) throw new Error("Set lendPoolAddress in config before supplying on-chain");
      const units = toUsdcUnits(amount);
      if (units === "0") throw new Error("Enter a USDC amount greater than 0");
      setStatus(supplyStatus, `Ready: supply ${fromUsdcUnits(units)} USDC liquidity. Wire depositLiquidity next.`, "ok");
    } catch (err) {
      setStatus(supplyStatus, err?.message || "Supply failed", "err");
    }
  });

  $("#repay-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const loanId = String(fd.get("loanId") || "").trim();
    try {
      if (!getAddress()) await connectWallet();
      if (!isPoolConfigured()) throw new Error("Set lendPoolAddress in config before repaying on-chain");
      if (loanId === "") throw new Error("Enter a loan ID");
      setStatus(repayStatus, `Ready: repay loan #${loanId}. Wire repay(loanId) next.`, "ok");
    } catch (err) {
      setStatus(repayStatus, err?.message || "Repay failed", "err");
    }
  });
}

function initStatsPlaceholder() {
  const map = {
    "#stat-ltv": `${config.ltvPercent}%`,
    "#stat-term": `${config.loanDays}d`,
    "#stat-asset": "USDC",
    "#stat-chain": config.chainName,
  };
  Object.entries(map).forEach(([sel, val]) => {
    const el = $(sel);
    if (el) el.textContent = val;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector("[data-nav-root]");
  if (nav) initNavDropdown(nav);
  initTabs();
  initWalletUi();
  initConfigBanner();
  initForms();
  initStatsPlaceholder();
});
