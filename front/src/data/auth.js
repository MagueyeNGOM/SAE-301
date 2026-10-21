import { getRequest, postRequest } from "../lib/api-request.js";

let AuthData = {};

/**
 * Connexion : POST /api/login
 * En cas de succès, le serveur ouvre une session ; le cookie PHPSESSID qu'il
 * renvoie accompagnera ensuite chaque requête.
 */
AuthData.login = async function (email, mdp) {
  let reponse = await postRequest("login", { email, mdp });
  AuthData.signaler();
  return reponse;
};

/**
 * Inscription : POST /api/register (le compte créé est aussi connecté).
 */
AuthData.register = async function (nom, email, mdp) {
  let reponse = await postRequest("register", { nom, email, mdp });
  AuthData.signaler();
  return reponse;
};

/**
 * Qui est connecté ? GET /api/me -> { connecte, nom?, role? }
 */
AuthData.me = async function () {
  return getRequest("me");
};

/**
 * Déconnexion : POST /api/logout
 */
AuthData.logout = async function () {
  let reponse = await postRequest("logout");
  AuthData.signaler();
  return reponse;
};

/**
 * Espace personnel (SUI-B) : GET /api/compte -> { nom, email, depuis, commandes }
 * Erreur 401 si le client n'est pas connecté.
 */
AuthData.profil = async function () {
  return getRequest("compte");
};

/**
 * Historique (SUI-C) : GET /api/compte/commandes?statut=&periode=&page= -> { commandes, page, pages }
 */
AuthData.commandes = async function ({ statut, periode, page }) {
  let params = new URLSearchParams({ page });
  if (statut) params.set("statut", statut);
  if (periode) params.set("periode", periode);
  return getRequest("compte/commandes?" + params);
};

/**
 * Détail d'une commande du client : GET /api/compte/commande?numero=OM-000001
 */
AuthData.commande = async function (numero) {
  return getRequest("compte/commande?numero=" + encodeURIComponent(numero));
};

/**
 * Commander à nouveau (SUI-A) : GET /api/compte/recommander?numero=OM-000001
 * -> { lignes } confrontées au catalogue et au stock actuels.
 */
AuthData.recommander = async function (numero) {
  return getRequest("compte/recommander?numero=" + encodeURIComponent(numero));
};

/**
 * Modifie nom, email et (si « nouveau » est rempli) le mot de passe :
 * POST /api/compte/profil. L'ancien mot de passe est alors exigé.
 */
AuthData.modifierProfil = async function (valeurs) {
  let reponse = await postRequest("compte/profil", valeurs);
  AuthData.signaler(); // l'en-tête affiche le nom
  return reponse;
};

// L'en-tête s'abonne à « auth:change » pour suivre la session, comme le
// compteur suit « panier:change ».
AuthData.signaler = function () {
  window.dispatchEvent(new CustomEvent("auth:change"));
};

export { AuthData };
