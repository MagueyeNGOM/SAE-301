import { getRequest } from "../lib/api-request.js";

let StatsData = {};

/**
 * Statistiques du catalogue : GET /api/admin/stats, réservé aux
 * administrateurs (401 sans connexion, 403 sans le rôle admin).
 *
 * { total: 19, prixMoyen: 62.5,
 *   parCategorie: [ { categorie: "Maillots", nombre: 8 }, ... ] }
 */
StatsData.fetch = async function () {
  return getRequest("admin/stats");
};

export { StatsData };
