import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Table } from '@coffee/shared'

interface UseTableResult {
  table: Table | null
  loading: boolean
  error: string | null
  /** True when a ?table=<token> param is present — hides the table picker and auto-assigns. */
  isTokenMode: boolean
}

export function useTable(): UseTableResult {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('table')
  const [table, setTable] = useState<Table | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/v1/tables/${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json: { data?: Table; error?: string }) => {
        if (cancelled) return
        if (json.data) setTable(json.data)
        else setError('Invalid table QR code. Please ask a staff member for help.')
      })
      .catch(() => { if (!cancelled) setError('Could not connect. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token])

  return { table, loading, error, isTokenMode: token !== null }
}
