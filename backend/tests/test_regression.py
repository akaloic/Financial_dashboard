import pytest
import numpy as np
import pandas as pd

from services.regression_engine import run_ols_regression


@pytest.fixture
def df_lineaire():
    """Série parfaitement linéaire : R² attendu ≈ 1."""
    idx = pd.date_range("2020-01-02", periods=100, freq="B")
    prices = [100.0 + i * 0.5 for i in range(100)]
    return pd.DataFrame({"adj_close": prices}, index=idx)


@pytest.fixture
def df_insuffisant():
    """Série avec moins de 30 observations pour tester la levée d'erreur."""
    idx = pd.date_range("2020-01-02", periods=10, freq="B")
    return pd.DataFrame({"adj_close": [100.0] * 10}, index=idx)


@pytest.fixture
def df_reel():
    """Série simulant un cours haussier sur 252 jours (≈ 1 an)."""
    idx = pd.date_range("2020-01-02", periods=252, freq="B")
    np.random.seed(42)
    prices = 100.0 + np.cumsum(np.random.normal(0.1, 1.0, 252))
    return pd.DataFrame({"adj_close": prices}, index=idx)


# --- Tests structurels ---

def test_retourne_toutes_les_cles(df_lineaire):
    """run_ols_regression doit retourner toutes les clés attendues."""
    result = run_ols_regression(df_lineaire)
    expected_keys = {"beta0", "beta1", "r_squared", "p_value", "std_error",
                     "durbin_watson", "nb_observations", "interpretation",
                     "donnees_historiques", "projection"}
    assert expected_keys.issubset(result.keys())


def test_nb_observations_correct(df_lineaire):
    """nb_observations doit correspondre à la longueur du DataFrame en entrée."""
    result = run_ols_regression(df_lineaire)
    assert result["nb_observations"] == 100


def test_projection_252_points(df_lineaire):
    """La projection doit contenir exactement 252 points (≈ 12 mois de trading)."""
    result = run_ols_regression(df_lineaire)
    assert len(result["projection"]) == 252


def test_historique_meme_longueur_que_df(df_lineaire):
    """donnees_historiques doit avoir la même longueur que le DataFrame d'entrée."""
    result = run_ols_regression(df_lineaire)
    assert len(result["donnees_historiques"]) == len(df_lineaire)


# --- Tests statistiques ---

def test_r_squared_serie_lineaire_proche_de_1(df_lineaire):
    """Sur une série parfaitement linéaire, R² doit être très proche de 1."""
    result = run_ols_regression(df_lineaire)
    assert result["r_squared"] == pytest.approx(1.0, abs=1e-4)


def test_beta1_positif_serie_haussiere(df_reel):
    """Sur une série haussière, la pente β1 doit être positive."""
    result = run_ols_regression(df_reel)
    assert result["beta1"] > 0


def test_residus_somme_nulle(df_lineaire):
    """La somme des résidus OLS doit être proche de 0 (propriété de l'estimateur)."""
    result = run_ols_regression(df_lineaire)
    residus = [p["residue"] for p in result["donnees_historiques"]]
    assert sum(residus) == pytest.approx(0.0, abs=1e-4)


def test_ic_projection_encadre_prediction(df_lineaire):
    """Pour chaque point de projection, ic_low <= y_pred <= ic_high."""
    result = run_ols_regression(df_lineaire)
    for p in result["projection"]:
        assert p["ic_low"] <= p["y_pred"] <= p["ic_high"]


# --- Tests de robustesse ---

def test_erreur_si_moins_de_30_observations(df_insuffisant):
    """run_ols_regression doit lever ValueError si le DataFrame a moins de 30 observations."""
    with pytest.raises(ValueError, match="30"):
        run_ols_regression(df_insuffisant)


def test_interpretation_contient_avertissement(df_reel):
    """L'interprétation doit contenir un champ 'avertissement' non vide."""
    result = run_ols_regression(df_reel)
    assert "avertissement" in result["interpretation"]
    assert len(result["interpretation"]["avertissement"]) > 0


def test_durbin_watson_entre_0_et_4(df_reel):
    """La statistique Durbin-Watson doit être dans l'intervalle [0, 4]."""
    result = run_ols_regression(df_reel)
    assert 0 <= result["durbin_watson"] <= 4
