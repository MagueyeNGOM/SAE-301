import { postRequest } from "../lib/api-request.js";

let OrderData = {};

// Dernière commande validée, gardée en mémoire pour la page de confirmation.
// shortcut: perdue au rechargement de la page, à lire depuis l'API si une page
// « Mes commandes » existe un jour.
let derniere = null;

/**
 * Validation de la commande : POST /api/commande
 * Seuls les slugs et les quantités partent : le serveur relit les prix en base
 * et identifie le client par sa session.
 * Renvoie { numero, total, articles }.
 */
OrderData.valider = async function (lignes) {
  let reponse = await postRequest("commande", {
    lignes: lignes.map((l) => ({ slug: l.slug, quantite: l.quantite })),
  });
  derniere = reponse.commande;
  return derniere;
};

OrderData.derniere = function () {
  return derniere;
};

export { OrderData };
