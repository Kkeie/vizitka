import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface SearchInputCardProps {
  initialLat: number;
  initialLng: number;
  onSelect: (lat: number, lng: number) => void;
  style?: React.CSSProperties;
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function SearchInputCard({ initialLat, initialLng, onSelect, style }: SearchInputCardProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ lat: number; lon: number; display_name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const searchAddress = useCallback(
    debounce(async (value: string) => {
      if (!value.trim()) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5&addressdetails=1&accept-language=ru`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(
            data.map((item: any) => ({
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
              display_name: item.display_name,
            }))
          );
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Ошибка геокодинга:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400),
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    searchAddress(val);
  };

  const handleSuggestionClick = (sug: { lat: number; lon: number; display_name: string }) => {
    onSelect(sug.lat, sug.lon);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      onSelect(suggestions[0].lat, suggestions[0].lon);
    }
  };

  return (
    <div
      ref={cardRef}
      style={{
        background: '#1a1a1a',
        borderRadius: '6px',
        padding: '8px',
        width: '280px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        ...style,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <input
          type="text"
          placeholder="Введите адрес..."
          value={query}
          onChange={handleInputChange}
          style={{
            flex: 1,
            background: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '13px',
            color: '#fff',
            outline: 'none',
          }}
          autoFocus
        />
        <button
          type="submit"
          style={{
            background: '#000',
            border: 'none',
            borderRadius: '4px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#000';
            e.currentTarget.style.color = '#fff';
          }}
        >
          ✈️
        </button>
      </form>
      {loading && <div style={{ color: '#aaa', fontSize: '12px', padding: '4px' }}>Поиск...</div>}
      {suggestions.length > 0 && (
        <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
          {suggestions.slice(0, 3).map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(sug)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '6px 8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#ddd',
                borderBottom: '1px solid #333',
              }}
            >
              {sug.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}