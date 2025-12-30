import React, { forwardRef, useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '../../utils/cn';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: SelectOption[];
  label?: string;
  error?: string;
  fullWidth?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ options, label, error, fullWidth = false, className, onChange, icon, value, placeholder, id, name, required, disabled = false, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<string>(value || '');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const portalRef = useRef<HTMLUListElement>(null);
    const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const DROPDOWN_SPACING = 4;

    useEffect(() => {
      setSelectedValue(value || '');
    }, [value]);

    const updateDropdownCoordinates = useCallback(() => {
      if (buttonRef.current && portalRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const dropdownHeight = portalRef.current.offsetHeight;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;

        let newTop;

        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          newTop = buttonRect.top - dropdownHeight - DROPDOWN_SPACING;
        } else {
          newTop = buttonRect.bottom + DROPDOWN_SPACING;
        }

        setDropdownCoords({
          top: newTop,
          left: buttonRect.left,
          width: buttonRect.width,
        });
      }
    }, []);

    const handleToggle = useCallback(() => {
      setIsOpen(prev => {
        if (!prev) {
          setTimeout(() => updateDropdownCoordinates(), 0);
        }
        return !prev;
      });
    }, [updateDropdownCoordinates]);

    useEffect(() => {
      if (isOpen) {
        window.addEventListener('scroll', updateDropdownCoordinates, true);
        window.addEventListener('resize', updateDropdownCoordinates);
      } else {
        window.removeEventListener('scroll', updateDropdownCoordinates, true);
        window.removeEventListener('resize', updateDropdownCoordinates);
      }
      return () => {
        window.removeEventListener('scroll', updateDropdownCoordinates, true);
        window.removeEventListener('resize', updateDropdownCoordinates);
      };
    }, [isOpen, updateDropdownCoordinates]);

    const handleOptionClick = useCallback((optionValue: string) => {
      setSelectedValue(optionValue);
      setIsOpen(false);
      if (onChange) {
        onChange(optionValue);
      }
    }, [onChange]);

    const handleClickOutside = useCallback((event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        portalRef.current &&
        !portalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }, []);

    useEffect(() => {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [handleClickOutside]);

    const displayLabel = selectedValue
      ? options.find(option => option.value === selectedValue)?.label
      : placeholder;

    return (
      <div className={cn('relative', fullWidth && 'w-full', className)} ref={ref} {...props}>
        {label && (
          <label htmlFor={id} className="block text-sm font-black text-slate-700 mb-2 ml-1">
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}
        <button
          type="button"
          id={id}
          name={name}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={handleToggle}
          ref={buttonRef}
          disabled={disabled}
          className={cn(
            'flex items-center justify-between w-full py-3 px-4 text-base font-bold text-slate-700 bg-white/80 border border-slate-200 rounded-2xl shadow-sm cursor-pointer outline-none transition-all duration-300 backdrop-blur-sm',
            'hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5',
            'focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400',
            isOpen ? 'border-blue-400 ring-4 ring-blue-500/10' : '',
            error ? 'border-red-50 focus:ring-red-500/10 focus:border-red-400' : '',
            disabled && 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-100 shadow-none'
          )}
        >
          {icon && (
            <div className="text-slate-400 mr-3 flex items-center justify-center transition-colors">
              {icon}
            </div>
          )}
          <span className={cn('block truncate flex-1 text-left', !selectedValue && 'text-slate-400 font-medium')}>
            {displayLabel || placeholder}
          </span>
          <div className={cn('ml-2 text-slate-400 transition-transform duration-300', isOpen && 'rotate-180 text-blue-500')}>
            <ChevronDown size={20} />
          </div>
        </button>

        {error && (
          <p className="mt-2 text-xs text-red-600 font-black tracking-tight flex items-center px-1">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
            {error}
          </p>
        )}

        {isOpen && ReactDOM.createPortal(
          <ul
            ref={portalRef}
            role="listbox"
            aria-labelledby={id}
            style={dropdownCoords ? {
              top: dropdownCoords.top,
              left: dropdownCoords.left,
              width: dropdownCoords.width,
            } : {}}
            className={cn(
              'fixed z-[9999] bg-white/95 backdrop-blur-xl shadow-2xl shadow-blue-900/20 max-h-72 rounded-[1.5rem] py-2 text-base ring-1 ring-black/5 overflow-auto focus:outline-none sm:text-sm border border-white/50 animate-in fade-in slide-in-from-top-2 duration-200',
              !dropdownCoords && 'invisible'
            )}
          >
            {options.map(option => (
              <li
                key={option.value}
                id={`${id}-${option.value}`}
                role="option"
                aria-selected={option.value === selectedValue}
                onClick={() => !option.disabled && handleOptionClick(option.value)}
                className={cn(
                  'relative cursor-pointer select-none py-3 px-5 text-slate-600 transition-all duration-200 ease-in-out mx-2 my-1 rounded-xl flex items-center justify-between',
                  'hover:bg-blue-50 hover:text-blue-700 hover:pl-6',
                  option.value === selectedValue ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-200 hover:bg-blue-600 hover:text-white' : 'font-bold',
                  option.disabled && 'text-slate-300 cursor-not-allowed hover:bg-transparent hover:text-slate-300 hover:pl-5'
                )}
              >
                <span>{option.label}</span>
                {option.value === selectedValue && <CheckCircle2 size={16} className="text-white/80" />}
              </li>
            ))}
          </ul>,
          document.getElementById('dropdown-portal-root') as HTMLElement
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
