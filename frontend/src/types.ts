export interface ETFResponse {
  id: number;
  ticker: string;
  nom?: string;
  indice?: string;
  gestionnaire?: string;
  ter?: number;
  eligible_pea?: boolean;
  devise?: string;
  derniere_date_cours?: string;
}

export interface HistoriquePoint {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  adj_close?: number;
  volume?: number;
}

export interface HistoriqueResponse {
  ticker: string;
  period: string;
  nb_points: number;
  data: HistoriquePoint[];
}

export interface SimulationRequest {
  etf_ticker: string;
  capital_initial: number;
  versement_mensuel: number;
  date_debut: string;
  date_fin: string;
  ter: number;
}

export interface ResultatMensuel {
  mois: number;
  date: string;
  prix_cloture: number;
  parts_achetees: number;
  parts_cumulees: number;
  valeur_brute: number;
  valeur_nette: number;
  capital_investi: number;
}

export interface MetriquesRisque {
  volatilite_annualisee: number;
  sharpe: number;
  sortino: number;
  max_drawdown: number;
  meilleur_mois: number;
  pire_mois: number;
  profil_risque: string;
  note: string;
}

export interface SimulationResponse {
  simulation_id: number;
  etf_ticker: string;
  nb_mois: number;
  capital_total_investi: number;
  valeur_finale_brute: number;
  valeur_finale_nette: number;
  gain_net_euros: number;
  gain_net_pct: number;
  cagr_brut: number;
  cagr_net: number;
  valeur_livret_a: number;
  metriques_risque: MetriquesRisque;
  resultats_mensuels: ResultatMensuel[];
}

export interface RegressionRequest {
  etf_ticker: string;
  date_debut: string;
  date_fin: string;
}

export interface HistoriqueRegressionPoint {
  date: string;
  adj_close: number;
  y_pred: number;
  ic_low: number;
  ic_high: number;
  residue: number;
}

export interface ProjectionPoint {
  date: string;
  y_pred: number;
  ic_low: number;
  ic_high: number;
}

export interface Interpretation {
  avertissement: string;
  tendance_journaliere_euros: number;
  projection_12m_disclaimer: string;
}

export interface RegressionResponse {
  regression_id: number;
  etf_ticker: string;
  periode_debut: string;
  periode_fin: string;
  beta0: number;
  beta1: number;
  r_squared: number;
  p_value: number;
  std_error: number;
  durbin_watson?: number;
  nb_observations: number;
  interpretation: Interpretation;
  donnees_historiques: HistoriqueRegressionPoint[];
  projection: ProjectionPoint[];
}

export type TabId = 'explorer' | 'dca' | 'ols' | 'doc';
