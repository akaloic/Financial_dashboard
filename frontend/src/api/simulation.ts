import { apiFetch } from './client'
import type { SimulationRequest, SimulationResponse } from '../types'

export const runSimulation = (body: SimulationRequest) =>
  apiFetch<SimulationResponse>('/simulation/', { method: 'POST', body: JSON.stringify(body) })

export const getSimulation = (id: number) =>
  apiFetch<SimulationResponse>(`/simulation/${id}`)
