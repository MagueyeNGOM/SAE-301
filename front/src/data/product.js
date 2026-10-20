import { getRequest, postRequest } from "../lib/api-request.js";

let ProductData = {};

/**
 * Les produits du catalogue : GET /api/produits, ou GET /api/produits?categorie=slug
 * Réponse : { produits: [{ id, nom, slug, prix, image, nouveaute, categorie }] }
 */
ProductData.fetchAll = async function (categorie) {
  let reponse = await getRequest(categorie ? "produits?categorie=" + encodeURIComponent(categorie) : "produits");
  return reponse.produits;
};

/**
 * Les catégories avec leur nombre de produits : GET /api/categories
 * Réponse : { categories: [{ nom, slug, nombre }] }
 */
ProductData.fetchCategories = async function () {
  let reponse = await getRequest("categories");
  return reponse.categories;
};

/**
 * Un produit : GET /api/produit?slug=...
 * Réponse : { produit: { id, nom, slug, description, details, prix, image, nouveaute, categorie, images: [fichier] } }
 */
ProductData.fetchOne = async function (slug) {
  let reponse = await getRequest("produit?slug=" + encodeURIComponent(slug));
  return reponse.produit;
};

ProductData.adminAll = () => getRequest("admin/produits");
ProductData.adminFind = (id) => getRequest("admin/produit?id=" + encodeURIComponent(id));
ProductData.save = (product) => postRequest("admin/produits/save", product);
ProductData.delete = (id) => postRequest("admin/produits/delete", { id, confirmed: true });

export { ProductData };
