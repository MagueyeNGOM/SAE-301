import { AuthData } from "../../data/auth.js";
import { CartData } from "../../data/cart.js";
import { htmlToFragment, redirect } from "../../lib/utils.js";
import { EtapesTunnelView } from "../../ui/etapes-tunnel/index.js";
import { FormulaireAuthView } from "../../ui/formulaire-auth/index.js";
import template from "./template.html?raw";

/**
 * Page « Connexion » (CMD-C) : /connexion.
 * Le serveur reste juge : la validation côté client ne fait que guider.
 */

let M = {
  email: "", // dernier email saisi, pour pré-remplir le formulaire
  message: "", // texte du bandeau d'erreur, "" si aucune erreur
};

let C = {};

C.handler_envoi = async function (valeurs) {
  M.email = valeurs.email.trim();
  M.message = "";

  if (!/^\S+@\S+\.\S+$/.test(M.email)) {
    M.message = "Saisissez une adresse e-mail valide.";
  } else if (valeurs.mdp === "") {
    M.message = "Saisissez votre mot de passe.";
  } else {
    try {
      await AuthData.login(M.email, valeurs.mdp);
      // Un panier plein : le client vient finaliser sa commande (CMD-A).
      redirect(CartData.compter() > 0 ? "/recapitulatif" : "/");
      return;
    } catch (erreur) {
      M.message = erreur.message;
    }
  }

  V.rafraichir();
};

C.init = function () {
  M.email = "";
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

  pageFragment.querySelector('slot[name="etapes"]').replaceWith(EtapesTunnelView.dom({ etape: 2 }));
  pageFragment.querySelector('slot[name="formulaire"]').replaceWith(
    FormulaireAuthView.dom(
      {
        onglet: "connexion",
        titre: "Connexion",
        bouton: "Se connecter",
        message: M.message,
        champs: [
          { id: "email", libelle: "Adresse e-mail", type: "email", autocomplete: "email", placeholder: "nom@exemple.fr", valeur: M.email },
          { id: "mdp", libelle: "Mot de passe", type: "password", autocomplete: "current-password" },
        ],
      },
      { surEnvoi: C.handler_envoi }
    )
  );

  return pageFragment;
};

export function ConnexionPage() {
  return C.init();
}
