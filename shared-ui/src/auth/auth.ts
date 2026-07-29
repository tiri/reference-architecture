/**
 * Login and logout against the module's own BFF. Both are top-level navigations on
 * purpose: the OIDC redirect chains must run in the browser's main window — a fetch()
 * would swallow the redirects.
 *
 * Neither knows the backend framework: the BFF starts the flow for any protected path.
 */

/** Hands control back to the BFF, which redirects an unauthenticated visitor to the IAM. */
export function login() {
  window.location.reload();
}

/** RP-initiated logout: a form post, because the end-session redirect chain follows. */
export function logout() {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/logout";
  document.body.appendChild(form);
  form.submit();
}
