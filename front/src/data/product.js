import { getRequest } from "../lib/api-request.js";

let ProductData = {};

/**
 * Tous les produits du catalogue : GET /api/produits
 * Réponse : { produits: [{ id, nom, slug, prix, image, nouveaute, categorie }] }
 */
ProductData.fetchAll = async function () {
  let reponse = await getRequest("produits");
  return reponse.produits;
};

export { ProductData };
