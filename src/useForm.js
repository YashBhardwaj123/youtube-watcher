import React, { useState } from 'react';

// Define the FormComponent outside of the hook with premium styling
const FormComponent = ({ state, setState, label, type, id, name, autoComplete, theme }) => (
  <div className={`login-form ${theme}`}>
    <label htmlFor={id} className="login-label">
      {label}
      <input
        type={type}
        id={id}
        name={name}
        value={state}
        placeholder={label}
        onChange={(e) => setState(e.target.value)}
        className="login-input"
        autoComplete={autoComplete}
      />
    </label>
  </div>
);

export default function useForm(defaultState, label, type = 'text', id, name, autoComplete) {
  const [state, setState] = useState(defaultState);

  return [
    state,
    <FormComponent
      state={state}
      setState={setState}
      label={label}
      type={type}
      id={id}
      name={name}
      autoComplete={autoComplete}
      theme={document.body.className || 'light'} // Pass current theme
    />,
    setState
  ];
}