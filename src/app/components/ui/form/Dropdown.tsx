import React from 'react';
import styles from './form.module.css'; // Corrected import path
// ... rest of the code is the same
type Option = { value: string | number; label: string; };
interface DropdownProps extends React.ComponentPropsWithoutRef<'select'> { options: Option[]; }
const Dropdown = React.forwardRef<HTMLSelectElement, DropdownProps>(({ options, ...props }, ref) => { /* ... */ });
Dropdown.displayName = 'Dropdown';
export default Dropdown;