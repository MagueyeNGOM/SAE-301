import { AdminOrderData } from "../../../data/admin-order.js";
import { genericRenderer, htmlToFragment } from "../../../lib/utils.js";
import { formaterPrix } from "../../../lib/format.js";
import template from "./template.html?raw";
import itemTemplate from "./item.html?raw";

const STATUTS = ["en cours", "disponible", "retirée", "annulée"];
const SUIVANT = { "en cours": "disponible", disponible: "retirée" };
// Classes écrites en entier : Tailwind ne génère que celles qu'il trouve telles quelles.
const BADGES = {
  "en cours": "bg-om-attention-fond text-om-attention",
  disponible: "bg-om-fond-doux text-om-bleu",
  "retirée": "bg-om-succes-fond text-om-succes",
  "annulée": "bg-om-erreur-fond text-om-erreur",
};
const BADGE_BASE = "inline-block rounded px-2 py-1 text-[10px] font-semibold uppercase ";

const formatDate = (value) => new Date(value.replace(" ", "T")).toLocaleDateString("fr-FR");

export function OrdersSection(onUnauthorized) {
  const M = {
    orders: [], counts: {}, tri: "date", sens: "desc", filtre: "", selected: new Set(),
    detail: null, confirming: null, loaded: false, loadError: "", actionError: "", success: "", busy: false,
  };
  const V = { root: null };
  const C = {};

  C.error = (error) => {
    if (error.statut === 401 || error.statut === 403) onUnauthorized(error);
    return error.message;
  };

  C.load = async () => {
    try {
      const data = await AdminOrderData.all({ tri: M.tri, sens: M.sens, statut: M.filtre });
      M.orders = data.commandes;
      M.counts = data.compteurs;
      // Une commande qui n'est plus affichée ne reste pas sélectionnée.
      M.selected = new Set(M.orders.filter((order) => M.selected.has(order.id)).map((order) => order.id));
      M.loaded = true;
      M.loadError = "";
    } catch (error) { M.loadError = C.error(error); }
  };

  C.view = async (id) => {
    if (M.busy) return;
    M.busy = true;
    M.success = M.actionError = "";
    V.refresh();
    try {
      M.detail = (await AdminOrderData.find(id)).commande;
      M.loadError = "";
    } catch (error) { M.loadError = C.error(error); }
    finally { M.busy = false; }
    V.refresh(M.detail ? "#order-title" : '[data-role="load-error"] [role="alert"]');
  };

  C.back = async () => {
    if (M.busy) return;
    M.detail = M.confirming = null;
    M.success = M.actionError = "";
    await C.load();
    V.refresh("#orders-title");
  };

  // Applique « suivant » ou « annuler » à des commandes, puis résume le résultat.
  C.run = async (ids, action) => {
    if (M.busy || !ids.length) return;
    M.busy = true;
    M.success = M.actionError = "";
    V.refresh();
    try {
      const { resultats } = await AdminOrderData.act(ids, action);
      const done = resultats.filter((result) => result.ok).length;
      const failed = resultats.filter((result) => !result.ok);
      if (done) M.success = done === 1 ? "1 commande mise à jour." : `${done} commandes mises à jour.`;
      if (failed.length) M.actionError = failed.map((result) => `${result.numero ?? "Commande"} : ${result.message}`).join(" ");
      M.confirming = null;
      M.selected = new Set();
      if (M.detail) M.detail = (await AdminOrderData.find(M.detail.id)).commande;
      await C.load();
    } catch (error) { M.actionError = C.error(error); }
    finally { M.busy = false; }
    V.refresh(M.actionError ? '[data-role="action-error"]' : '[data-role="success"]');
  };

  C.sort = async (key) => {
    if (M.busy) return;
    M.sens = M.tri === key && M.sens === "desc" ? "asc" : "desc";
    M.tri = key;
    await C.load();
    V.refresh(`[data-key="${key}"]`);
  };

  C.filter = async (statut) => {
    if (M.busy) return;
    M.filtre = statut;
    await C.load();
    V.refresh(`[data-filter="${statut}"]`);
  };

  V.list = (root) => {
    const filters = root.querySelector('[data-role="filters"]');
    const total = Object.values(M.counts).reduce((sum, n) => sum + n, 0);
    for (const [statut, label, count] of [["", "Toutes", total], ...STATUTS.map((s) => [s, s[0].toUpperCase() + s.slice(1), M.counts[s] ?? 0])]) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.dataset.filter = statut;
      chip.textContent = `${label} · ${count}`;
      chip.setAttribute("aria-pressed", String(M.filtre === statut));
      chip.className = "rounded-lg px-4 py-2 text-[13px] bg-om-fond-doux text-om-bleu aria-pressed:bg-om-bleu aria-pressed:font-semibold aria-pressed:text-white disabled:opacity-65";
      chip.addEventListener("click", () => C.filter(statut));
      filters.append(chip);
    }
    for (const th of root.querySelectorAll("[data-sort]")) {
      th.setAttribute("aria-sort", th.dataset.sort === M.tri ? (M.sens === "asc" ? "ascending" : "descending") : "none");
      const button = th.querySelector("button");
      if (th.dataset.sort === M.tri) button.textContent += M.sens === "asc" ? " ↑" : " ↓";
      button.addEventListener("click", () => C.sort(th.dataset.sort));
    }
    const list = root.querySelector('[data-role="list"]');
    for (const order of M.orders) {
      const row = htmlToFragment(genericRenderer(itemTemplate, {
        numero: order.numero, client: order.client, date: formatDate(order.date), statut: order.statut, total: formaterPrix(order.total),
      }));
      row.querySelector('[data-role="badge"]').className = BADGE_BASE + BADGES[order.statut];
      const check = row.querySelector('[data-role="select"]');
      check.checked = M.selected.has(order.id);
      check.addEventListener("change", () => {
        if (check.checked) M.selected.add(order.id); else M.selected.delete(order.id);
        V.refresh(`[aria-label="Sélectionner la commande ${order.numero}"]`);
      });
      row.querySelector('[data-action="view"]').addEventListener("click", () => C.view(order.id));
      const cancel = row.querySelector('[data-action="cancel"]');
      cancel.hidden = !SUIVANT[order.statut];
      cancel.addEventListener("click", () => {
        M.confirming = { ids: [order.id], label: `la commande ${order.numero}` };
        V.refresh('[data-role="confirmation"]');
      });
      list.append(row);
    }
    root.querySelector('[data-role="empty"]').hidden = M.orders.length !== 0;
    const all = root.querySelector('[data-role="select-all"]');
    all.checked = M.orders.length > 0 && M.selected.size === M.orders.length;
    all.addEventListener("change", () => {
      M.selected = all.checked ? new Set(M.orders.map((order) => order.id)) : new Set();
      V.refresh('[data-role="select-all"]');
    });
    const picked = M.orders.filter((order) => M.selected.has(order.id));
    root.querySelector('[data-role="batch"]').hidden = picked.length === 0;
    root.querySelector('[data-role="batch-count"]').textContent = `${picked.length} commande${picked.length > 1 ? "s" : ""} sélectionnée${picked.length > 1 ? "s" : ""}`;
    root.querySelector('[data-action="batch-next"]').addEventListener("click", () => C.run(picked.map((order) => order.id), "suivant"));
    root.querySelector('[data-action="batch-cancel"]').addEventListener("click", () => {
      M.confirming = { ids: picked.map((order) => order.id), label: `${picked.length} commande${picked.length > 1 ? "s" : ""}` };
      V.refresh('[data-role="confirmation"]');
    });
  };

  V.detail = (root) => {
    const order = M.detail;
    root.querySelector("#order-title").textContent = `Commande ${order.numero}`;
    root.querySelector('[data-role="order-client"]').textContent =
      `Client : ${order.client.nom} · ${formatDate(order.date)} · ${order.client.email}${order.client.telephone ? " · " + order.client.telephone : ""}`;
    const steps = root.querySelector('[data-role="steps"]');
    const reached = ["en cours", "disponible", "retirée"].indexOf(order.statut);
    for (const [index, step] of ["en cours", "disponible", "retirée"].entries()) {
      const item = document.createElement("li");
      item.textContent = (index <= reached ? "✓ " : "") + step[0].toUpperCase() + step.slice(1);
      item.className = index === reached ? "font-semibold text-om-bleu" : "text-om-texte-doux";
      if (index === reached) item.setAttribute("aria-current", "step");
      steps.append(item);
    }
    if (order.statut === "annulée") steps.innerHTML = '<li class="font-semibold text-om-erreur">Commande annulée</li>';
    const lines = root.querySelector('[data-role="lines"]');
    for (const line of order.lignes) {
      const row = document.createElement("tr");
      const options = [line.taille ? `Taille ${line.taille}` : "", line.flocage ? `Flocage ${line.flocage.nom} ${line.flocage.numero}` : ""].filter(Boolean).join(" · ");
      const unit = line.prix + (line.flocage?.prix ?? 0);
      for (const text of [line.nom, options || "—", String(line.quantite), formaterPrix(unit * line.quantite)]) {
        const cell = document.createElement("td");
        cell.className = "px-4 py-4 wrap-anywhere";
        cell.textContent = text;
        row.append(cell);
      }
      lines.append(row);
    }
    root.querySelector('[data-role="order-total"]').textContent = `Total : ${formaterPrix(order.total)}`;
    const next = root.querySelector('[data-action="detail-next"]');
    next.hidden = !SUIVANT[order.statut];
    next.textContent = SUIVANT[order.statut] ? `Marquer « ${SUIVANT[order.statut]} »` : "";
    next.addEventListener("click", () => C.run([order.id], "suivant"));
    const cancel = root.querySelector('[data-action="detail-cancel"]');
    cancel.hidden = !SUIVANT[order.statut];
    cancel.addEventListener("click", () => {
      M.confirming = { ids: [order.id], label: `la commande ${order.numero}` };
      V.refresh('[data-role="confirmation"]');
    });
    root.querySelector('[data-action="back"]').addEventListener("click", C.back);
  };

  V.dom = () => {
    const fragment = htmlToFragment(template);
    const root = fragment.firstElementChild;
    for (const [role, message] of [["success", M.success], ["action-error", M.actionError]]) {
      const element = root.querySelector(`[data-role="${role}"]`);
      element.textContent = message;
      element.hidden = !message;
    }
    const loadError = root.querySelector('[data-role="load-error"]');
    loadError.hidden = !M.loadError;
    loadError.querySelector('[role="alert"]').textContent = M.loadError;
    root.querySelector('[data-action="retry"]').addEventListener("click", async () => {
      await C.load();
      V.refresh(M.loadError ? '[data-role="load-error"] [role="alert"]' : "#orders-title");
    });
    root.querySelector('[data-role="list-view"]').hidden = !M.loaded || M.detail !== null;
    root.querySelector('[data-role="detail-view"]').hidden = M.detail === null;
    if (M.loaded && M.detail === null) V.list(root);
    if (M.detail) V.detail(root);
    const confirmation = root.querySelector('[data-role="confirmation"]');
    confirmation.hidden = !M.confirming;
    root.querySelector("#order-cancel-title").textContent = M.confirming ? `Annuler ${M.confirming.label} ?` : "Confirmer l’annulation";
    root.querySelector('[data-action="confirm-cancel"]').addEventListener("click", () => C.run(M.confirming.ids, "annuler"));
    root.querySelector('[data-action="abort-cancel"]').addEventListener("click", () => { M.confirming = null; V.refresh(); });
    for (const control of root.querySelectorAll("button, input")) control.disabled = M.busy;
    root.setAttribute("aria-busy", String(M.busy));
    V.root = root;
    return fragment;
  };

  V.refresh = (focus) => {
    if (!V.root?.isConnected) return;
    V.root.replaceWith(V.dom());
    if (focus) {
      const target = V.root.querySelector(focus);
      if (target && !target.matches("input, button")) target.tabIndex = -1;
      target?.focus();
    }
  };

  return { load: C.load, dom: V.dom };
}
