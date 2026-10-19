import { genericRenderer, htmlToFragment } from "../../lib/utils.js";
import { formaterPrix } from "../../lib/format.js";
import template from "./template.html?raw";

// Carte d'un produit : nom, prix, image principale (DEC-B).
let CarteProduitView = {
  html: function (produit) {
    return genericRenderer(template, {
      nom: produit.nom,
      slug: produit.slug,
      categorie: produit.categorie,
      prix: formaterPrix(produit.prix),
      image: import.meta.env.BASE_URL + "images/produits/" + produit.image,
    });
  },

  dom: function (produit) {
    return htmlToFragment(CarteProduitView.html(produit));
  },
};

export { CarteProduitView };
