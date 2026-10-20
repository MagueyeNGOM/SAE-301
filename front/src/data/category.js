import { getRequest, postRequest } from "../lib/api-request.js";

export const CategoryData = {
  all: () => getRequest("admin/categories"),
  save: (category) => postRequest("admin/categories/save", category),
  delete: (id) => postRequest("admin/categories/delete", { id, confirmed: true }),
};
