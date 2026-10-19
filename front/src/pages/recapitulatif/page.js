import { AuthData } from "../../data/auth.js";
import { CartData } from "../../data/cart.js";
import { OrderData } from "../../data/order.js";
import { formaterPrix } from "../../lib/format.js";
import { genericRenderer, htmlToFragment, redirect } from "../../lib/utils.js";
import { EtapesTunnelView } from "../../ui/etapes-tunnel/index.js";
import { LigneRecapitulatifView } from "../../ui/ligne-recapitulatif/index.js";
import { RecapitulatifCommandeView } from "../../ui/recapitulatif-commande/index.js";
import template from "./template.html?raw";

/**
 * Page « Récapitulatif » (CMD-A) : /recapitulatif, étape 3 du tunnel.
 * Réservée aux clients connectés : le serveur reste juge (401 à l'envoi), la
 * page ne fait que renvoyer vers la connexion ou le panier.
 */

let M = {
  lignes: [], // lignes du panier : { slug, nom, prix, image, quantite, taille, flocage, prixFlocage }
  message: "", // texte du bandeau d'erreur, "" si aucune erreur
  envoi: false, // true pendant l'enregistrement : évite un double clic
};

let C = {};

C.handler_confirmer = async function () {
  M.message = "";
  M.envoi = true;
  V.rafraichir();

  try {
    await OrderData.valider(M.lignes);
    // La commande est enregistrée : le panier est vidé, puis la confirmation.
    CartData.enregistrer([]);
    redirect("/confirmation");
    return;
  } catch (erreur) {
    if (erreur.statut === 401) {
      // Session expirée : on repasse par la connexion.
      redirect("/connexion");
      return;
    }
    M.message = erreur.message;
  }

  M.envoi = false;
  V.rafraichir();
};

C.init = async function () {
  M.lignes = CartData.lire();
  M.message = "";
  M.envoi = false;

  let moi = { connecte: false };
  try {
    moi = await AuthData.me();
  } catch {
    // API injoignable : on traite le visiteur comme non connecté.
  }

  // Pas connecté : connexion (étape 2). Panier vide : rien à valider.
  if (!moi.connecte) {
    redirect("/connexion");
    return "";
  }
  if (M.lignes.length === 0) {
    redirect("/panier");
    return "";
  }

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
  let pageFragment = htmlToFragment(genericRenderer(template, { message: M.message }));

  pageFragment.querySelector('slot[name="etapes"]').replaceWith(EtapesTunnelView.dom({ etape: 3 }));
  pageFragment.querySelector('[data-role="lignes"]').append(...M.lignes.map((ligne) => LigneRecapitulatifView.dom(ligne)));

  let total = formaterPrix(M.lignes.reduce((somme, l) => somme + CartData.prixUnitaire(l) * l.quantite, 0));
  let recapitulatif = RecapitulatifCommandeView.dom({ sousTotal: total, total });
  recapitulatif.querySelector('slot[name="action"]').remove();
  pageFragment.querySelector('slot[name="recapitulatif"]').replaceWith(recapitulatif);

  if (M.message === "") {
    pageFragment.querySelector('[data-role="message"]').remove();
  }

  let bouton = pageFragment.querySelector('[data-role="confirmer"]');
  bouton.disabled = M.envoi;
  bouton.addEventListener("click", C.handler_confirmer);

  return pageFragment;
};

export function RecapitulatifPage() {
  return C.init();
}
