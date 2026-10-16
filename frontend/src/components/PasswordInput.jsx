import { useState } from "react";
import { IconEye, IconEyeOff } from "./icons";

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  required = false,
  className = "",
  id,
  name = "password",
  autoComplete = "current-password",
  disabled = false,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="password-input-wrap">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className={className}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
      >
        {show ? <IconEyeOff width={20} height={20} /> : <IconEye width={20} height={20} />}
      </button>
    </div>
  );
}
