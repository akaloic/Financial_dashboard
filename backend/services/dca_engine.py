from datetime import date
from typing import Any, Dict, List

import pandas as pd

LIVRET_A_TAUX_ANNUEL = 0.03


def run_dca_simulation(
    prix_df: pd.DataFrame,
    capital_initial: float,
    versement_mensuel: float,
    date_debut: date,
    date_fin: date,
    ter: float,
) -> List[Dict[str, Any]]:
    """
    Exécute le backtesting DCA mois par mois sur prix_df.

    Args:
        prix_df: DataFrame avec DatetimeIndex et colonne 'adj_close'.
        capital_initial: Montant investi au premier mois en plus du versement (>= 0).
        versement_mensuel: Versement mensuel régulier (> 0).
        date_debut: Début de la période de simulation.
        date_fin: Fin de la période de simulation.
        ter: TER annuel en décimal (ex: 0.0012 pour 0.12 %).

    Returns:
        Liste de dicts (un par mois simulé) avec les champs de ResultatSimulation.
    """
    mask = (prix_df.index >= pd.Timestamp(date_debut)) & (prix_df.index <= pd.Timestamp(date_fin))
    df = prix_df[mask].copy()

    df["ym"] = df.index.to_period("M")
    monthly = df.groupby("ym").first()

    results: List[Dict[str, Any]] = []
    parts_cumulees = 0.0
    capital_investi = 0.0

    for i, (period, row) in enumerate(monthly.iterrows()):
        prix = float(row["adj_close"])
        if prix <= 0:
            continue

        apport = versement_mensuel + (capital_initial if i == 0 else 0.0)
        parts_achetees = apport / prix
        parts_cumulees += parts_achetees
        capital_investi += apport

        valeur_brute = parts_cumulees * prix
        valeur_nette = valeur_brute * (1 - ter / 12)
        parts_cumulees = valeur_nette / prix

        results.append({
            "mois": i + 1,
            "date": period.to_timestamp().date(),
            "prix_cloture": round(prix, 4),
            "parts_achetees": round(parts_achetees, 6),
            "parts_cumulees": round(parts_cumulees, 6),
            "valeur_brute": round(valeur_brute, 2),
            "valeur_nette": round(valeur_nette, 2),
            "capital_investi": round(capital_investi, 2),
        })

    return results


def compute_cagr(valeur_finale: float, capital_total: float, nb_annees: float) -> float:
    """
    Calcule le CAGR (Compound Annual Growth Rate).

    Returns:
        Taux annualisé en décimal, ou 0.0 si les paramètres sont invalides.
    """
    if capital_total <= 0 or nb_annees <= 0 or valeur_finale <= 0:
        return 0.0
    return (valeur_finale / capital_total) ** (1.0 / nb_annees) - 1.0


def compute_livret_a(capital_initial: float, versement_mensuel: float, nb_mois: int) -> float:
    """
    Simule le Livret A avec un taux fixe annuel de 3 %.

    Returns:
        Valeur finale du Livret A après nb_mois mois.
    """
    taux_mensuel = LIVRET_A_TAUX_ANNUEL / 12
    valeur = capital_initial
    for _ in range(nb_mois):
        valeur = valeur * (1 + taux_mensuel) + versement_mensuel
    return round(valeur, 2)
