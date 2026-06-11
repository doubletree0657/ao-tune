type TextPreviewProps = {
  emptyText: string;
  label: string;
  text: string | null;
};

export default function TextPreview({
  emptyText,
  label,
  text,
}: TextPreviewProps) {
  if (!text) {
    return (
      <div>
        <h4>{label}</h4>
        <p className="field-empty">{emptyText}</p>
      </div>
    );
  }

  const lines = text.split(/\r?\n/);
  const linePreview = lines.slice(0, 4).join("\n");
  const preview = linePreview.slice(0, 320);
  const isTruncated = lines.length > 4 || linePreview.length > 320;

  return (
    <div>
      <h4>{label}</h4>
      <p className="user-context">{preview}</p>
      <p className="context-count">
        {text.length.toLocaleString()} characters
        {isTruncated ? "; preview shortened" : ""}
      </p>
    </div>
  );
}
