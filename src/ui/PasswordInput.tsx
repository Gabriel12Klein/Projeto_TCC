import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { passwordRules } from '../../shared/password';
import './forms.css';

const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { visibilityLabel?: string }>(function PasswordInput({ visibilityLabel = 'senha', id, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return <span className="password-control">
    <input {...props} id={inputId} ref={ref} type={visible ? 'text' : 'password'} />
    <button type="button" disabled={props.disabled} aria-controls={inputId} aria-pressed={visible} aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${visibilityLabel}`} onClick={() => setVisible(value => !value)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
  </span>;
});
export default PasswordInput;

export function PasswordChecklist({ value }: { value: string }) {
  return <ul className="password-checklist" aria-label="Requisitos da senha">{passwordRules.map(rule => <li key={rule.label}><span aria-hidden="true">{rule.valid(value) ? '✓' : '○'}</span> {rule.label}<span className="sr-only">: {rule.valid(value) ? 'atendido' : 'pendente'}</span></li>)}</ul>;
}
