import { AuthData } from "../../data/auth.js";
import { formaterPrix } from "../../lib/format.js";
import { genericRenderer, htmlToFragment, redirect } from "../../lib/utils.js";
import { BADGES, barres, formaterDate, libelleStatut, suivi } from "../../lib/commande.js";
import { OngletsCompteView } from "../../ui/onglets-compte/index.js";
import template from "./template.html?raw";

/**
 * Page « Espace personnel » (SUI-B) : /compte, d'après la maquette P2-06.
 * Réservée aux clients connectés ; le serveur reste juge des droits.
 */

const LIGNE_COMMANDE = `<li class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl bg-om-fond p-[18px]">
  <div class="flex flex-col gap-1">
    <p class="text-[15px] font-semibold text-om-texte">{{numero}}</p>
    <p class="text-xs text-om-texte-doux">{{date}}</p>
  </div>
  <div class="flex flex-col gap-1.5">
    <div data-role="barres" class="flex gap-1"></div>
    <span class="w-fit rounded-md px-2 py-1 text-[10px] font-semibold {{badge}}">{{statut}}</span>
  </div>
  <p class="text-[15px] font-semibold text-om-texte">{{total}}</p>
  <a href="/compte/commandes/{{numero}}" data-link class="rounded-lg bg-om-fond-doux px-6 py-3 text-[13px] font-semibold text-om-bleu transition-colors hover:bg-white">Détail</a>
</li>`;

let M = {
  compte: null, // { nom, email, depuis, commandes } renvoyé par /api/compte
};

let C = {};

C.init = function () {
  M.compte = null;
  C.charger();
  return V.init();
};

C.charger = async function () {
  try {
    M.compte = await AuthData.profil();
  } catch (erreur) {
    // Pas de session client (401) : retour à la connexion.
    redirect("/connexion");
    return;
  }
  V.rafraichir();
};

let V = {};

V.racine = null;

V.init = function () {
  let fragment = V.createPageFragment();
  V.racine = fragment.firstElementChild;
  return fragment;
};

V.rafraichir = function () {
  let fragment = V.createPageFragment();
  let nouvelleRacine = fragment.firstElementChild;
  V.racine.replaceWith(fragment);
  V.racine = nouvelleRacine;
};

V.createPageFragment = function () {
  let fragment = htmlToFragment(template);
  fragment.querySelector('[data-role="nom"]').textContent = M.compte?.nom ?? "";
  fragment.querySelector('slot[name="onglets"]').replaceWith(OngletsCompteView.dom("apercu"));

  if (M.compte === null) {
    // Chargement en cours : seuls le titre et les onglets sont affichés.
    fragment.querySelector('[data-role="contenu"]').remove();
    return fragment;
  }

  fragment.querySelector('[data-role="info-nom"]').textContent = M.compte.nom;
  fragment.querySelector('[data-role="info-email"]').textContent = M.compte.email;

  // La commande en cours : la plus récente qui n'est ni retirée ni annulée.
  let enCours = M.compte.commandes.find((c) => c.statut === "en cours" || c.statut === "disponible");
  let blocEnCours = fragment.querySelector('[data-role="en-cours"]');
  if (enCours) {
    fragment.querySelector('[data-role="numero"]').textContent = enCours.numero;
    fragment.querySelector('[data-role="suivi"]').append(...suivi(enCours.statut, true));
  } else {
    blocEnCours.remove();
  }

  fragment.querySelector('[data-role="aucune"]').hidden = M.compte.commandes.length > 0;
  let liste = fragment.querySelector('[data-role="commandes"]');
  for (let c of M.compte.commandes) {
    let ligne = htmlToFragment(
      genericRenderer(LIGNE_COMMANDE, {
        numero: c.numero,
        date: formaterDate(c.date_commande),
        statut: libelleStatut(c.statut),
        badge: BADGES[c.statut] ?? BADGES["retirée"],
        total: formaterPrix(Number(c.total)),
      })
    );
    ligne.querySelector('[data-role="barres"]').append(...barres(c.statut));
    liste.append(ligne);
  }

  return fragment;
};

export function ComptePage() {
  return C.init();
}
