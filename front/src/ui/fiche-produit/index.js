import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { formaterPrix } from "../../lib/format.js";
import template from "./template.html?raw";

// Fiche détaillée d'un produit (DEC-C).
let FicheProduitView = {
  html: function (produit) {
    return genericRenderer(template, {
      nom: produit.nom,
      categorie: produit.categorie,
      prix: formaterPrix(produit.prix),
      description: produit.description,
      details: produit.details ?? "",
      image: import.meta.env.BASE_URL + "images/produits/" + (produit.images[0] ?? produit.image),
    });
  },

  dom: function (produit, actions) {
    let fragment = htmlToFragment(FicheProduitView.html(produit));
    fragment.querySelector('[data-role="ajouter"]').addEventListener("click", () => actions.surAjouter(produit));
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

    return fragment;
  },
};

export { FicheProduitView };
