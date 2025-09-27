import React from 'react';
// Corrected: Removed unused 'styles' import. It uses globals.
// import styles from './form.module.css';

// The type 'Option' is used here, so it's correct.
type Option = { value: string | number; label: string; };
interface DropdownProps extends React.ComponentPropsWithoutRef<'select'> { options: Option[]; }

// Corrected: The function now uses its props.
const Dropdown = React.forwardRef<HTMLSelectElement, DropdownProps>(({ options, ...props }, ref) => {
  return (
    <div className="dropdownWrapper"> {/* Using a plain string for class, defined in globals.css or form.module.css */}
      <select ref={ref} {...props} className="dropdownSelect">
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <div className="dropdownArrow" />
    </div>
  );
});

Dropdown.displayName = 'Dropdown';
export default Dropdown;