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

export const DecimalInputComponent: React.FC<DecimalInputProps> = ({
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
  const lastEmittedValueRef = useRef<string>(String(value ?? ''));

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
      lastEmittedValueRef.current = '0';
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
      lastEmittedValueRef.current = formatted;
    }
  }, [value, disabled]);

  const scheduleParentUpdate = (rawVal: string) => {
    pendingValueRef.current = rawVal;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // 280ms debounce: allows user to type multi-digit numbers smoothly without triggering heavy React tree re-renders
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      pendingValueRef.current = null;
      if (lastEmittedValueRef.current !== rawVal) {
        lastEmittedValueRef.current = rawVal;
        onChange(rawVal);
      }
    }, 280);
  };

  const flushParentUpdate = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingValueRef.current !== null) {
      const pending = pendingValueRef.current;
      pendingValueRef.current = null;
      if (lastEmittedValueRef.current !== pending) {
        lastEmittedValueRef.current = pending;
        onChange(pending);
      }
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
      if (lastEmittedValueRef.current !== '') {
        lastEmittedValueRef.current = '';
        onChange('');
      }
      if (onBlur) onBlur('');
      return;
    }

    const parsed = parseFloat(clean.replace(',', '.'));
    if (!isNaN(parsed)) {
      setText(clean);
      if (lastEmittedValueRef.current !== clean) {
        lastEmittedValueRef.current = clean;
        onChange(clean);
      }
      if (onBlur) onBlur(clean);
    } else {
      setText('');
      if (lastEmittedValueRef.current !== '') {
        lastEmittedValueRef.current = '';
        onChange('');
      }
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

export const DecimalInput = React.memo(DecimalInputComponent);
