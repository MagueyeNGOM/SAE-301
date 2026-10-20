import { getRequest } from "../lib/api-request.js";

let StatsData = {};

/**
 * Indicateurs : GET /api/admin/stats, réservé à la session administrateur.
 *
 * { total: 19, orders: 0, prixMoyen: 62.5,
 *   parCategorie: [ { categorie: "Maillots", nombre: 8 }, ... ] }
 */
StatsData.fetch = async function () {
  return getRequest("admin/stats");
};

export { StatsData };
