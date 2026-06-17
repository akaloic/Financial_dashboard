import { useState, useEffect, useCallback } from "react";
import { getApiBase, setApiBase, pingApi } from "../api/client";

type Status = "checking" | "ok" | "down";

/**
 * Bandeau de connexion à l'API.
 * - Vérifie au montage que le backend répond.
 * - S'il est injoignable, propose de saisir l'URL du backend (Render / HF Spaces…),
 *   stockée en localStorage → le front déployé sur GitHub Pages devient utilisable
 *   sans rebuild dès qu'un backend est en ligne.
 */
export default function ApiBanner() {
  const [status, setStatus] = useState<Status>("checking");
  const [url, setUrl] = useState(getApiBase());
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    setStatus("checking");
    setStatus((await pingApi()) ? "ok" : "down");
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const connect = async () => {
    setApiBase(url.trim());
    await check();
  };

  if (status === "ok" || dismissed) {
    return (
      <div className={`api-dot api-dot-${status}`} title={`API : ${getApiBase() || "same-origin"}`}>
        <span className="dot" /> {status === "ok" ? "API connectée" : "API ?"}
      </div>
    );
  }

  if (status === "checking") {
    return (
      <div className="api-dot api-dot-checking">
        <span className="dot" /> Connexion à l'API…
      </div>
    );
  }

  return (
    <div className="api-banner">
      <div className="api-banner-text">
        <strong>Backend non connecté.</strong> Colle l'URL de ton API déployée
        (Render / Hugging Face) pour activer les calculs.
      </div>
      <div className="api-banner-actions">
        <input
          className="api-banner-input"
          type="url"
          placeholder="https://portefeuille-passif-api.onrender.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
        />
        <button className="btn-primary" onClick={connect}>
          Connecter
        </button>
        <button className="btn-ghost" onClick={() => setDismissed(true)}>
          Ignorer
        </button>
      </div>
    </div>
  );
}
