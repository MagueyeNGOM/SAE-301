import { CartData } from "../../data/cart.js";
import { formaterPrix } from "../../lib/format.js";
import { htmlToFragment } from "../../lib/utils.js";
import { EtapesTunnelView } from "../../ui/etapes-tunnel/index.js";
import { LignePanierView } from "../../ui/ligne-panier/index.js";
import { MessageView } from "../../ui/message/index.js";
import { RecapitulatifCommandeView } from "../../ui/recapitulatif-commande/index.js";
import template from "./template.html?raw";

/**
 * Page « Panier » (CMD-B) : /panier, étape 1 du tunnel de commande (CMD-A).
 * Le panier est lu dans le navigateur.
 */

let M = {
  lignes: [], // lignes du panier : { slug, nom, prix, image, quantite }
  message: null, // { type, texte }, ou null
};

let C = {};

C.handler_quantite = function (slug, quantite) {
  // Champ vidé ou quantité invalide : on garde la ligne, la page se reconstruit.
  if (quantite >= 1) {
    CartData.changerQuantite(slug, quantite);
  }
  C.recharger();
};

C.handler_supprimer = function (slug) {
  CartData.supprimer(slug);
  C.recharger();
};

C.recharger = function () {
  M.lignes = CartData.lire();
  V.rafraichir();
};

C.init = function () {
  M.lignes = CartData.lire();
  M.message = null;
  return V.init();
};

let V = {};

V.racine = null; // élément racine de la page affichée

V.init = function () {
  let fragment = V.createPageFragment();
  V.racine = fragment.firstElementChild;
  return fragment;
};

// Toute la page se reconstruit à partir du modèle, comme les autres pages.
V.rafraichir = function () {
  let fragment = V.createPageFragment();
  let nouvelleRacine = fragment.firstElementChild;
  V.racine.replaceWith(fragment);
  V.racine = nouvelleRacine;
};

V.createPageFragment = function () {
  let pageFragment = htmlToFragment(template);

  pageFragment.querySelector('slot[name="etapes"]').replaceWith(EtapesTunnelView.dom({ etape: 1 }));
  pageFragment.querySelector('slot[name="message"]').replaceWith(MessageView.dom(M.message));

  let slotVide = pageFragment.querySelector('slot[name="vide"]');
  let slotLignes = pageFragment.querySelector('slot[name="lignes"]');
  let slotRecap = pageFragment.querySelector('slot[name="recapitulatif"]');

  if (M.lignes.length === 0) {
    slotVide.replaceWith(htmlToFragment('<p class="text-sm text-om-texte-doux">Votre panier est vide.</p>'));
    slotLignes.remove();
    slotRecap.remove();
    pageFragment.querySelector('[data-role="note"]').remove();
    return pageFragment;
  }

  slotVide.remove();

  // Comme la maquette : on compte les articles (lignes), pas les quantités.
  let articles = M.lignes.length;
  pageFragment.querySelector('[data-role="titre"]').textContent = `Mon panier · ${articles} ${articles > 1 ? "articles" : "article"}`;

  let actions = { surQuantite: C.handler_quantite, surSupprimer: C.handler_supprimer };
  let liste = htmlToFragment('<ul class="flex flex-col gap-3 md:gap-3.5"></ul>');
  liste.firstElementChild.append(...M.lignes.map((ligne) => LignePanierView.dom(ligne, actions)));
  slotLignes.replaceWith(liste);

  let total = formaterPrix(M.lignes.reduce((somme, l) => somme + l.prix * l.quantite, 0));
  let recapitulatif = RecapitulatifCommandeView.dom({ sousTotal: total, total });
  // La suite du tunnel : le récapitulatif vérifie la connexion (étapes 2 et 3).
  recapitulatif
    .querySelector('slot[name="action"]')
    .replaceWith(htmlToFragment('<a href="/recapitulatif" data-link class="rounded-lg bg-om-bleu px-6 py-3 text-center text-[13px] font-semibold text-white transition-colors hover:bg-om-bleu-fonce">Continuer</a>'));
  slotRecap.replaceWith(recapitulatif);

  return pageFragment;
};

export function PanierPage() {
  return C.init();
}
