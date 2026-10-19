import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { formaterPrix } from "../../lib/format.js";
import { ChampFormulaireView } from "../champ-formulaire/index.js";
import { NOM_FLOCAGE, NUMERO_FLOCAGE } from "../fiche-produit/index.js";
import template from "./template.html?raw";

// Formulaire de modification des options d'une ligne du panier (OPT-A).
// data : { ligne, produit } (produit reçu de l'API, avec ses tailles).
// actions.surEnregistrer({ taille, flocage }) n'est appelée que si les choix
// sont valides ; actions.surAnnuler() ferme le formulaire.
let EditionOptionsView = {
  html: function (data) {
    return genericRenderer(template, {
      nom: data.ligne.nom,
      prixFlocage: formaterPrix(data.produit.prixFlocage ?? 0),
    });
  },

  dom: function (data, actions) {
    let { ligne, produit } = data;
    let fragment = htmlToFragment(EditionOptionsView.html(data));

    fragment.querySelector('slot[name="champ-nom"]').replaceWith(
      ChampFormulaireView.dom({ id: "edition-flocage-nom", libelle: "Nom", placeholder: "NGOM", valeur: ligne.flocage?.nom ?? "" }),
    );
    fragment.querySelector('slot[name="champ-numero"]').replaceWith(
      ChampFormulaireView.dom({ id: "edition-flocage-numero", libelle: "Numéro", placeholder: "10", valeur: ligne.flocage?.numero ?? "" }),
    );
    let champNom = fragment.querySelector("#edition-flocage-nom");
    let champNumero = fragment.querySelector("#edition-flocage-numero");
    champNom.maxLength = 12;
    champNumero.maxLength = 2;
    champNumero.inputMode = "numeric";

    let selectTaille = fragment.querySelector('[data-role="taille"]');
    let caseFlocage = fragment.querySelector('[data-role="flocage-actif"]');
    let champsFlocage = fragment.querySelector('[data-role="champs-flocage"]');
    let erreur = fragment.querySelector('[data-role="erreur"]');

    // Une entrée par taille, la taille épuisée n'est pas sélectionnable.
    if (produit.tailles.length === 0) {
      fragment.querySelector('[data-role="bloc-taille"]').remove();
    }
    produit.tailles.forEach((t) => {
      let option = new Option(t.quantite < 1 ? `${t.libelle} (épuisé)` : t.libelle, t.id);
      option.disabled = t.quantite < 1;
      selectTaille.append(option);
    });
    if (ligne.taille) {
      selectTaille.value = ligne.taille.id;
    }

    // Flocage : seulement pour les produits qui en proposent un.
    if (produit.prixFlocage == null) {
      fragment.querySelector('[data-role="bloc-flocage"]').remove();
    }
    caseFlocage.checked = ligne.flocage !== null;
    champsFlocage.hidden = !caseFlocage.checked;
    caseFlocage.addEventListener("change", () => {
      champsFlocage.hidden = !caseFlocage.checked;
    });

    fragment.querySelector('[data-role="annuler"]').addEventListener("click", () => actions.surAnnuler());

    // Mêmes règles que la fiche produit et que le serveur (OrderController).
    fragment.querySelector('[data-role="formulaire"]').addEventListener("submit", (e) => {
      e.preventDefault();
      let taille = null;
      if (produit.tailles.length > 0) {
        let choisie = produit.tailles.find((t) => String(t.id) === selectTaille.value);
        if (!choisie || choisie.quantite < 1) {
          erreur.textContent = "Choisissez une taille disponible.";
          erreur.hidden = false;
          return;
        }
        taille = { id: choisie.id, libelle: choisie.libelle };
      }
      let flocage = null;
      if (caseFlocage.checked && produit.prixFlocage != null) {
        if (!NOM_FLOCAGE.test(champNom.value.trim())) {
          erreur.textContent = "Le nom du flocage doit contenir de 1 à 12 lettres.";
          erreur.hidden = false;
          return;
        }
        if (!NUMERO_FLOCAGE.test(champNumero.value.trim())) {
          erreur.textContent = "Le numéro du flocage doit être compris entre 0 et 99.";
          erreur.hidden = false;
          return;
        }
        flocage = { nom: champNom.value.trim().toUpperCase(), numero: Number(champNumero.value.trim()) };
      }
      actions.surEnregistrer({ taille, flocage });
    });

    return fragment;
  },
};

export { EditionOptionsView };
