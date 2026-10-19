import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { ChampFormulaireView } from "../champ-formulaire/index.js";
import template from "./template.html?raw";

// Formulaire de connexion ou d'inscription (CMD-C), d'après la maquette Figma :
// onglets « Se connecter » / « Créer un compte », champs, bandeau d'erreur et
// bouton. Il ne décide de rien : il signale l'envoi par actions.surEnvoi(valeurs),
// où valeurs associe l'id de chaque champ à sa saisie.
//
// data : { onglet: "connexion" | "inscription", titre, bouton, message: "" ou
//          le texte de l'erreur, champs: [données de ChampFormulaireView] }
let FormulaireAuthView = {
  html: function (data) {
    return genericRenderer(template, {
      titre: data.titre,
      bouton: data.bouton,
      message: data.message,
    });
  },

  /**
   * @param {{surEnvoi: (valeurs: Object<string, string>) => void}} actions
   */
  dom: function (data, actions) {
    let fragment = htmlToFragment(FormulaireAuthView.html(data));
    let formulaire = fragment.querySelector("form");

    fragment.querySelector(`[data-role="onglet-${data.onglet}"]`).setAttribute("aria-current", "page");
    fragment.querySelector('slot[name="champs"]').replaceWith(...data.champs.map((champ) => ChampFormulaireView.dom(champ)));

    if (data.message === "") {
      fragment.querySelector('[data-role="message"]').remove();
    }

    formulaire.addEventListener("submit", (ev) => {
      // Sans cela, le navigateur enverrait le formulaire de manière classique,
      // en rechargeant la page.
      ev.preventDefault();
      let valeurs = {};
      for (let champ of data.champs) {
        valeurs[champ.id] = formulaire.elements[champ.id].value;
      }
      actions.surEnvoi(valeurs);
    });

    return fragment;
  },
};

export { FormulaireAuthView };
