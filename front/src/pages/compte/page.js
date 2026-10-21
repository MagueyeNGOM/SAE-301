import { AuthData } from "../../data/auth.js";
import { formaterPrix } from "../../lib/format.js";
import { genericRenderer, htmlToFragment, redirect } from "../../lib/utils.js";
import { OngletsCompteView } from "../../ui/onglets-compte/index.js";
import template from "./template.html?raw";

/**
 * Page « Espace personnel » (SUI-B) : /compte, d'après la maquette P2-06.
 * Réservée aux clients connectés ; le serveur reste juge des droits.
 */

// Avancement d'une commande : nombre d'étapes franchies sur 3.
const AVANCEMENT = { "en cours": 1, disponible: 2, "retirée": 3, "annulée": 0 };
// Classes écrites en entier : Tailwind ne génère que celles qu'il trouve telles quelles.
const BADGES = {
  "en cours": "bg-om-bleu-clair/15 text-om-info",
  disponible: "bg-om-succes-fond text-om-succes",
  "retirée": "bg-om-fond-doux text-om-texte-doux",
  "annulée": "bg-om-erreur-fond text-om-erreur",
};
const ETAPES = ["En cours", "Disponible", "Retirée"];

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

V.date = function (valeur) {
  return new Date(valeur.replace(" ", "T")).toLocaleDateString("fr-FR");
};

V.barre = function (rempli) {
  let barre = document.createElement("span");
  barre.className = "h-1.5 w-[46px] rounded-[3px] " + (rempli ? "bg-om-bleu" : "bg-om-fond-doux");
  return barre;
};

// Suivi à 3 étapes de la commande en cours (maquette : cercle, trait, cercle…).
V.suivi = function (statut) {
  let franchies = AVANCEMENT[statut];
  return ETAPES.flatMap((libelle, i) => {
    let etape = document.createElement("li");
    etape.className = "flex flex-col items-center gap-2 text-xs";
    let cercle = document.createElement("span");
    cercle.className = "flex size-[26px] items-center justify-center rounded-full text-xs font-semibold " + (i < franchies ? "bg-om-bleu text-om-texte-discret" : "bg-om-fond-doux");
    cercle.textContent = i < franchies ? "✓" : "";
    let texte = document.createElement("span");
    texte.className = "text-om-texte-discret " + (i < franchies ? "font-semibold" : "");
    texte.textContent = libelle;
    etape.append(cercle, texte);
    if (i === ETAPES.length - 1) return [etape];
    let trait = document.createElement("li");
    trait.setAttribute("aria-hidden", "true");
    trait.className = "mt-[11px] h-[3px] w-10 shrink-0 md:w-[70px] " + (i + 1 < franchies ? "bg-om-bleu" : "bg-om-fond-doux");
    return [etape, trait];
  });
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
    fragment.querySelector('[data-role="suivi"]').append(...V.suivi(enCours.statut));
  } else {
    blocEnCours.remove();
  }

  fragment.querySelector('[data-role="aucune"]').hidden = M.compte.commandes.length > 0;
  let liste = fragment.querySelector('[data-role="commandes"]');
  for (let c of M.compte.commandes) {
    let ligne = htmlToFragment(
      genericRenderer(LIGNE_COMMANDE, {
        numero: c.numero,
        date: V.date(c.date_commande),
        statut: c.statut.charAt(0).toUpperCase() + c.statut.slice(1),
        badge: BADGES[c.statut] ?? BADGES["retirée"],
        total: formaterPrix(Number(c.total)),
      })
    );
    ligne.querySelector('[data-role="barres"]').append(...[0, 1, 2].map((i) => V.barre(i < AVANCEMENT[c.statut])));
    liste.append(ligne);
  }

  return fragment;
};

export function ComptePage() {
  return C.init();
}
