// Лёгкий uploader-заглушка: НЕ импортирует api и не падает при сборке.
// Если где-то используется — отдаёт временный blob-URL выбранного файла.

type Props = {
  accept?: string;
  label?: string;
  onUploaded: (url: string) => void;
};

export default function ImageUploader({
  accept = "image/*",
  label = "Upload",
  onUploaded,
}: Props) {
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Для предпросмотра отдаём blob-URL; можно потом подменить реальной загрузкой
    const url = URL.createObjectURL(file);
    onUploaded(url);
  }

  return (
    <label style={{ display: "inline-block", cursor: "pointer" }}>
      <input type="file" accept={accept} onChange={onChange} style={{ display: "none" }} />
      <span
        style={{
          padding: "8px 12px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#f8fafc",
        }}
      >
        {label}
      </span>
    </label>
  );
}
