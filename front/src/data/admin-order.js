import { getRequest, postRequest } from "../lib/api-request.js";

// Commandes vues par l'administrateur (PIL-B).
export const AdminOrderData = {
  all: ({ tri, sens, statut }) =>
    getRequest(`admin/commandes?tri=${tri}&sens=${sens}` + (statut ? "&statut=" + encodeURIComponent(statut) : "")),
  find: (id) => getRequest("admin/commande?id=" + encodeURIComponent(id)),
  // action : "suivant" ou "annuler" (confirmation obligatoire pour annuler)
  act: (ids, action) => postRequest("admin/commandes/action", { ids, action, ...(action === "annuler" ? { confirmed: true } : {}) }),
};
