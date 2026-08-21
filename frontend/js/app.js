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

const FEE_PERCENT = 3;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function setStatus(el, message, kind) {
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("status--ok", "status--err");
  if (kind === "ok") el.classList.add("status--ok");
  if (kind === "err") el.classList.add("status--err");
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
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

function setWizardStep(step) {
  $$(".wizard__step").forEach((el) => {
    el.classList.toggle("is-active", Number(el.dataset.step) === step);
  });
  $$("[data-wizard-panel]").forEach((panel) => {
    if (Number(panel.dataset.wizardPanel) === step) panel.removeAttribute("hidden");
    else panel.setAttribute("hidden", "");
  });
}

function readBorrowDraft() {
  return {
    collection: String($("#borrow-collection")?.value || "").trim(),
    tokenId: String($("#borrow-token")?.value || "").trim(),
    nftValue: Number(String($("#borrow-value")?.value || "").trim()),
    amount: String($("#borrow-amount")?.value || "").trim(),
  };
}

function updateTermsQuote() {
  const draft = readBorrowDraft();
  const collateral = Number.isFinite(draft.nftValue) ? draft.nftValue : 0;
  const maxBorrow = (collateral * config.ltvPercent) / 100;
  const amount = Number(draft.amount);
  const principal = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const fee = (principal * FEE_PERCENT) / 100;
  const repay = principal + fee;

  const set = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
  };

  set("#term-collateral", collateral > 0 ? `$${money(collateral)}` : "—");
  set("#term-ltv", `${config.ltvPercent}%`);
  set("#term-max", collateral > 0 ? `$${money(maxBorrow)} USDC` : "—");
  set("#term-fee", principal > 0 ? `$${money(fee)}` : "—");
  set("#term-repay", principal > 0 ? `$${money(repay)}` : "—");
  set("#term-days", `${config.loanDays} days`);

  set("#sum-collection", draft.collection ? shortAddress(draft.collection) : "—");
  set("#sum-token", draft.tokenId || "—");
  set("#sum-principal", principal > 0 ? `$${money(principal)} USDC` : "—");
  set("#sum-due", principal > 0 ? `$${money(repay)} USDC` : "—");

  return { collateral, maxBorrow, principal, fee, repay, draft };
}

function initBorrowWizard() {
  $("#borrow-to-terms")?.addEventListener("click", async () => {
    const status = $("#borrow-step1-status");
    const draft = readBorrowDraft();
    try {
      if (!getAddress()) await connectWallet();
      if (!/^0x[a-fA-F0-9]{40}$/.test(draft.collection)) {
        throw new Error("Enter a valid NFT collection address");
      }
      if (draft.tokenId === "" || Number.isNaN(Number(draft.tokenId))) {
        throw new Error("Enter a valid token ID");
      }
      if (!Number.isFinite(draft.nftValue) || draft.nftValue <= 0) {
        throw new Error("Enter an estimated NFT value greater than 0");
      }
      setStatus(status, "", null);
      updateTermsQuote();
      setWizardStep(2);
    } catch (err) {
      setStatus(status, err?.message || "Invalid NFT details", "err");
    }
  });

  $("#borrow-amount")?.addEventListener("input", () => updateTermsQuote());

  $("#borrow-to-confirm")?.addEventListener("click", () => {
    const status = $("#borrow-step2-status");
    const { principal, maxBorrow, draft } = updateTermsQuote();
    try {
      if (!Number.isFinite(principal) || principal <= 0) {
        throw new Error("Enter a USDC amount greater than 0");
      }
      if (principal > maxBorrow + 1e-9) {
        throw new Error(`Amount exceeds max borrow ($${money(maxBorrow)} at ${config.ltvPercent}% LTV)`);
      }
      toUsdcUnits(draft.amount);
      setStatus(status, "", null);
      updateTermsQuote();
      setWizardStep(3);
    } catch (err) {
      setStatus(status, err?.message || "Invalid amount", "err");
    }
  });

  $$("[data-wizard-back]").forEach((btn) => {
    btn.addEventListener("click", () => setWizardStep(Number(btn.dataset.wizardBack)));
  });

  $("#borrow-confirm")?.addEventListener("click", async () => {
    const status = $("#borrow-status");
    const { principal, draft } = updateTermsQuote();
    try {
      if (!getAddress()) await connectWallet();
      if (!isPoolConfigured()) {
        throw new Error("Set lendPoolAddress in config before borrowing on-chain");
      }
      const units = toUsdcUnits(draft.amount);
      setStatus(
        status,
        `Ready: lock ${shortAddress(draft.collection)} #${draft.tokenId} and borrow ${fromUsdcUnits(units)} USDC (${config.loanDays}d, max ${config.ltvPercent}% LTV).`,
        "ok"
      );
    } catch (err) {
      setStatus(status, err?.message || "Borrow failed", "err");
    }
  });

  setWizardStep(1);
}

function wireConnectButton(btn) {
  if (!btn) return;
  btn.addEventListener("click", async () => {
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
}

function initWalletUi() {
  const btn = $("#wallet-btn");
  const heroBtn = $("#hero-connect");
  const netDot = $("#network-dot");
  const netLabel = $("#network-label");

  onWalletChange(({ address, short }) => {
    [btn, heroBtn].forEach((b) => {
      if (!b) return;
      if (address) {
        b.textContent = short;
        b.classList.add("wallet-btn--connected");
        b.dataset.connected = "1";
      } else {
        b.textContent = "Connect Wallet";
        b.classList.remove("wallet-btn--connected");
        delete b.dataset.connected;
      }
    });
  });

  wireConnectButton(btn);
  wireConnectButton(heroBtn);

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
  banner.innerHTML = `<strong>Pool not connected yet.</strong> Set <code>lendPoolAddress</code> in <code>js/config.js</code> after deploy. USDC defaults to <code>${shortAddress(config.usdcAddress)}</code>.`;
}

function initForms() {
  $("#supply-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amount = String(fd.get("amount") || "").trim();
    const supplyStatus = $("#supply-status");
    try {
      if (!getAddress()) await connectWallet();
      if (!isPoolConfigured()) throw new Error("Set lendPoolAddress in config before supplying on-chain");
      const units = toUsdcUnits(amount);
      if (units === "0") throw new Error("Enter a USDC amount greater than 0");
      setStatus(supplyStatus, `Ready: supply ${fromUsdcUnits(units)} USDC.`, "ok");
    } catch (err) {
      setStatus(supplyStatus, err?.message || "Supply failed", "err");
    }
  });

  $("#repay-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const loanId = String(fd.get("loanId") || "").trim();
    const repayStatus = $("#repay-status");
    try {
      if (!getAddress()) await connectWallet();
      if (!isPoolConfigured()) throw new Error("Set lendPoolAddress in config before repaying on-chain");
      if (loanId === "") throw new Error("Enter a loan ID");
      setStatus(repayStatus, `Ready: repay loan #${loanId} and unlock NFT.`, "ok");
    } catch (err) {
      setStatus(repayStatus, err?.message || "Repay failed", "err");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initBorrowWizard();
  initWalletUi();
  initConfigBanner();
  initForms();
});
