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

  // Sync from outside props when not actively focused or when disabled state changes
  useEffect(() => {
    if (disabled) {
      setText('0');
      return;
    }

    if (!isFocused.current) {
      // If current text is already numerically equivalent to incoming value, preserve user's formatting (whether dot or comma)
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty string or lone negative sign
    if (raw === '' || raw === '-') {
      setText(raw);
      onChange(raw);
      return;
    }

    // Allow lone separator or negative separator (e.g. "." or "," or "-." or "-,")
    if (raw === '.' || raw === ',' || raw === '-.' || raw === '-,') {
      setText(raw);
      onChange(raw);
      return;
    }

    // Match valid numbers that can contain digits, optional leading minus, and at most one separator (either dot or comma)
    if (/^-?\d*[.,]?\d*$/.test(raw)) {
      // Prevent multiple separators (e.g. "12.3," or "12,3.4")
      const separatorCount = (raw.match(/[.,]/g) || []).length;
      if (separatorCount > 1) {
        return;
      }

      setText(raw);
      onChange(raw);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    // If the value is '0' or '0.0', auto-select so user can immediately type their number without backspacing
    if (autoSelectOnZero && (text === '0' || text === '0.0' || text === '0,0')) {
      e.target.select();
    }
  };

  const handleBlur = () => {
    isFocused.current = false;
    let clean = text.trim();

    // If ends with trailing dot or comma, clean it for final submission
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
