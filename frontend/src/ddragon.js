import { useEffect, useState } from 'react';
import axios from 'axios';

export const DEFAULT_DDRAGON_VERSION = '14.3.1';

export function useDDragonVersion() {
  const [version, setVersion] = useState(DEFAULT_DDRAGON_VERSION);

  useEffect(() => {
    let cancelled = false;

    axios
      .get('https://ddragon.leagueoflegends.com/api/versions.json')
      .then((res) => {
        if (!cancelled && Array.isArray(res.data) && res.data[0]) {
          setVersion(res.data[0]);
        }
      })
      .catch(() => {
        // Keep the bundled fallback version if Data Dragon is temporarily unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}
