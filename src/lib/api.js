async function request(path, { method = 'GET', body, password } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(password ? { 'x-admin-password': password } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Tinklo klaida. Patikrink interneto ryšį ir bandyk dar kartą.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Kažkas nepavyko. Bandyk dar kartą.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  me: (id) => request(`/me/${encodeURIComponent(id)}`),
  saveWish: (id, wish) => request(`/me/${encodeURIComponent(id)}/wish`, { method: 'POST', body: { wish } }),
  reveal: (id) => request(`/me/${encodeURIComponent(id)}/reveal`, { method: 'POST' }),

  adminList: (password) => request('/admin/participants', { password }),
  adminAdd: (password, name) => request('/admin/participants', { method: 'POST', body: { name }, password }),
  adminRemove: (password, id) =>
    request(`/admin/participants/${encodeURIComponent(id)}`, { method: 'DELETE', password }),
  adminRedraw: (password) => request('/admin/redraw', { method: 'POST', password }),
  adminReset: (password) => request('/admin/reset', { method: 'POST', password }),
};

// navigator.clipboard veikia tik per HTTPS, todėl paliekamas atsarginis kelias.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}
