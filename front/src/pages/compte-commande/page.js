import { AuthData } from "../../data/auth.js";
import { BADGES, formaterDate, libelleStatut, suivi } from "../../lib/commande.js";
import { formaterPrix } from "../../lib/format.js";
import { genericRenderer, htmlToFragment, redirect } from "../../lib/utils.js";
import { OngletsCompteView } from "../../ui/onglets-compte/index.js";
import template from "./template.html?raw";

/**
 * Page « Détail d'une commande » (SUI-C) : /compte/commandes/:numero, d'après la maquette P2-08.
 * Les prix et les options sont ceux enregistrés à la commande (CMD-A, OPT-A).
 */

const LIGNE = `<li class="flex flex-col gap-1.5 rounded-xl bg-om-fond p-4">
  <div class="flex justify-between gap-4">
    <p class="text-sm font-semibold text-om-texte">{{nom}}</p>
    <p class="shrink-0 text-sm font-semibold text-om-texte">{{prix}}</p>
  </div>
  <p class="text-xs text-om-texte-doux">{{options}}</p>
  <p class="text-xs text-om-texte-doux">Quantité : {{quantite}}</p>
</li>`;

let M = {
  numero: "",
  commande: null, // détail renvoyé par /api/compte/commande
};

let C = {};

C.init = function (params) {
  M.numero = params.numero;
  M.commande = null;
  C.charger();
  return V.init();
};

C.charger = async function () {
  try {
    M.commande = await AuthData.commande(M.numero);
  } catch (erreur) {
    // 401 : pas de session client. 404 : commande inexistante ou d'un autre client.
    redirect(erreur.statut === 404 ? "/compte/commandes" : "/connexion");
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
  fragment.querySelector('[data-role="numero"]').textContent = M.numero;
  fragment.querySelector('slot[name="onglets"]').replaceWith(OngletsCompteView.dom("commandes"));

  let c = M.commande;
  if (c === null) {
    // Chargement en cours : seuls le titre et les onglets sont affichés.
    fragment.querySelector('[data-role="contenu"]').remove();
    return fragment;
  }

  fragment.querySelector('[data-role="date"]').textContent = "Passée le " + formaterDate(c.date);
  fragment.querySelector('[data-role="total"]').textContent = formaterPrix(c.total);
  let statut = fragment.querySelector('[data-role="statut"]');
  statut.textContent = libelleStatut(c.statut);
  statut.classList.add(...(BADGES[c.statut] ?? BADGES["retirée"]).split(" "));

  if (c.statut === "annulée") {
    fragment.querySelector('[data-role="suivi"]').remove();
    fragment.querySelector('[data-role="annulee"]').hidden = false;
  } else {
    fragment.querySelector('[data-role="suivi"]').append(...suivi(c.statut, false));
  }
  if (c.retrait) {
    fragment.querySelector('[data-role="retrait"]').hidden = false;
    fragment.querySelector('[data-role="date-retrait"]').textContent = formaterDate(c.retrait);
  }

  let liste = fragment.querySelector('[data-role="lignes"]');
  for (let l of c.lignes) {
    // Options choisies : taille et flocage (OPT-A). Le prix de la ligne inclut le flocage.
    let options = [l.taille ? "Taille " + l.taille : "Taille unique"];
    if (l.flocage) options.push(`Flocage ${l.flocage.nom} ${l.flocage.numero}`);
    liste.append(
      htmlToFragment(
        genericRenderer(LIGNE, {
          nom: l.nom,
          prix: formaterPrix((l.prix + (l.flocage?.prix ?? 0)) * l.quantite),
          options: options.join(" · "),
          quantite: l.quantite,
        })
      )
    );
  }

  return fragment;
};

export function CompteCommandePage(params) {
  return C.init(params);
}
