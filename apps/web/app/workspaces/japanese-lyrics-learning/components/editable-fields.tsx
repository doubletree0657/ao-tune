import styles from "../workspace.module.css";

type EditableLearningFieldProps = {
  helperText?: string;
  id: string;
  isWide?: boolean;
  label: string;
  onChange: (value: string | null) => void;
  rows?: number;
  value: string | null;
};

export function EditableLearningField({
  helperText,
  id,
  isWide = false,
  label,
  onChange,
  rows = 4,
  value,
}: EditableLearningFieldProps) {
  return (
    <div className={`${styles.field} ${isWide ? styles.fieldWide : ""}`}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder="Not generated"
        rows={rows}
        value={value ?? ""}
      />
      {helperText ? <p className={styles.fieldHelp}>{helperText}</p> : null}
    </div>
  );
}

type EditableNotesFieldProps = {
  id: string;
  isWide?: boolean;
  label: string;
  onChange: (value: string[]) => void;
  value: string[];
};

export function EditableNotesField({
  id,
  isWide = false,
  label,
  onChange,
  value,
}: EditableNotesFieldProps) {
  return (
    <div className={`${styles.field} ${isWide ? styles.fieldWide : ""}`}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        onChange={(event) =>
          onChange(event.target.value ? event.target.value.split("\n") : [])
        }
        placeholder="Add one note per line"
        rows={5}
        value={value.join("\n")}
      />
      <p className={styles.fieldHelp}>One note per line.</p>
    </div>
  );
}
