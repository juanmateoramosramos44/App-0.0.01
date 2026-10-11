import React, { useState, useEffect, useRef } from 'react';

export interface DecimalInputProps {
  value: number | string | undefined | null;
  onChange: (val: string) => void;
  onBlur?: (val: number | string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  autoSelectOnZero?: boolean;
}

export const DecimalInput: React.FC<DecimalInputProps> = ({
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = '0.0',
  className = '',
  id,
  autoSelectOnZero = true
}) => {
  const [text, setText] = useState<string>(() => {
    if (disabled) return '0';
    if (value === undefined || value === null || value === '') return '';
    return String(value);
  });

  const isFocused = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<string | null>(null);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Sync from outside props when not actively focused or when disabled state changes
  useEffect(() => {
    if (disabled) {
      setText('0');
      return;
    }

    if (!isFocused.current) {
      const currentParsed = parseFloat(text.replace(',', '.'));
      const incomingParsed = typeof value === 'number' 
        ? value 
        : parseFloat(String(value || '').replace(',', '.'));

      if (!isNaN(currentParsed) && !isNaN(incomingParsed) && currentParsed === incomingParsed) {
        return;
      }

      const formatted = value === undefined || value === null || value === '' ? '' : String(value);
      setText(formatted);
    }
  }, [value, disabled]);

  const scheduleParentUpdate = (rawVal: string) => {
    pendingValueRef.current = rawVal;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // 130ms debounce: ultra-fast for zero perceived lag while avoiding parent context thrashing
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      pendingValueRef.current = null;
      onChange(rawVal);
    }, 130);
  };

  const flushParentUpdate = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      const pending = pendingValueRef.current;
      pendingValueRef.current = null;
      onChange(pending);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty string or lone negative sign
    if (raw === '' || raw === '-') {
      setText(raw);
      scheduleParentUpdate(raw);
      return;
    }

    // Allow lone separator or negative separator (e.g. "." or "," or "-." or "-,")
    if (raw === '.' || raw === ',' || raw === '-.' || raw === '-,') {
      setText(raw);
      scheduleParentUpdate(raw);
      return;
    }

    // Match valid numbers that can contain digits, optional leading minus, and at most one separator (either dot or comma)
    if (/^-?\d*[.,]?\d*$/.test(raw)) {
      const separatorCount = (raw.match(/[.,]/g) || []).length;
      if (separatorCount > 1) {
        return;
      }

      setText(raw);
      scheduleParentUpdate(raw);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    if (autoSelectOnZero && (text === '0' || text === '0.0' || text === '0,0')) {
      e.target.select();
    }
  };

  const handleBlur = () => {
    isFocused.current = false;
    flushParentUpdate();

    let clean = text.trim();

    if (clean.endsWith('.') || clean.endsWith(',')) {
      clean = clean.slice(0, -1);
    }

    if (clean === '' || clean === '-') {
      setText('');
      onChange('');
      if (onBlur) onBlur('');
      return;
    }

    const parsed = parseFloat(clean.replace(',', '.'));
    if (!isNaN(parsed)) {
      setText(clean);
      onChange(clean);
      if (onBlur) onBlur(clean);
    } else {
      setText('');
      onChange('');
      if (onBlur) onBlur('');
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      placeholder={placeholder}
      value={disabled ? '0' : text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
    />
  );
};
