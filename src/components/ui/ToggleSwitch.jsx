/**
 * ToggleSwitch — Shared premium toggle component
 * Linear / Stripe / Vercel aesthetic
 */
export default function ToggleSwitch({ checked, onChange, disabled = false, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        width: 36,
        height: 20,
        borderRadius: 10,
        border: "none",
        outline: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color 0.18s ease, box-shadow 0.18s ease",
        backgroundColor: disabled
          ? "#D1D5DB"
          : checked
          ? "#2563EB"
          : "#9CA3AF",
        boxShadow: checked && !disabled
          ? "0 0 0 0px rgba(37,99,235,0.3), inset 0 1px 2px rgba(0,0,0,0.1)"
          : "inset 0 1px 2px rgba(0,0,0,0.08)",
        padding: 0,
      }}
      onMouseEnter={e => {
        if (!disabled) e.currentTarget.style.boxShadow = checked
          ? "0 0 0 3px rgba(37,99,235,0.2), inset 0 1px 2px rgba(0,0,0,0.1)"
          : "0 0 0 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={e => {
        if (!disabled) e.currentTarget.style.boxShadow = checked
          ? "0 0 0 0px rgba(37,99,235,0.3), inset 0 1px 2px rgba(0,0,0,0.1)"
          : "inset 0 1px 2px rgba(0,0,0,0.08)";
      }}
      onFocus={e => {
        if (!disabled) e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.25)";
      }}
      onBlur={e => {
        if (!disabled) e.currentTarget.style.boxShadow = checked
          ? "0 0 0 0px rgba(37,99,235,0.3), inset 0 1px 2px rgba(0,0,0,0.1)"
          : "inset 0 1px 2px rgba(0,0,0,0.08)";
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 19 : 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          backgroundColor: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          transition: "left 0.18s ease",
        }}
      />
    </button>
  );
}