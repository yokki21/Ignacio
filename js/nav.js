let renderFn = () => {};
export const setRenderer = (fn) => { renderFn = fn; };
export const rerender = () => renderFn();
export const go = (hash) => { if (location.hash === hash) renderFn(); else location.hash = hash; };
// enlaza un evento a todos los elementos que cumplan el selector
export function on(root, sel, evt, fn) { root.querySelectorAll(sel).forEach(el => el.addEventListener(evt, (e) => fn(el, e))); }
