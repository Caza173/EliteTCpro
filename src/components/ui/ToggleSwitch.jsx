/**
 * ToggleSwitch — Flip toggle component
 * Compact 3D flip toggle with ON/OFF states
 */
export default function ToggleSwitch({ checked, onChange, disabled = false, id }) {
  return (
    <div className="checkbox-wrapper-10">
      <input
        type="checkbox"
        id={id}
        className="tgl tgl-flip"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <label
        htmlFor={id}
        className="tgl-btn"
        data-tg-off="OFF"
        data-tg-on="ON"
      />
    </div>
  );
}