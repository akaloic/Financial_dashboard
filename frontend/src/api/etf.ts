import { apiFetch } from './client'
import type { ETFResponse, HistoriqueResponse } from '../types'

export const searchETFs = (q: string, limit = 20) =>
  apiFetch<ETFResponse[]>(`/etf/?search=${encodeURIComponent(q)}&limit=${limit}`)

export const getETF = (ticker: string) =>
  apiFetch<ETFResponse>(`/etf/${encodeURIComponent(ticker)}`)

export const getHistorique = (ticker: string, period = '1y') =>
  apiFetch<HistoriqueResponse>(`/etf/${encodeURIComponent(ticker)}/historique?period=${period}`)
