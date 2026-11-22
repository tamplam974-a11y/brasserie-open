/** Télécharge un texte comme fichier (le BOM aide Excel à lire l’UTF-8 des CSV). */
export function downloadText(content: string, filename: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([type.startsWith('text/csv') ? `\uFEFF${content}` : content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
