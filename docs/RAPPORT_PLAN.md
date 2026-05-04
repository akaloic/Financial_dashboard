# docs/RAPPORT_PLAN.md — Plan détaillé du rapport écrit (15-20 pages)

## Informations générales

- **Format** : PDF, 15 à 20 pages (hors annexes)
- **Rendu** : 48h avant la soutenance
- **Police recommandée** : 11-12pt, interligne 1.15, marges 2.5 cm
- **Citations** : numérotées [1], [2]... avec bibliographie en fin de document

---

## Plan section par section

---

### Page de garde (~0,5 page)
- Titre : "Simulateur de Portefeuille Passif avec Régression Linéaire Prédictive"
- Noms des membres du groupe
- Master 2 MIAGE — Université Paris-Saclay
- UE Projet DATA — Encadrant : Nicolas LEGEAY
- Année universitaire 2025-2026
- URL de l'application déployée

---

### Résumé exécutif (~0,5 page)
**Points clés à couvrir :**
- Problématique : comment aider un investisseur particulier à simuler et analyser une stratégie passive ?
- Solution développée : application 3 modules (explorateur ETF, simulateur DCA, régression OLS)
- Stack technique (2-3 mots clés)
- Principal résultat : ce que montre l'analyse de régression sur CW8

---

### 1. Introduction (~1 page)

**Points clés :**
- Contexte : croissance de l'investissement passif en France (ETF, PEA)
- Intérêt pédagogique de combiner data engineering et analyse statistique
- Objectifs du projet
- Plan du rapport (1 phrase par section)

**Erreur à éviter** : ne pas confondre "investissement passif" (stratégie) et "fonds passif" (véhicule).

---

### 2. État de l'art (~1,5 pages)

**Points clés :**
- Définition du DCA et études académiques sur son efficacité
- Comparaison ETF passif vs fonds actif (lien avec le bonus +1,5 pt)
- Utilisation de la régression linéaire en finance : pertinence et limites connues
- Outils existants (JustETF, Portfolio Visualizer) et valeur ajoutée de notre application

---

### 3. Architecture technique (~2 pages)

**Points clés :**
- Diagramme d'architecture (reprendre le schéma ASCII de `docs/ARCHITECTURE.md`)
- Justification des choix technologiques (FastAPI vs Django, React vs Vue, PostgreSQL vs SQLite)
- Modèle de données : diagramme ERD ou table des entités
- Pipeline ETL yfinance → BDD → API → Frontend

**À inclure** :
- Capture d'écran du Swagger UI
- Extrait de code du modèle SQLAlchemy le plus représentatif

---

### 4. Module A — Explorateur d'ETF (~2 pages)

**Points clés :**
- Fonctionnalités implémentées (recherche, fiche, graphique, comparaison)
- Source des données : yfinance pour les cours, CSV pour les métadonnées
- Limites de yfinance pour les ETF européens (TER, indice non disponibles)
- Captures d'écran de l'interface

**À inclure** : graphique comparatif CW8 vs un autre ETF (normalisé base 100).

---

### 5. Module B — Simulateur DCA (~2,5 pages)

**Points clés :**
- Description de l'algorithme (reprendre le pseudo-code de `docs/MODULE_B.md`)
- Formule TER mensuel et justification
- Formule CAGR et interprétation
- Résultats d'une simulation exemple (CW8, 200€/mois, 10 ans)
- Comparaison avec le Livret A
- Résultats des tests pytest (tableau)

**À inclure** :
- Courbe portefeuille (avec TER vs sans TER vs Livret A)
- Tableau de résultats mensuels (extrait)
- Résultats des 5 tests pytest

---

### 6. Module C — Régression Linéaire OLS ← **Section la plus discriminante (4 pts)**

Cette section doit être **rigoureuse, critique et nuancée**. (~4 pages)

#### 6.1 Présentation du modèle (~0,5 page)
- Définition des variables X et Y
- Justification du choix d'une régression simple sur série temporelle
- Hypothèses classiques de l'OLS (linéarité, homoscédasticité, indépendance des erreurs, normalité)

#### 6.2 Résultats numériques (~1 page)

Présenter sous forme de tableau pour chaque ETF analysé :

| ETF | β0 | β1 | R² | p-value | Durbin-Watson | N |
|---|---|---|---|---|---|---|
| CW8.PA | ... | ... | ... | ... | ... | ... |
| ESE.PA | ... | ... | ... | ... | ... | ... |

- Interprétation de β1 : "le prix augmente de X € par jour de trading en moyenne sur la période"
- Interprétation de R² brute (sans jugement prématuré)

#### 6.3 Analyse des résidus (~1 page)
- Graphique des résidus (inclure la capture)
- Structure non-aléatoire des résidus → violation de l'hypothèse d'indépendance
- Durbin-Watson : valeur observée (~0,04), seuil théorique (~2), interprétation
- Conclusion : l'autocorrélation invalide les IC et p-values classiques

#### 6.4 Interprétation critique — Limites du modèle ← **Point discriminant**

Cette sous-section doit obligatoirement couvrir :

**a) R² élevé ≠ prédictibilité**
> Un R² de 0,97 signifie que 97 % de la variance du prix est "expliquée" par la tendance temporelle linéaire. Mais cette tendance est triviale : un actif en croissance sur 10 ans aura toujours un R² élevé avec une droite croissante. Ce R² ne mesure pas la capacité à prévoir les prix futurs, mais simplement l'adéquation d'une droite à une série déjà observée.

**b) Spurious Regression (régression fallacieuse)**
> Deux séries temporelles non-stationnaires (intégrées d'ordre 1) produisent mécaniquement un R² élevé et une p-value très faible, même sans aucun lien économique entre elles. Ce phénomène, formalisé par Granger & Newbold (1974), s'applique directement aux cours boursiers. Le test de Dickey-Fuller augmenté (ADF) confirmerait la non-stationnarité de nos séries.

**c) Autocorrélation des résidus**
> Le Durbin-Watson très faible (~0,04 sur CW8) indique une autocorrélation positive forte des résidus. Cela viole l'hypothèse d'indépendance de l'OLS, rendant les estimations des écarts-types biaisées. Les intervalles de confiance calculés sont donc trop étroits et les p-values trop faibles.

**d) Modèles alternatifs**
> Pour une analyse sérieuse de séries temporelles financières : modèles ARIMA, modèles log-linéaires (plus adaptés à la croissance exponentielle), modèles GARCH (variance conditionnelle), ou réseaux de neurones récurrents (LSTM). Ces approches dépassent le cadre pédagogique de ce projet.

**e) La projection est indicative**
> La projection à 12 mois extrapole mécaniquement la tendance historique. Elle ne prend pas en compte les chocs économiques, les changements de régime, l'inflation, ou la mean-reversion. Elle ne doit pas être interprétée comme une prévision.

#### 6.5 Conclusion du module (~0,5 page)
- Ce que le modèle confirme utilement : la tendance haussière long terme de l'ETF
- Ce qu'il ne peut pas faire : prédire les prix futurs avec fiabilité
- Valeur pédagogique : comprendre les limites de l'OLS appliqué aux séries temporelles

---

### 7. Qualité du code et tests (~1 page)

**Points clés :**
- Structure du projet (reprendre l'arborescence)
- Respect des bonnes pratiques : `.env`, `.gitignore`, docstrings
- Résultats des tests pytest (tableau avec nom du test, résultat, cas limite couvert)
- Couverture de code (si disponible via `pytest --cov`)

---

### 8. Conclusion (~1 page)

**Points clés :**
- Rappel des objectifs atteints
- Points forts du projet (vraies données, 3 modules fonctionnels, analyse critique)
- Limites et améliorations possibles (authentification JWT, export PDF, ARIMA, mobile)
- Bilan d'apprentissage (data engineering, statistiques, full-stack)

---

### Bibliographie

Format IEEE ou APA. Inclure au minimum :
- Documentation FastAPI, React, yfinance
- Article séminal sur la spurious regression : Granger, C.W.J. & Newbold, P. (1974). "Spurious regressions in econometrics". *Journal of Econometrics*, 2(2), 111-120.
- Source sur le DCA : référence académique ou institutionnelle (ex: AMF, BIS)
- Documentation statsmodels OLS

---

### Annexes (non comptées dans les 15-20 pages)

- Code source complet des fonctions clés (dca_engine.py, regression_engine.py)
- Résultats détaillés des simulations pour les 4 ETF
- Captures d'écran supplémentaires de l'interface

---

## Erreurs fréquentes à éviter dans le rapport

- Présenter R² comme preuve de fiabilité prédictive → perte garantie de points.
- Ne pas mentionner la spurious regression → c'est le piège classique attendu par l'encadrant.
- Confondre intervalle de confiance (de la droite) et intervalle de prédiction (valeur future).
- Sections trop courtes sur la régression → c'est 4 pts sur 20.
- Absence de captures d'écran → le rapport doit illustrer l'application réelle.
- Donner des recommandations d'investissement → hors scope et risqué légalement.
