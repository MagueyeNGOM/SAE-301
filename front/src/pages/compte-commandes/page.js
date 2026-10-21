import { AuthData } from "../../data/auth.js";
import { BADGES, barres, formaterDate, libelleStatut, messagesDom, recommander } from "../../lib/commande.js";
import { formaterPrix } from "../../lib/format.js";
import { genericRenderer, htmlToFragment, redirect } from "../../lib/utils.js";
import { OngletsCompteView } from "../../ui/onglets-compte/index.js";
import { PaginationView } from "../../ui/pagination/index.js";
import template from "./template.html?raw";

/**
 * Page « Mes commandes » (SUI-C) : /compte/commandes, d'après la maquette P2-07.
 * Filtres par statut et par période, 6 commandes par page. Le serveur reste juge des droits.
 */

// statut "" = toutes ; période "30" = 30 derniers jours (un filtre de statut et la période se cumulent).
const STATUTS = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "en cours", libelle: "En cours" },
  { valeur: "disponible", libelle: "Disponible" },
  { valeur: "retirée", libelle: "Retirée" },
  { valeur: "annulée", libelle: "Annulée" },
];

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
  <div class="flex flex-wrap gap-2">
    <a href="/compte/commandes/{{numero}}" data-link class="rounded-lg bg-om-fond-doux px-6 py-3 text-[13px] font-semibold text-om-bleu transition-colors hover:bg-white">Détail</a>
    <button type="button" data-role="recommander" class="rounded-lg bg-om-bleu px-6 py-3 text-[13px] font-semibold text-white transition-colors hover:opacity-90">Commander à nouveau</button>
  </div>
</li>`;

let M = {
  statut: "",
  periode: "",
  page: 1,
  donnees: null, // { commandes, page, pages } renvoyé par /api/compte/commandes
  messages: [], // résultat de « Commander à nouveau » : [{ type, texte }]
};

let C = {};

C.init = function () {
  M.statut = "";
  M.periode = "";
  M.page = 1;
  M.donnees = null;
  M.messages = [];
  C.charger();
  return V.init();
};

C.charger = async function () {
  try {
    M.donnees = await AuthData.commandes(M);
  } catch (erreur) {
    // Pas de session client (401) : retour à la connexion.
    redirect("/connexion");
    return;
  }
  V.rafraichir();
};

// Un nouveau filtre ramène à la première page.
C.handler_statut = function (statut) {
  M.statut = statut;
  M.page = 1;
  C.charger();
};

C.handler_periode = function () {
  M.periode = M.periode === "" ? "30" : "";
  M.page = 1;
  C.charger();
};

C.handler_page = function (page) {
  M.page = page;
  C.charger();
};

// SUI-A : le serveur confronte la commande au catalogue actuel, le panier reçoit le résultat.
C.handler_recommander = async function (numero) {
  try {
    M.messages = await recommander(numero);
  } catch (erreur) {
    if (erreur.statut === 401) {
      redirect("/connexion");
      return;
    }
    M.messages = [{ type: "erreur", texte: erreur.message }];
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

V.puce = function (libelle, actif, action) {
  let bouton = document.createElement("button");
  bouton.type = "button";
  bouton.setAttribute("aria-pressed", String(actif));
  bouton.className = "rounded-full px-[18px] py-2.5 text-[13px] font-medium transition-colors " + (actif ? "bg-om-bleu text-white" : "bg-om-fond-doux text-om-texte hover:bg-white");
  bouton.textContent = libelle;
  bouton.addEventListener("click", action);
  return bouton;
};

V.createPageFragment = function () {
  let fragment = htmlToFragment(template);
  fragment.querySelector('slot[name="onglets"]').replaceWith(OngletsCompteView.dom("commandes"));

  if (M.donnees === null) {
    // Chargement en cours : seuls le titre et les onglets sont affichés.
    fragment.querySelector('[data-role="filtres"]').remove();
    fragment.querySelector('slot[name="message"]').remove();
    fragment.querySelector('[data-role="commandes"]').remove();
    fragment.querySelector('slot[name="pagination"]').remove();
    return fragment;
  }

  fragment.querySelector('[data-role="filtres"]').append(
    ...STATUTS.map((s) => V.puce(s.libelle, M.statut === s.valeur, () => C.handler_statut(s.valeur))),
    V.puce("30 derniers jours", M.periode === "30", C.handler_periode)
  );

  fragment.querySelector('slot[name="message"]').replaceWith(messagesDom(M.messages));
  fragment.querySelector('[data-role="aucune"]').hidden = M.donnees.commandes.length > 0;
  let liste = fragment.querySelector('[data-role="commandes"]');
  for (let c of M.donnees.commandes) {
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
    ligne.querySelector('[data-role="recommander"]').addEventListener("click", () => C.handler_recommander(c.numero));
    liste.append(ligne);
  }

  let pagination = fragment.querySelector('slot[name="pagination"]');
  if (M.donnees.pages > 1) {
    pagination.replaceWith(PaginationView.dom({ page: M.donnees.page, pagesTotal: M.donnees.pages }, { surPage: C.handler_page }));
  } else {
    pagination.remove();
  }

  return fragment;
};

export function CompteCommandesPage() {
  return C.init();
}
