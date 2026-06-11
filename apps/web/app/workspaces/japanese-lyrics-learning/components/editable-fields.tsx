type EditableLearningFieldProps = {
  id: string;
  label: string;
  onChange: (value: string | null) => void;
  value: string | null;
};

export function EditableLearningField({
  id,
  label,
  onChange,
  value,
}: EditableLearningFieldProps) {
  return (
    <div className="line-edit-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder="Not generated"
        rows={3}
        value={value ?? ""}
      />
    </div>
  );
}

type EditableNotesFieldProps = {
  id: string;
  label: string;
  onChange: (value: string[]) => void;
  value: string[];
};

export function EditableNotesField({
  id,
  label,
  onChange,
  value,
}: EditableNotesFieldProps) {
  return (
    <div className="line-edit-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        onChange={(event) =>
          onChange(event.target.value ? event.target.value.split("\n") : [])
        }
        placeholder="Add one note per line"
        rows={4}
        value={value.join("\n")}
      />
      <p>One note per line.</p>
    </div>
  );
}
