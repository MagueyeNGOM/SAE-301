import { StatsData } from "../../../data/stats.js";
import { htmlToFragment } from "../../../lib/utils.js";
import { formaterPrix } from "../../../lib/format.js";
import template from "./template.html?raw";

// Montants arrondis à l'euro : les étiquettes des barres restent lisibles sur mobile.
const shortPrice = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const formatDay = (jour) => new Date(jour + "T00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
const remaining = (n) => (n === 0 ? "Épuisé" : `${n} restant${n > 1 ? "s" : ""}`);

// Une cellule CSV : guillemets doublés, et pas de formule interprétée par le tableur.
const csvCell = (value) => {
  const text = String(value);
  return '"' + (/^[=+\-@]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
};

export function StatsSection(onUnauthorized) {
  const M = { stats: null, loadError: "" };
  const V = { root: null };
  const C = {};

  C.load = async () => {
    try {
      M.stats = await StatsData.fetch();
      M.loadError = "";
    } catch (error) {
      if (error.statut === 401 || error.statut === 403) onUnauthorized(error);
      M.loadError = error.message;
    }
  };

  // Le fichier reprend les chiffres affichés, chargés à l'ouverture de la page.
  C.export = () => {
    const s = M.stats;
    const rows = [
      ["Statistiques Boutique OM", new Date().toLocaleString("fr-FR")],
      [],
      ["Commandes", "Nombre"],
      ["Total", s.orders],
      ...Object.entries(s.compteurs),
      [],
      ["Jour", "Revenus (€, hors annulées)"],
      ...s.revenus.map((r) => [r.jour, r.revenu.toFixed(2).replace(".", ",")]),
      [],
      ["Produit le plus vendu", "Ventes"],
      ...s.plusVendus.map((p) => [p.nom, p.ventes]),
      [],
      ["Produit", "Stock total"],
      ...s.stocks.map((p) => [p.nom, p.quantite]),
      [],
      ["Alerte stock faible", "Taille", "Quantité"],
      ...s.alertes.map((a) => [a.nom, a.taille, a.quantite]),
    ];
    // BOM UTF-8 et « ; » : le fichier s'ouvre directement dans Excel en français.
    const csv = "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `statistiques-om-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Barres verticales : la valeur est écrite au-dessus, la barre seule est décorative.
  V.bars = (list, items, barClass) => {
    const max = Math.max(0, ...items.map((item) => item.value));
    for (const item of items) {
      const li = document.createElement("li");
      li.className = "flex h-full min-w-0 flex-1 flex-col items-center gap-1 text-center";
      const area = document.createElement("span");
      area.className = "flex min-h-0 w-full flex-1 flex-col items-center justify-end gap-1";
      const value = document.createElement("span");
      value.className = "text-[10px] font-semibold";
      value.textContent = item.text;
      const bar = document.createElement("span");
      bar.setAttribute("aria-hidden", "true");
      bar.className = "w-full max-w-10 rounded-t " + barClass;
      // 85 % au plus : la valeur garde sa place au-dessus de la plus haute barre.
      bar.style.height = max ? `${Math.max((item.value / max) * 85, item.value > 0 ? 2 : 0)}%` : "0";
      area.append(value, bar);
      const label = document.createElement("span");
      label.className = "line-clamp-2 w-full max-w-24 text-[10px] leading-tight text-om-texte-doux";
      label.textContent = item.label;
      label.title = item.label;
      li.append(area, label);
      list.append(li);
    }
  };

  V.content = (root) => {
    const s = M.stats;
    const c = s.compteurs;
    root.querySelector('[data-role="orders"]').textContent = s.orders;
    root.querySelector('[data-role="pending"]').textContent = `${c["en cours"]} / ${c.disponible}`;
    root.querySelector('[data-role="closed"]').textContent = `${c["retirée"]} / ${c["annulée"]}`;

    const total = s.revenus.reduce((sum, r) => sum + r.revenu, 0);
    root.querySelector('[data-role="revenue-total"]').textContent = `Total : ${formaterPrix(total)} (hors commandes annulées)`;
    V.bars(root.querySelector('[data-role="revenue"]'),
      s.revenus.map((r) => ({ value: r.revenu, text: shortPrice.format(r.revenu), label: formatDay(r.jour) })), "bg-om-bleu");
    V.bars(root.querySelector('[data-role="stocks"]'),
      s.stocks.map((p) => ({ value: p.quantite, text: String(p.quantite), label: p.nom })), "bg-om-bleu-clair");

    const best = root.querySelector('[data-role="best"]');
    for (const [index, product] of s.plusVendus.entries()) {
      const li = document.createElement("li");
      li.className = "flex justify-between gap-4";
      const name = document.createElement("span");
      name.className = "min-w-0 wrap-anywhere";
      name.textContent = `${index + 1} · ${product.nom}`;
      const sales = document.createElement("span");
      sales.className = "shrink-0 font-semibold text-om-bleu";
      sales.textContent = `${product.ventes} vente${product.ventes > 1 ? "s" : ""}`;
      li.append(name, sales);
      best.append(li);
    }
    root.querySelector('[data-role="best-empty"]').hidden = s.plusVendus.length !== 0;

    const alerts = root.querySelector('[data-role="alerts"]');
    for (const alert of s.alertes) {
      const li = document.createElement("li");
      li.className = "flex items-center justify-between gap-4";
      const name = document.createElement("span");
      name.className = "min-w-0 wrap-anywhere";
      name.textContent = `${alert.nom} · ${alert.taille}`;
      const badge = document.createElement("span");
      badge.className = "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold "
        + (alert.quantite === 0 ? "bg-om-erreur-fond text-om-erreur" : "bg-om-attention-fond text-om-attention");
      badge.textContent = remaining(alert.quantite);
      li.append(name, badge);
      alerts.append(li);
    }
    root.querySelector('[data-role="alerts-empty"]').hidden = s.alertes.length !== 0;
  };

  V.dom = () => {
    const fragment = htmlToFragment(template);
    const root = fragment.firstElementChild;
    const loadError = root.querySelector('[data-role="load-error"]');
    loadError.hidden = !M.loadError;
    loadError.querySelector('[role="alert"]').textContent = M.loadError;
    root.querySelector('[data-action="retry"]').addEventListener("click", async () => {
      await C.load();
      V.refresh(M.loadError ? '[data-role="load-error"] [role="alert"]' : "#stats-title");
    });
    root.querySelector('[data-role="content"]').hidden = M.stats === null;
    const exportButton = root.querySelector('[data-action="export"]');
    exportButton.disabled = M.stats === null;
    exportButton.addEventListener("click", C.export);
    if (M.stats) V.content(root);
    V.root = root;
    return fragment;
  };

  V.refresh = (focus) => {
    if (!V.root?.isConnected) return;
    V.root.replaceWith(V.dom());
    if (focus) V.root.querySelector(focus)?.focus();
  };

  return { load: C.load, dom: V.dom };
}
