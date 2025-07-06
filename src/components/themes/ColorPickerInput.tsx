
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { hexToHsl, hslToHex, parseHslString, formatHslToString, type HslColor } from '@/lib/colorUtils';

interface ColorPickerInputProps {
  value: string; // HSL string e.g. "210 40% 96.1%"
  onChange: (hslString: string) => void;
}

export default function ColorPickerInput({ value, onChange }: ColorPickerInputProps) {
  const [hslString, setHslString] = useState(value);
  const [nativeColorPickerHex, setNativeColorPickerHex] = useState('#000000');
  const [swatchColor, setSwatchColor] = useState<string | null>(null);

  // Update internal states when the HSL prop 'value' changes (from react-hook-form)
  useEffect(() => {
    setHslString(value);
    const parsedHsl = parseHslString(value);
    if (parsedHsl) {
      setNativeColorPickerHex(hslToHex(parsedHsl.h, parsedHsl.s, parsedHsl.l));
      setSwatchColor(`hsl(${parsedHsl.h}, ${parsedHsl.s}%, ${parsedHsl.l}%)`);
    } else {
      setSwatchColor('transparent'); // Or some error indication color
    }
  }, [value]);

  const handleHslStringChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHslString = e.target.value;
    setHslString(newHslString); // Update local display immediately
    onChange(newHslString); // Propagate to react-hook-form

    // Update picker and swatch if the new string is valid
    const parsed = parseHslString(newHslString);
    if (parsed) {
      setNativeColorPickerHex(hslToHex(parsed.h, parsed.s, parsed.l));
      setSwatchColor(`hsl(${parsed.h}, ${parsed.s}%, ${parsed.l}%)`);
    } else {
      setSwatchColor('transparent');
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setNativeColorPickerHex(newHex);
    const newHslObj = hexToHsl(newHex);
    if (newHslObj) {
      const newHslString = formatHslToString(newHslObj);
      setHslString(newHslString);
      onChange(newHslString); // Propagate to react-hook-form
      setSwatchColor(`hsl(${newHslObj.h}, ${newHslObj.s}%, ${newHslObj.l}%)`);
    }
  };
  
  const swatchStyle: React.CSSProperties = swatchColor 
    ? { backgroundColor: swatchColor, width: '24px', height: '24px', borderRadius: '4px', border: '1px solid hsl(var(--border))' }
    : { backgroundColor: 'transparent', width: '24px', height: '24px', borderRadius: '4px', border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'hsl(var(--muted-foreground))' };


  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={nativeColorPickerHex}
        onChange={handleNativePickerChange}
        className="h-8 w-8 p-0 border-none rounded-md cursor-pointer"
        aria-label="Select color with native picker"
      />
      <div style={swatchStyle}>
        {!swatchColor || swatchColor === 'transparent' ? 'N/A' : null}
      </div>
      <Input
        type="text"
        value={hslString}
        onChange={handleHslStringChange}
        placeholder="e.g., 210 40% 96%"
        className="flex-grow"
        aria-label="HSL color string input"
      />
    </div>
  );
}
