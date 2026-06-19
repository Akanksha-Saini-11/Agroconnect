import React, { useState, useRef, useEffect } from "react";
import "./StrictSelect.css";

export default function StrictSelect({ value, onChange, options, placeholder, disabled, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => {
    if (typeof opt === 'string') return opt === value;
    return opt.value === value;
  });

  const displayValue = selectedOption 
    ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label)
    : placeholder;

  return (
    <div className={`strict-select-container ${className || ""}`} ref={containerRef}>
      <div 
        className={`strict-select-trigger ${disabled ? "disabled" : ""} ${isOpen ? "open" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="truncate">{displayValue}</span>
        <span className="strict-select-chevron"></span>
      </div>
      {isOpen && (
        <ul className="strict-select-options">
          {placeholder && (
            <li className="placeholder-option" onClick={() => { onChange(""); setIsOpen(false); }}>
              {placeholder}
            </li>
          )}
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt : opt.label;
            return (
              <li 
                key={val} 
                className={value === val ? "selected" : ""}
                onClick={() => { onChange(val); setIsOpen(false); }}
              >
                {lbl}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
