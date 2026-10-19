import { OrderData } from "../../data/order.js";
import { formaterPrix } from "../../lib/format.js";
import { htmlToFragment, redirect } from "../../lib/utils.js";
import { EtapesTunnelView } from "../../ui/etapes-tunnel/index.js";
import template from "./template.html?raw";

/**
 * Page « Confirmation » (CMD-A) : /confirmation, étape 4 du tunnel.
 * Elle n'a de sens qu'après une commande validée : sans commande en mémoire
 * (adresse saisie à la main, page rechargée), on renvoie à la boutique.
 */

let M = {
  commande: null, // { numero, total, articles }, renvoyée par le serveur
};

let C = {};

C.init = function () {
  M.commande = OrderData.derniere();

  if (M.commande === null) {
    redirect("/");
    return "";
  }

  return V.init();
};

let V = {};

V.init = function () {
  let pageFragment = htmlToFragment(template);

  pageFragment.querySelector('slot[name="etapes"]').replaceWith(EtapesTunnelView.dom({ etape: 4 }));
  pageFragment.querySelector('[data-role="numero"]').textContent = M.commande.numero;

  let articles = M.commande.articles;
  pageFragment.querySelector('[data-role="resume"]').textContent =
    `${articles} ${articles > 1 ? "articles" : "article"} · Total ${formaterPrix(M.commande.total)} · Vous serez prévenu quand elle sera disponible.`;

  return pageFragment;
};

export function ConfirmationPage() {
  return C.init();
}
