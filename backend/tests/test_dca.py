import pytest
import pandas as pd
from datetime import date

from services.dca_engine import compute_cagr, compute_livret_a, run_dca_simulation


@pytest.fixture
def prix_constants():
    """Cours fictifs constants à 100 € sur 252 jours ouvrés (≈ 12 mois)."""
    idx = pd.date_range("2020-01-02", periods=252, freq="B")
    return pd.DataFrame({"adj_close": [100.0] * 252}, index=idx)


@pytest.fixture
def prix_croissants():
    """Cours croissants linéairement de 100 à 200 € sur 504 jours ouvrés (≈ 24 mois)."""
    idx = pd.date_range("2020-01-02", periods=504, freq="B")
    prices = [100.0 + i * (100.0 / 503) for i in range(504)]
    return pd.DataFrame({"adj_close": prices}, index=idx)


# --- Tests run_dca_simulation ---

def test_capital_zero_premier_versement_seul(prix_constants):
    """Capital initial = 0 : le premier mois est financé uniquement par le versement mensuel."""
    res = run_dca_simulation(prix_constants, 0.0, 100.0, date(2020, 1, 1), date(2020, 12, 31), 0.0)
    assert res[0]["capital_investi"] == pytest.approx(100.0)
    assert res[0]["parts_achetees"] == pytest.approx(1.0)


def test_ter_zero_valeur_nette_egale_brute(prix_constants):
    """TER = 0 : valeur_nette doit être égale à valeur_brute à chaque mois."""
    res = run_dca_simulation(prix_constants, 0.0, 100.0, date(2020, 1, 1), date(2020, 12, 31), 0.0)
    for r in res:
        assert r["valeur_nette"] == pytest.approx(r["valeur_brute"], rel=1e-6)


def test_periode_un_mois(prix_constants):
    """Période d'un mois : exactement 1 résultat avec capital = capital_initial + versement."""
    res = run_dca_simulation(prix_constants, 500.0, 100.0, date(2020, 1, 1), date(2020, 1, 31), 0.001)
    assert len(res) == 1
    assert res[0]["capital_investi"] == pytest.approx(600.0)


def test_capital_initial_integre_premier_mois(prix_constants):
    """Le capital initial doit être ajouté au versement mensuel uniquement au mois 1."""
    res = run_dca_simulation(prix_constants, 1000.0, 200.0, date(2020, 1, 1), date(2020, 12, 31), 0.0)
    assert res[0]["capital_investi"] == pytest.approx(1200.0)
    assert res[1]["capital_investi"] == pytest.approx(1400.0)


def test_ter_reduit_valeur_portefeuille(prix_constants):
    """Avec TER > 0, la valeur nette doit être strictement inférieure à la valeur brute."""
    res_ter = run_dca_simulation(prix_constants, 0.0, 100.0, date(2020, 1, 1), date(2020, 12, 31), 0.001)
    res_no_ter = run_dca_simulation(prix_constants, 0.0, 100.0, date(2020, 1, 1), date(2020, 12, 31), 0.0)
    assert res_ter[-1]["valeur_nette"] < res_no_ter[-1]["valeur_nette"]


def test_douze_mois_produit_douze_resultats(prix_constants):
    """12 mois de trading doivent produire exactement 12 résultats mensuels."""
    res = run_dca_simulation(prix_constants, 0.0, 100.0, date(2020, 1, 1), date(2020, 12, 31), 0.0)
    assert len(res) == 12


# --- Tests compute_cagr ---

def test_cagr_zero_si_valeur_egale_capital():
    """CAGR = 0 % si la valeur finale est égale au capital total investi."""
    assert compute_cagr(1000.0, 1000.0, 5.0) == pytest.approx(0.0, abs=1e-6)


def test_cagr_retourne_zero_parametres_invalides():
    """compute_cagr retourne 0.0 pour tout paramètre nul ou négatif."""
    assert compute_cagr(0.0, 1000.0, 5.0) == 0.0
    assert compute_cagr(1000.0, 0.0, 5.0) == 0.0
    assert compute_cagr(1000.0, 1000.0, 0.0) == 0.0


def test_cagr_positif_si_croissance(prix_croissants):
    """Le CAGR doit être positif si la valeur finale dépasse le capital investi."""
    res = run_dca_simulation(prix_croissants, 0.0, 200.0, date(2020, 1, 1), date(2021, 12, 31), 0.0)
    valeur = res[-1]["valeur_nette"]
    capital = res[-1]["capital_investi"]
    cagr = compute_cagr(valeur, capital, 2.0)
    assert cagr > 0


# --- Tests compute_livret_a ---

def test_livret_a_croissant():
    """La valeur du Livret A doit augmenter chaque mois avec des versements positifs."""
    val_6m = compute_livret_a(0.0, 100.0, 6)
    val_12m = compute_livret_a(0.0, 100.0, 12)
    assert val_12m > val_6m


def test_livret_a_sans_versement_capitalise_interet():
    """Sans versement mensuel, le Livret A capitalise seulement les intérêts sur le capital initial."""
    val = compute_livret_a(1200.0, 0.0, 12)
    assert val == pytest.approx(1200.0 * (1 + 0.03 / 12) ** 12, rel=1e-4)
