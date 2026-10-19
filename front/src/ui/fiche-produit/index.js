import { CartData } from "../../data/cart.js";
import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { formaterPrix } from "../../lib/format.js";
import { ChampFormulaireView } from "../champ-formulaire/index.js";
import template from "./template.html?raw";
import tuileTemplate from "./tuile-taille.html?raw";

// Mêmes règles que le serveur (OrderController) : nom de 1 à 12 lettres, numéro de 0 à 99.
const NOM_FLOCAGE = /^[\p{L} '-]{1,12}$/u;
const NUMERO_FLOCAGE = /^\d{1,2}$/;

// Fiche détaillée d'un produit (DEC-C) avec le choix de la taille et du
// flocage (OPT-C). actions.surAjouter(produit, { taille, flocage }) est appelée
// seulement quand les choix sont valides.
let FicheProduitView = {
  html: function (produit) {
    return genericRenderer(template, {
      nom: produit.nom,
      categorie: produit.categorie,
      prix: formaterPrix(produit.prix),
      prixFlocage: formaterPrix(produit.prixFlocage ?? 0),
      description: produit.description,
      details: produit.details ?? "",
      image: import.meta.env.BASE_URL + "images/produits/" + (produit.images[0] ?? produit.image),
    });
  },

  dom: function (produit, actions) {
    let fragment = htmlToFragment(FicheProduitView.html(produit));
    let principale = fragment.querySelector('[data-role="principale"]');
    let vignettes = fragment.querySelector('[data-role="vignettes"]');

    // Une seule image : pas de vignettes à afficher.
    if (produit.images.length > 1) {
      produit.images.forEach((fichier, i) => {
        let url = import.meta.env.BASE_URL + "images/produits/" + fichier;
        let li = document.createElement("li");
        li.innerHTML = `<button type="button" class="block overflow-hidden rounded-md border-2 border-transparent aria-[current=true]:border-om-bleu"><img class="size-16 bg-white object-contain" width="64" height="64" alt=""></button>`;
        let bouton = li.querySelector("button");
        li.querySelector("img").src = url;
        bouton.setAttribute("aria-label", `Image ${i + 1} sur ${produit.images.length}`);
        bouton.setAttribute("aria-current", String(i === 0));
        bouton.addEventListener("click", () => {
          principale.src = url;
          vignettes.querySelectorAll("button").forEach((b) => b.setAttribute("aria-current", String(b === bouton)));
        });
        vignettes.append(li);
      });
    }

    // État du choix : la taille retenue (ou null) et le flocage activé ou non.
    let taille = null;
    let flocageActif = false;

    let blocTailles = fragment.querySelector('[data-role="bloc-tailles"]');
    let blocFlocage = fragment.querySelector('[data-role="flocage"]');
    let champsFlocage = fragment.querySelector('[data-role="champs-flocage"]');
    let interrupteur = fragment.querySelector('[data-role="interrupteur"]');
    let erreur = fragment.querySelector('[data-role="erreur"]');
    let options = fragment.querySelector('[data-role="options"]');
    let prixTotal = fragment.querySelector('[data-role="prix-total"]');
    let apercu = fragment.querySelector('[data-role="apercu"]');

    fragment.querySelector('slot[name="champ-nom"]').replaceWith(ChampFormulaireView.dom({ id: "flocage-nom", libelle: "Nom", placeholder: "NGOM" }));
    fragment.querySelector('slot[name="champ-numero"]').replaceWith(ChampFormulaireView.dom({ id: "flocage-numero", libelle: "Numéro", placeholder: "10" }));
    let champNom = fragment.querySelector("#flocage-nom");
    let champNumero = fragment.querySelector("#flocage-numero");
    champNom.maxLength = 12;
    champNumero.maxLength = 2;
    champNumero.inputMode = "numeric";

    // Le flocage choisi, ou null si l'interrupteur est éteint ou les champs vides.
    let flocage = function () {
      let nom = champNom.value.trim().toUpperCase();
      let numero = champNumero.value.trim();
      return flocageActif && nom !== "" && numero !== "" ? { nom, numero: Number(numero) } : null;
    };

    // Tout ce qui dépend du choix : récapitulatif de la barre, aperçu, prix avec options.
    let majChoix = function () {
      let choix = flocage();
      options.textContent = CartData.options({ taille, flocage: choix });
      apercu.textContent = champNom.value.trim().toUpperCase() + " " + champNumero.value.trim();
      prixTotal.textContent = formaterPrix(produit.prix + (flocageActif ? (produit.prixFlocage ?? 0) : 0));
      erreur.hidden = true;
    };

    // Tailles : une tuile par taille, la taille épuisée est barrée et grisée.
    if (produit.tailles.length === 0) {
      blocTailles.remove();
    }
    let tuiles = [];
    produit.tailles.forEach((t) => {
      let li = htmlToFragment(genericRenderer(tuileTemplate, { libelle: t.libelle, etat: t.quantite < 1 ? "Épuisé" : "" }));
      let bouton = li.querySelector("button");
      bouton.disabled = t.quantite < 1;
      bouton.addEventListener("click", () => {
        taille = { id: t.id, libelle: t.libelle };
        tuiles.forEach((b) => b.setAttribute("aria-pressed", String(b === bouton)));
        majChoix();
      });
      tuiles.push(bouton);
      fragment.querySelector('[data-role="tailles"]').append(li);
    });
    // Une seule taille proposée (« Unique ») : inutile de la faire choisir.
    if (produit.tailles.length === 1 && produit.tailles[0].quantite > 0) {
      tuiles[0].click();
    }

    // Flocage : seulement pour les produits qui en proposent un.
    if (produit.prixFlocage == null) {
      blocFlocage.remove();
    }
    interrupteur.addEventListener("click", () => {
      flocageActif = !flocageActif;
      interrupteur.setAttribute("aria-checked", String(flocageActif));
      champsFlocage.hidden = !flocageActif;
      majChoix();
    });
    champNom.addEventListener("input", majChoix);
    champNumero.addEventListener("input", majChoix);

    // Contrôle des choix : la première erreur est affichée, rien n'est ajouté.
    let verifier = function () {
      // Chaque produit a toujours au moins une variante avec stock (OPT-B),
      // « Unique » pour ceux sans taille : aucune variante, ou toutes épuisées,
      // c'est le même cas, pas une absence de contrainte.
      if (produit.tailles.length === 0 || produit.tailles.every((t) => t.quantite < 1)) {
        return "Ce produit est épuisé.";
      }
      if (taille === null) {
        return "Choisissez une taille.";
      }
      if (flocageActif && !NOM_FLOCAGE.test(champNom.value.trim())) {
        return "Le nom du flocage doit contenir de 1 à 12 lettres.";
      }
      if (flocageActif && !NUMERO_FLOCAGE.test(champNumero.value.trim())) {
        return "Le numéro du flocage doit être compris entre 0 et 99.";
      }
      return "";
    };

    fragment.querySelector('[data-role="ajouter"]').addEventListener("click", () => {
      let message = verifier();
      if (message !== "") {
        erreur.textContent = message;
        erreur.hidden = false;
        return;
      }
      actions.surAjouter(produit, { taille, flocage: flocage() });
    });

    majChoix();
    return fragment;
  },
};

export { FicheProduitView, NOM_FLOCAGE, NUMERO_FLOCAGE };
