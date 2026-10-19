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

// L'en-tête s'abonne à « auth:change » pour suivre la session, comme le
// compteur suit « panier:change ».
AuthData.signaler = function () {
  window.dispatchEvent(new CustomEvent("auth:change"));
};

export { AuthData };
