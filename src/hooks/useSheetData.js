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
  const [tick, setTick] = useState(0);
  const normalizerRef = useRef(normalizer);

  useEffect(() => {
    normalizerRef.current = normalizer;
  });

  useEffect(() => {
    let alive = true;
    getSheetData(sheetName)
      .then((raw) => {
        if (!alive) return;
        const n = normalizerRef.current;
        setData(n ? n(raw) : raw);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setData([]);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [sheetName, tick]);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  return { data, loading, error, reload };
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
