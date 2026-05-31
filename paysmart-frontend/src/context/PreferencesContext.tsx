import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usersApi, type UserPreferences } from '../api';
import { useAuthStore } from '../store/auth';

const DEFAULTS: UserPreferences = {
  autoPayEnabled:   false,
  smsReminder:      true,
  pushNotification: true,
  partialPayment:   false,
};

interface PrefsContextValue {
  prefs:   UserPreferences;
  saving:  boolean;
  toggle:  (key: keyof UserPreferences) => void;
  set:     (patch: Partial<UserPreferences>) => void;
  reload:  () => void;
}

const PrefsContext = createContext<PrefsContextValue>({
  prefs:   DEFAULTS,
  saving:  false,
  toggle:  () => {},
  set:     () => {},
  reload:  () => {},
});

export const usePreferences = () => useContext(PrefsContext);

export default function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  const [prefs,  setPrefs]  = useState<UserPreferences>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    if (!accessToken) return;
    usersApi.getPreferences()
      .then(p => setPrefs({ ...DEFAULTS, ...p }))
      .catch(() => {});
  }, [accessToken]);

  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(async (patch: Partial<UserPreferences>) => {
    setSaving(true);
    try {
      const updated = await usersApi.updatePreferences(patch);
      setPrefs({ ...DEFAULTS, ...updated });
    } catch { /* silent — keep optimistic */ }
    finally { setSaving(false); }
  }, []);

  const toggle = useCallback((key: keyof UserPreferences) => {
    setPrefs(p => {
      const next = { ...p, [key]: !p[key] };
      save({ [key]: next[key] });
      return next;           // optimistic
    });
  }, [save]);

  const set = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs(p => {
      const next = { ...p, ...patch };
      save(patch);
      return next;
    });
  }, [save]);

  return (
    <PrefsContext.Provider value={{ prefs, saving, toggle, set, reload }}>
      {children}
    </PrefsContext.Provider>
  );
}
