import { AuthData } from "../../data/auth.js";
import { htmlToFragment, redirect } from "../../lib/utils.js";
import { FormulaireAuthView } from "../../ui/formulaire-auth/index.js";
import template from "./template.html?raw";

/**
 * Page « Inscription » (CMD-C) : /inscription.
 * Le serveur reste juge : la validation côté client ne fait que guider.
 */

let M = {
  valeurs: { nom: "", email: "" }, // saisies conservées (jamais le mot de passe)
  message: "", // texte du bandeau d'erreur, "" si aucune erreur
};

let C = {};

C.handler_envoi = async function (valeurs) {
  M.valeurs = { nom: valeurs.nom.trim(), email: valeurs.email.trim() };
  M.message = "";

  if (M.valeurs.nom === "") {
    M.message = "Saisissez votre nom.";
  } else if (!/^\S+@\S+\.\S+$/.test(M.valeurs.email)) {
    M.message = "Saisissez une adresse e-mail valide.";
  } else if (valeurs.mdp.length < 8) {
    M.message = "Le mot de passe doit contenir au moins 8 caractères.";
  } else if (valeurs.mdp !== valeurs.confirmation) {
    M.message = "Les mots de passe ne correspondent pas.";
  } else {
    try {
      await AuthData.register(M.valeurs.nom, M.valeurs.email, valeurs.mdp);
      redirect("/");
      return;
    } catch (erreur) {
      M.message = erreur.message;
    }
  }

  V.rafraichir();
};

C.init = function () {
  M.valeurs = { nom: "", email: "" };
  M.message = "";
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

  pageFragment.querySelector('slot[name="formulaire"]').replaceWith(
    FormulaireAuthView.dom(
      {
        onglet: "inscription",
        titre: "Créer un compte",
        bouton: "Créer mon compte",
        message: M.message,
        champs: [
          { id: "nom", libelle: "Nom", autocomplete: "family-name", valeur: M.valeurs.nom },
          { id: "email", libelle: "Adresse e-mail", type: "email", autocomplete: "email", placeholder: "nom@exemple.fr", valeur: M.valeurs.email },
          { id: "mdp", libelle: "Mot de passe", type: "password", autocomplete: "new-password", placeholder: "8 caractères minimum" },
          { id: "confirmation", libelle: "Confirmer le mot de passe", type: "password", autocomplete: "new-password" },
        ],
      },
      { surEnvoi: C.handler_envoi }
    )
  );

  return pageFragment;
};

export function InscriptionPage() {
  return C.init();
}
