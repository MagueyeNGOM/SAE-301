import { AuthData } from "../../data/auth.js";
import { CartData } from "../../data/cart.js";
import { ProductData } from "../../data/product.js";
import { genericRenderer, htmlToFragment, redirect } from "../../lib/utils.js";
import template from "./template.html?raw";
import categoryTemplate from "./category.html?raw";

// Les catégories sont relues à chaque navigation pour refléter GOF-C.
let HeaderView = {
  html: function () {
    return template;
  },

  dom: function () {
    let fragment = htmlToFragment(template);
    const categorySlot = fragment.querySelector('slot[name="categories"]');
    ProductData.fetchCategories().then((categories) => {
      const links = document.createDocumentFragment();
      for (const category of categories) {
        // Le chargement est asynchrone : le routeur a déjà complété les autres liens.
        const href = import.meta.env.BASE_URL + "categorie/" + encodeURIComponent(category.slug);
        const item = htmlToFragment(genericRenderer(categoryTemplate, { href, nom: category.nom }));
        if (window.location.pathname === href) item.querySelector("a").setAttribute("aria-current", "page");
        links.append(item);
      }
      categorySlot.replaceWith(links);
    }).catch(() => {
      categorySlot.replaceWith(document.createTextNode("Catégories indisponibles"));
    });
    let compteur = fragment.querySelector('[data-role="compteur"]');
    let majCompteur = () => (compteur.textContent = CartData.compter());
    majCompteur();
    // Le compteur suit toute modification du panier, d'où qu'elle vienne.
    window.addEventListener("panier:change", majCompteur);

    // Compte (CMD-C) : « Mon compte » mène à la connexion ; une fois connecté,
    // l'en-tête affiche le nom et « Se déconnecter ». Le serveur seul sait
    // si la session est valide, d'où l'appel à /api/me.
    let lienConnexion = fragment.querySelector('[data-role="connexion"]');
    let blocConnecte = fragment.querySelector('[data-role="connecte"]');
    let nom = fragment.querySelector('[data-role="nom"]');
    let majCompte = async () => {
      let moi = { connecte: false };
      try {
        moi = await AuthData.me();
      } catch {
        // API injoignable : on affiche l'état « non connecté ».
      }
      lienConnexion.hidden = moi.connecte;
      blocConnecte.hidden = !moi.connecte;
      nom.textContent = moi.nom ?? "";
    };
    majCompte();
    window.addEventListener("auth:change", majCompte);
    fragment.querySelector('[data-role="deconnexion"]').addEventListener("click", async () => {
      await AuthData.logout();
      redirect("/");
    });

    return fragment;
  },
};

export { HeaderView };
