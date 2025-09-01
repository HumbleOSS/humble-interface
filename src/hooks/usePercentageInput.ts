import { useState, useCallback } from 'react';

interface UsePercentageInputProps {
  initialValue?: string;
  maxValue?: number;
  minValue?: number;
}

export const usePercentageInput = ({ 
  initialValue = "0", 
  maxValue = 100, 
  minValue = 0 
}: UsePercentageInputProps = {}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const validateInput = useCallback((inputValue: string): boolean => {
    const numValue = parseFloat(inputValue);
    
    if (inputValue === "") {
      setError(null);
      return true;
    }
    
    if (isNaN(numValue)) {
      setError("Please enter a valid number");
      return false;
    }
    
    if (numValue < minValue) {
      setError(`Value must be at least ${minValue}`);
      return false;
    }
    
    if (numValue > maxValue) {
      setError(`Value must be at most ${maxValue}`);
      return false;
    }
    
    setError(null);
    return true;
  }, [maxValue, minValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (validateInput(inputValue)) {
      setValue(inputValue);
    }
  }, [validateInput]);

  const setPercentage = useCallback((percentage: number) => {
    const stringValue = percentage.toString();
    if (validateInput(stringValue)) {
      setValue(stringValue);
    }
  }, [validateInput]);

  const percentagePresets = [25, 50, 75, 100];

  return {
    value,
    error,
    handleInputChange,
    setPercentage,
    percentagePresets,
    isValid: !error && value !== "",
  };
}; 