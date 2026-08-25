import {
  COLLECTIONS,
  config,
  isPoolConfigured,
  money,
  shortAddress,
  toUsdcUnits,
} from "./config.js";
import {
  connectWallet,
  silentConnect,
  disconnectWallet,
  onWalletChange,
  bindWalletListeners,
  getAddress,
} from "./wallet.js";

const FEE_PERCENT = config.feePercent;
const STORE_KEY = "lender-atlas";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "") || { loans: [], supplied: 0 };
  } catch {
    return { loans: [], supplied: 0 };
  }
}

function saveStore(next) {
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
}

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

function showLoansTab() {
  $$(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === "loans")));
  $$("[data-tab-panel]").forEach((p) => {
    if (p.dataset.tabPanel === "loans") p.removeAttribute("hidden");
    else p.setAttribute("hidden", "");
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
    collectionName: String($("#borrow-collection")?.dataset.name || "").trim(),
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
  set("#sum-collection", draft.collectionName || (draft.collection ? shortAddress(draft.collection) : "—"));
  set("#sum-token", draft.tokenId || "—");
  set("#sum-principal", principal > 0 ? `$${money(principal)} USDC` : "—");
  set("#sum-due", principal > 0 ? `$${money(repay)} USDC` : "—");

  return { collateral, maxBorrow, principal, fee, repay, draft };
}

function renderNftGrid() {
  const grid = $("#nft-grid");
  if (!grid) return;
  grid.innerHTML = COLLECTIONS.map(
    (c) => `
    <button type="button" class="nft-pick" data-id="${c.id}">
      <div class="nft-face nft-face--${c.id}"><span class="nft-face__shine"></span></div>
      <strong>${c.name} #${c.tokenId}</strong>
      <span>Floor $${money(c.floor, 0)}</span>
    </button>`
  ).join("");

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".nft-pick");
    if (!btn) return;
    const c = COLLECTIONS.find((x) => x.id === btn.dataset.id);
    if (!c) return;
    $$(".nft-pick").forEach((el) => el.classList.toggle("is-selected", el === btn));
    const col = $("#borrow-collection");
    const tok = $("#borrow-token");
    const val = $("#borrow-value");
    if (col) {
      col.value = c.address;
      col.dataset.name = c.name;
    }
    if (tok) tok.value = c.tokenId;
    if (val) val.value = String(c.floor);
    $("#custom-fields")?.setAttribute("hidden", "");
    const toggle = $("#toggle-custom");
    if (toggle) toggle.textContent = "Use a different collection";
  });
}

function renderLoans() {
  const store = loadStore();
  const list = $("#loans-list");
  const tvl = $("#stat-tvl");
  const supply = $("#stat-supply");
  const open = $("#stat-loans");
  const active = store.loans.filter((l) => l.status === "active");
  if (tvl) tvl.textContent = `$${money(1_240_000 + store.supplied, 0)}`;
  if (supply) supply.textContent = `$${money(store.supplied, 0)}`;
  if (open) open.textContent = String(active.length);
  if (!list) return;
  if (!store.loans.length) {
    list.innerHTML = `<div class="loan loan--empty">No loans yet. Borrow against an NFT to see it listed here.</div>`;
    return;
  }
  list.innerHTML = store.loans
    .map((loan) => {
      const due = new Date(loan.dueAt).toLocaleDateString();
      const action =
        loan.status === "active"
          ? `<button type="button" class="btn-cta" data-repay="${loan.id}">Repay</button>`
          : `<span class="loan--repaid">Unlocked</span>`;
      return `<div class="loan">
        <div>
          <strong>${loan.collectionName} #${loan.tokenId}</strong>
          <p>$${money(loan.principal)} · due $${money(loan.repay)} · ${due}</p>
        </div>
        ${action}
      </div>`;
    })
    .join("");
}

function initBorrowWizard() {
  $("#borrow-to-terms")?.addEventListener("click", async () => {
    const status = $("#borrow-step1-status");
    const draft = readBorrowDraft();
    try {
      if (!getAddress()) await connectWallet();
      if (!/^0x[a-fA-F0-9]{40}$/.test(draft.collection)) {
        throw new Error("Select an NFT or enter a valid collection address");
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
    const { principal, fee, repay, draft } = updateTermsQuote();
    try {
      if (!getAddress()) await connectWallet();
      const store = loadStore();
      store.loans.unshift({
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        collection: draft.collection,
        collectionName: draft.collectionName || shortAddress(draft.collection),
        tokenId: draft.tokenId,
        principal,
        fee,
        repay,
        openedAt: Date.now(),
        dueAt: Date.now() + config.loanDays * 86_400_000,
        status: "active",
      });
      saveStore(store);
      renderLoans();
      const note = isPoolConfigured()
        ? `Locked ${draft.collectionName || shortAddress(draft.collection)} #${draft.tokenId}.`
        : `Preview loan opened (pool address not set). Locked ${draft.collectionName || shortAddress(draft.collection)} #${draft.tokenId}.`;
      setStatus(status, `${note} $${money(principal)} USDC.`, "ok");
      setWizardStep(1);
      showLoansTab();
    } catch (err) {
      setStatus(status, err?.message || "Borrow failed", "err");
    }
  });

  $("#toggle-custom")?.addEventListener("click", () => {
    const box = $("#custom-fields");
    const hidden = box?.hasAttribute("hidden");
    if (hidden) {
      box.removeAttribute("hidden");
      $("#toggle-custom").textContent = "Hide custom token";
      $$(".nft-pick").forEach((el) => el.classList.remove("is-selected"));
      const col = $("#borrow-collection");
      if (col) {
        col.value = "";
        delete col.dataset.name;
      }
    } else {
      box.setAttribute("hidden", "");
      $("#toggle-custom").textContent = "Use a different collection";
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

  onWalletChange(({ address, short, kind }) => {
    [btn, heroBtn].forEach((b) => {
      if (!b) return;
      if (address) {
        b.textContent = kind === "demo" ? `${short} · preview` : short;
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
    if (!netDot || !netLabel) return;
    if (!window.ethereum) {
      netLabel.textContent = "Monad";
      return;
    }
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
  banner.innerHTML = `<strong>Pool not connected yet.</strong> Set <code>lendPoolAddress</code> in <code>js/config.js</code> after deploy. USDC defaults to <code>${shortAddress(config.usdcAddress)}</code>. Preview loans still work locally.`;
}

function initForms() {
  $("#supply-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amount = String(fd.get("amount") || "").trim();
    const supplyStatus = $("#supply-status");
    try {
      if (!getAddress()) await connectWallet();
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) throw new Error("Enter a USDC amount greater than 0");
      toUsdcUnits(amount);
      const store = loadStore();
      store.supplied += n;
      saveStore(store);
      renderLoans();
      e.target.reset();
      const extra = isPoolConfigured() ? "" : " Preview supply recorded locally.";
      setStatus(supplyStatus, `Supplied $${money(n)} USDC.${extra}`, "ok");
    } catch (err) {
      setStatus(supplyStatus, err?.message || "Supply failed", "err");
    }
  });

  $("#loans-list")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-repay]");
    if (!btn) return;
    try {
      if (!getAddress()) await connectWallet();
      const store = loadStore();
      store.loans = store.loans.map((l) =>
        l.id === btn.dataset.repay ? { ...l, status: "repaid" } : l
      );
      saveStore(store);
      renderLoans();
    } catch (err) {
      alert(err?.message || "Repay failed");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderNftGrid();
  renderLoans();
  initTabs();
  initBorrowWizard();
  initWalletUi();
  initConfigBanner();
  initForms();
});
