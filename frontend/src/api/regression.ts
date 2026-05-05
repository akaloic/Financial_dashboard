import { apiFetch } from './client'
import type { RegressionRequest, RegressionResponse } from '../types'

export const runRegression = (body: RegressionRequest) =>
  apiFetch<RegressionResponse>('/regression/', { method: 'POST', body: JSON.stringify(body) })
