import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { ChampFormulaireView } from "../champ-formulaire/index.js";
import template from "./template.html?raw";

export const FormulaireConnexionView = {
  dom(data, actions) {
    const fragment = htmlToFragment(genericRenderer(template, {
      button: data.busy ? "Connexion en cours…" : "Se connecter",
    }));
    fragment.querySelector('slot[name="fields"]').replaceWith(
      ChampFormulaireView.dom({ id: "email", libelle: "Identifiant administrateur", type: "email", autocomplete: "username", placeholder: "admin@exemple.fr", valeur: data.login }),
      ChampFormulaireView.dom({ id: "mdp", libelle: "Mot de passe", type: "password", autocomplete: "current-password" }),
    );
    const form = fragment.querySelector("form");
    form.setAttribute("aria-busy", String(data.busy));
    for (const input of form.querySelectorAll("input")) {
      input.required = true;
      input.disabled = data.busy;
      input.classList.remove("text-om-texte-doux");
      input.classList.add("text-om-texte", "leading-tight");
    }
    for (const label of form.querySelectorAll("label")) label.classList.add("leading-snug");
    form.elements.email.maxLength = 190;
    form.querySelector("button").disabled = data.busy;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      actions.surConnexion(form.elements.email.value, form.elements.mdp.value);
    });
    return fragment;
  },
};
