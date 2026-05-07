import React, { useState, useCallback, useRef } from 'react';
import { checkUsername } from '../api';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (suggestion: string) => void;
  disabled?: boolean;
}

export default function UsernameInput({ value, onChange, onSelectSuggestion, disabled }: UsernameInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const checkIdRef = useRef(0);

  const validate = (val: string) => {
    if (!val) return null;
    if (val.length < 3) return 'Минимум 3 символа';
    return null;
  };

  const check = useCallback(async (val: string) => {
    const validationError = validate(val);
    if (validationError) {
      setError(validationError);
      setSuggestions([]);
      return;
    }
    setError(null);
    setChecking(true);

    const currentCheckId = ++checkIdRef.current;
    try {
      const result = await checkUsername(val);
      if (currentCheckId !== checkIdRef.current) return;
      if (!result.available && result.suggestions) {
        setSuggestions(result.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (currentCheckId === checkIdRef.current) {
        setChecking(false);
      }
    }
  }, []);

  const handleBlur = () => {
    if (value) check(value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (newValue.length >= 3) {
      timeoutRef.current = setTimeout(() => check(newValue), 500);
    } else {
      setSuggestions([]);
      setError(null);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setSuggestions([]);
    setError(null);
    if (onSelectSuggestion) onSelectSuggestion(suggestion);
  };

  return (
    <div className="field" style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
        Имя пользователя
      </label>
      <input
        className="input"
        placeholder="Придумайте имя пользователя"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        required
        minLength={3}
        autoFocus
        style={{ fontSize: 15 }}
        autoComplete="off"
      />
      {checking && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Проверка...</div>}
      {error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>{error}</div>}
      {suggestions.length > 0 && (
        <div
          style={{
            marginTop: 8,
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
          }}
        >
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => selectSuggestion(s)}
              className="btn btn-ghost"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: 14,
                borderBottom: '1px solid var(--border)',
              }}
            >
              @{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}