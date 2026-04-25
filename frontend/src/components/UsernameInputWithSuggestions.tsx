import React, { useState, useCallback, useRef } from "react";
import { checkUsername } from "../api";

interface UsernameInputWithSuggestionsProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (suggestion: string) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}

export default function UsernameInputWithSuggestions({
  value,
  onChange,
  onSelectSuggestion,
  disabled,
  hideLabel = false,
}: UsernameInputWithSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const checkIdRef = useRef(0);

  const validate = (val: string) => {
    if (!val) return null;
    if (val.length < 3) return "Минимум 3 символа";
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
    const newValue = e.target.value.toLowerCase();
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
    <div className="username-field" style={{ marginBottom: 20 }}>
      <div className="prefixed-input">
        <span className="prefix">bento.me/</span>
        <input
          type="text"
          className="input-prefixed"
          placeholder="ваш-логин"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          autoFocus
          autoComplete="off"
        />
      </div>
      {checking && <div className="checking-muted">Проверка...</div>}
      {error && <div className="error-message">{error}</div>}
      {suggestions.length > 0 && (
        <div className="suggestions-scroll">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => selectSuggestion(s)}
              className="suggestion-item"
            >
              @{s}
            </button>
          ))}
        </div>
      )}
      <style>{`
        .username-field {
          width: 100%;
        }
        .prefixed-input {
          display: flex;
          align-items: center;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface);
          padding: 0 12px;
        }
        .prefix {
          font-size: 16px;
          color: var(--muted);
          font-family: monospace;
          user-select: none;
        }
        .input-prefixed {
          flex: 1;
          border: none;
          padding: 14px 8px;
          font-size: 16px;
          outline: none;
          background: transparent;
        }
        .checking-muted {
          font-size: 12px;
          color: var(--muted);
          margin-top: 6px;
        }
        .error-message {
          font-size: 12px;
          color: #dc2626;
          margin-top: 6px;
        }
        .suggestions-scroll {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
          margin-top: 8px;
        }
        .suggestion-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          font-size: 14px;
        }
        .suggestion-item:hover {
          background: var(--accent);
        }
      `}</style>
    </div>
  );
}