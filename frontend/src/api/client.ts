// Base de l'API résolue dans cet ordre :
//   1. URL saisie par l'utilisateur (localStorage) — permet de pointer un backend
//      déployé sans rebuild (utile quand le front est sur GitHub Pages).
//   2. VITE_API_URL injectée au build.
//   3. Chaîne vide → requêtes same-origin (dev local via proxy Vite).
const LS_KEY = "pp_api_base";

export function getApiBase(): string {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return stored.replace(/\/$/, "");
  } catch {
    /* localStorage indisponible (mode privé) */
  }
  return (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
}

export function setApiBase(url: string): void {
  try {
    if (url) localStorage.setItem(LS_KEY, url.replace(/\/$/, ""));
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

/** Ping du health-check (`GET /`). Retourne true si le backend répond. */
export async function pingApi(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
