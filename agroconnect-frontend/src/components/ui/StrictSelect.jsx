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

  const displayValue = value || placeholder;

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
          {options.map((opt) => (
            <li 
              key={opt} 
              className={value === opt ? "selected" : ""}
              onClick={() => { onChange(opt); setIsOpen(false); }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
