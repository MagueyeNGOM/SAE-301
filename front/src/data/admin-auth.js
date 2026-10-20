import { getRequest, postRequest } from "../lib/api-request.js";

// Le cookie admin est indépendant : aucune notification de session client ici.
export const AdminAuthData = {
  login: (email, mdp) => postRequest("admin/login", { email, mdp }),
  me: () => getRequest("admin/me"),
  logout: () => postRequest("admin/logout"),
};
