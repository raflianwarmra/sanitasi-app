import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getSheetData, SHEET_GIDS,
  normalizeProvinsi, normalizeKabkot, normalizeKelembagaan,
  normalizeInfra, normalizeLog, normalizeTeam,
} from '../lib/sheets';

export function useSheetData(sheetName, normalizer) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const normalizerRef = useRef(normalizer);
  normalizerRef.current = normalizer;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getSheetData(sheetName);
      const n = normalizerRef.current;
      setData(n ? n(raw) : raw);
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

const ipalNormalizer = (r) => normalizeInfra(r, 'IPAL');
const ipltNormalizer = (r) => normalizeInfra(r, 'IPLT');

export function useProvinsi()    { return useSheetData(SHEET_GIDS.PROVINSI, normalizeProvinsi); }
export function useKabkot()      { return useSheetData(SHEET_GIDS.KABKOT, normalizeKabkot); }
export function useKelembagaan() { return useSheetData(SHEET_GIDS.KELEMBAGAAN, normalizeKelembagaan); }
export function useIPAL()        { return useSheetData(SHEET_GIDS.IPAL, ipalNormalizer); }
export function useIPLT()        { return useSheetData(SHEET_GIDS.IPLT, ipltNormalizer); }
export function useLog()         { return useSheetData(SHEET_GIDS.LOG, normalizeLog); }
export function useTeam()        { return useSheetData(SHEET_GIDS.TEAM, normalizeTeam); }
