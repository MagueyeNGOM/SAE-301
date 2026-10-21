import { AuthData } from "../../data/auth.js";
import { htmlToFragment, redirect } from "../../lib/utils.js";
import { ChampFormulaireView } from "../../ui/champ-formulaire/index.js";
import { MessageView } from "../../ui/message/index.js";
import { OngletsCompteView } from "../../ui/onglets-compte/index.js";
import template from "./template.html?raw";

/**
 * Page « Mon profil » (SUI-B) : /compte/profil, d'après la maquette P2-09.
 * Nom, email et, si besoin, mot de passe (l'actuel est alors exigé).
 * Le serveur reste juge : la validation côté client ne fait que guider.
 */

let M = {
  charge: false, // le profil a-t-il été lu sur le serveur ?
  nom: "",
  email: "",
  message: null, // { type, texte } ou null
};

let C = {};

C.init = function () {
  M.charge = false;
  M.message = null;
  C.charger();
  return V.init();
};

C.charger = async function () {
  try {
    let compte = await AuthData.profil();
    M.nom = compte.nom;
    M.email = compte.email;
  } catch (erreur) {
    // Pas de session client (401) : retour à la connexion.
    redirect("/connexion");
    return;
  }
  M.charge = true;
  V.rafraichir();
};

C.handler_envoi = async function (valeurs) {
  M.nom = valeurs.nom.trim();
  M.email = valeurs.email.trim();

  if (M.nom === "") {
    M.message = { type: "erreur", texte: "Le nom est obligatoire." };
  } else if (!/^\S+@\S+\.\S+$/.test(M.email)) {
    M.message = { type: "erreur", texte: "Saisissez une adresse e-mail valide." };
  } else if (valeurs.nouveau !== "" && valeurs.actuel === "") {
    M.message = { type: "erreur", texte: "Saisissez votre mot de passe actuel pour le modifier." };
  } else if (valeurs.nouveau !== "" && valeurs.nouveau.length < 8) {
    M.message = { type: "erreur", texte: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  } else {
    try {
      let reponse = await AuthData.modifierProfil({ nom: M.nom, email: M.email, actuel: valeurs.actuel, nouveau: valeurs.nouveau });
      M.message = { type: "succes", texte: reponse.mdpModifie ? "Profil et mot de passe enregistrés." : "Votre profil a été enregistré." };
    } catch (erreur) {
      M.message = { type: "erreur", texte: erreur.message };
    }
  }
  V.rafraichir();
};

C.handler_annuler = function () {
  redirect("/compte");
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
  fragment.querySelector('slot[name="onglets"]').replaceWith(OngletsCompteView.dom("profil"));

  let formulaire = fragment.querySelector("form");
  if (!M.charge) {
    // Chargement en cours : seuls le titre et les onglets sont affichés.
    formulaire.remove();
    return fragment;
  }

  let champs = [
    { id: "nom", libelle: "Nom", autocomplete: "family-name", valeur: M.nom },
    { id: "email", libelle: "Adresse e-mail", type: "email", autocomplete: "email", valeur: M.email },
    { id: "actuel", libelle: "Mot de passe actuel (obligatoire pour le modifier)", type: "password", autocomplete: "current-password", placeholder: "••••••••" },
    { id: "nouveau", libelle: "Nouveau mot de passe", type: "password", autocomplete: "new-password", placeholder: "8 caractères minimum" },
  ];
  fragment.querySelector('slot[name="champs"]').replaceWith(...champs.map((c) => ChampFormulaireView.dom(c)));
  fragment.querySelector('slot[name="message"]').replaceWith(MessageView.dom(M.message));

  formulaire.addEventListener("submit", (ev) => {
    ev.preventDefault();
    let valeurs = {};
    for (let champ of champs) {
      valeurs[champ.id] = formulaire.elements[champ.id].value;
    }
    C.handler_envoi(valeurs);
  });
  fragment.querySelector('[data-role="annuler"]').addEventListener("click", C.handler_annuler);

  return fragment;
};

export function CompteProfilPage() {
  return C.init();
}
