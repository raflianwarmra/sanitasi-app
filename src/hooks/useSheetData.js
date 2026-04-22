import { useState, useEffect, useCallback } from 'react';
import {
  getSheetData, SHEET_GIDS,
  normalizeProvinsi, normalizeKabkot, normalizeInfra, normalizeLog,
} from '../lib/sheets';

export function useSheetData(sheetName, normalizer) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getSheetData(sheetName);
      setData(normalizer ? normalizer(raw) : raw);
    } catch (e) {
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [sheetName]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

export function useProvinsi()  { return useSheetData(SHEET_GIDS.PROVINSI, normalizeProvinsi); }
export function useKabkot()    { return useSheetData(SHEET_GIDS.KABKOT, normalizeKabkot);    }
export function useIPAL()      { return useSheetData(SHEET_GIDS.IPAL, (r) => normalizeInfra(r, 'IPAL')); }
export function useIPLT()      { return useSheetData(SHEET_GIDS.IPLT, (r) => normalizeInfra(r, 'IPLT')); }
export function useLog()       { return useSheetData(SHEET_GIDS.LOG, normalizeLog);           }
