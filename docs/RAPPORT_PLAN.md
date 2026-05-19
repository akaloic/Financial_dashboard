# Plan détaillé du rapport écrit (15-20 pages)

## Informations générales

- Format : PDF, 15 à 20 pages hors annexes
- Rendu : 48h avant la soutenance
- Police recommandée : 11-12 pt, interligne 1.15, marges 2.5 cm
- Citations numérotées [1], [2]... avec bibliographie en fin de document

---

## Page de garde (~0,5 page)

- Titre : "Simulateur de Portefeuille Passif avec Régression Linéaire Prédictive"
- Noms des membres du groupe
- Master 2 MIAGE — Université Paris-Saclay
- UE Projet DATA — Encadrant : Nicolas LEGEAY
- Année universitaire 2025-2026
- URL de l'application déployée

## Résumé exécutif (~0,5 page)

À couvrir : la problématique (comment aider un investisseur particulier à
simuler et analyser une stratégie passive), la solution développée (application
3 modules : explorateur ETF, simulateur DCA, régression OLS), la stack technique
en quelques mots-clés, le résultat principal de l'analyse de régression sur CW8.

## 1. Introduction (~1 page)

Contextualiser la croissance de l'investissement passif en France (ETF, PEA),
puis présenter l'intérêt pédagogique de combiner data engineering et analyse
statistique. Énoncer les objectifs et donner le plan du rapport en une phrase
par section.

Ne pas confondre « investissement passif » (stratégie) et « fonds passif »
(véhicule).

## 2. État de l'art (~1,5 pages)

Définition du DCA et études académiques sur son efficacité. Comparaison ETF
passif vs fonds actif (lien avec le bonus +1,5 pt). Utilisation de la régression
linéaire en finance : pertinence et limites connues. Outils existants
(JustETF, Portfolio Visualizer) et valeur ajoutée de l'application développée.

## 3. Architecture technique (~2 pages)

Reprendre le diagramme ASCII de `docs/ARCHITECTURE.md`. Justifier les choix
technologiques (FastAPI vs Django, React vs Vue, PostgreSQL vs SQLite). Présenter
le modèle de données via un diagramme ERD ou un tableau d'entités. Décrire le
pipeline ETL yfinance → BDD → API → Frontend.

Inclure une capture du Swagger UI et un extrait du modèle SQLAlchemy le plus
représentatif.

## 4. Module A — Explorateur d'ETF (~2 pages)

Fonctionnalités implémentées (recherche, fiche, graphique, comparaison), sources
de données (yfinance pour les cours, CSV pour les métadonnées), limites de
yfinance pour les ETF européens (TER et indice non disponibles directement),
captures d'écran de l'interface.

Inclure un graphique comparatif CW8 vs un autre ETF, normalisé base 100.

## 5. Module B — Simulateur DCA (~2,5 pages)

Décrire l'algorithme (reprendre le pseudo-code de `docs/MODULE_B.md`), expliciter
la formule du TER mensuel et celle du CAGR. Présenter les résultats d'une
simulation type (CW8, 200 €/mois, 10 ans), la comparaison avec le Livret A, et
les résultats des tests pytest.

À inclure :
- Courbe portefeuille avec TER vs sans TER vs Livret A
- Extrait du tableau de résultats mensuels
- Résultats des tests pytest

## 6. Module C — Régression Linéaire OLS (~4 pages, section la plus discriminante : 4 pts)

Cette section doit être rigoureuse et nuancée.

### 6.1 Présentation du modèle (~0,5 page)

Définir les variables X et Y, justifier le choix d'une régression simple sur
série temporelle, rappeler les hypothèses classiques de l'OLS (linéarité,
homoscédasticité, indépendance des erreurs, normalité).

### 6.2 Résultats numériques (~1 page)

Présenter sous forme de tableau pour chaque ETF analysé :

| ETF | β0 | β1 | R² | p-value | Durbin-Watson | N |
|---|---|---|---|---|---|---|
| CW8.PA | ... | ... | ... | ... | ... | ... |
| ESE.PA | ... | ... | ... | ... | ... | ... |

Interpréter β1 (« le prix augmente de X € par jour de trading en moyenne sur la
période ») et le R² brut, sans jugement prématuré.

### 6.3 Analyse des résidus (~1 page)

Inclure le graphique des résidus. Discuter de la structure non-aléatoire des
résidus qui viole l'hypothèse d'indépendance, la valeur du Durbin-Watson
observée (~0,04) par rapport au seuil théorique (~2), et conclure sur
l'invalidation des IC et p-values classiques.

### 6.4 Interprétation critique — Limites du modèle (point discriminant)

À couvrir obligatoirement :

**R² élevé ≠ prédictibilité.** Un R² de 0,97 signifie que 97 % de la variance
du prix est « expliquée » par la tendance temporelle linéaire. Mais cette
tendance est triviale : un actif en croissance sur 10 ans aura toujours un R²
élevé contre une droite croissante. Ce R² ne mesure pas la capacité à prévoir
les prix futurs, juste l'adéquation d'une droite à une série déjà observée.

**Spurious Regression.** Deux séries temporelles non-stationnaires (intégrées
d'ordre 1) produisent mécaniquement un R² élevé et une p-value très faible,
même sans aucun lien économique. Le phénomène a été formalisé par Granger &
Newbold en 1974 et s'applique directement aux cours boursiers. Un test de
Dickey-Fuller augmenté (ADF) confirmerait la non-stationnarité.

**Autocorrélation des résidus.** Le Durbin-Watson très faible (~0,04 sur CW8)
indique une autocorrélation positive forte. Cela viole l'hypothèse
d'indépendance de l'OLS, ce qui biaise les écarts-types estimés. Les intervalles
de confiance calculés sont donc trop étroits et les p-values trop faibles.

**Modèles alternatifs.** Pour une analyse sérieuse de séries temporelles
financières : ARIMA, modèles log-linéaires (plus adaptés à la croissance
exponentielle), GARCH (variance conditionnelle), réseaux récurrents (LSTM).
Ces approches dépassent le cadre pédagogique du projet mais méritent d'être
citées.

**Projection indicative.** La projection à 12 mois extrapole mécaniquement la
tendance historique sans prendre en compte les chocs économiques, les
changements de régime, l'inflation, ni la mean-reversion. À ne pas interpréter
comme une prévision.

### 6.5 Conclusion du module (~0,5 page)

Le modèle confirme utilement la tendance haussière long terme de l'ETF. Il ne
permet pas de prédire les prix futurs avec fiabilité. La valeur pédagogique
tient à la mise en évidence des limites de l'OLS appliqué aux séries temporelles.

## 7. Qualité du code et tests (~1 page)

Structure du projet (reprendre l'arborescence), respect des bonnes pratiques
(`.env`, `.gitignore`, docstrings), résultats des tests pytest avec un tableau
indiquant nom du test, résultat, cas limite couvert. Couverture de code si
disponible via `pytest --cov`.

## 8. Conclusion (~1 page)

Rappel des objectifs atteints, points forts du projet (vraies données, 3 modules
fonctionnels, analyse critique), limites et améliorations possibles
(authentification JWT, export PDF, ARIMA, mobile), bilan d'apprentissage (data
engineering, statistiques, full-stack).

## Bibliographie

Format IEEE ou APA. À inclure au minimum :
- Documentation FastAPI, React, yfinance
- Granger, C.W.J. & Newbold, P. (1974). "Spurious regressions in econometrics".
  *Journal of Econometrics*, 2(2), 111-120.
- Référence académique ou institutionnelle sur le DCA (AMF, BIS)
- Documentation statsmodels OLS

## Annexes (hors limite de pages)

- Code source complet des fonctions clés (`dca_engine.py`, `regression_engine.py`)
- Résultats détaillés des simulations pour les 4 ETF
- Captures d'écran supplémentaires de l'interface

---

## Points d'attention

Présenter R² comme preuve de fiabilité prédictive est l'erreur la plus coûteuse
sur ce projet. La spurious regression est l'attendu classique : ne pas l'évoquer
est rédhibitoire.

Distinguer intervalle de confiance (autour de la droite, in-sample) et intervalle
de prédiction (autour de valeurs futures individuelles) — ils n'ont pas la
même largeur ni le même sens.

Une section régression trop courte fait perdre beaucoup de points (4 sur 20).
Inversement, le reste du rapport ne doit pas non plus être bâclé.

Absence de captures d'écran : le rapport doit illustrer l'application réelle,
pas se contenter de la décrire.

Ne pas donner de recommandations d'investissement : hors scope et juridiquement
sensible (conseil financier sans agrément).