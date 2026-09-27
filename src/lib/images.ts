"use client";

/**
 * Reduz fotos/assinaturas antes de gravar no banco.
 *
 * Motivo: as imagens viajam como `data:` (base64) dentro da própria linha.
 * Uma foto de celular de 4 MB viraria ~5,5 MB de texto — estoura o localStorage
 * e o limite de 1 MB por documento do Firestore. Redimensionando no cliente,
 * a foto fica em torno de 150–300 KB e o app continua rápido e sincronizável.
 */
export type CompressOptions = {
  /** maior lado da imagem, em pixels */
  maxSize?: number;
  quality?: number;
  mime?: "image/jpeg" | "image/png" | "image/webp";
};

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("imagem inválida"));
    img.src = src;
  });

export async function compressImage(file: File, options: CompressOptions = {}): Promise<string> {
  const { maxSize = 1280, quality = 0.72, mime = "image/jpeg" } = options;
  const original = await readAsDataUrl(file);

  // SVG e GIF (animado) não passam pelo canvas sem perder qualidade
  if (file.type === "image/svg+xml" || file.type === "image/gif") return original;

  try {
    const img = await loadImage(original);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    if (scale === 1 && original.length < 380_000) return original;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL(mime, quality);
    // se o resultado ficou maior que o original (ex.: PNG pequeno), mantém o original
    return out.length < original.length ? out : original;
  } catch {
    return original;
  }
}

/** Tamanho aproximado do texto em bytes (base64 conta como UTF-8 de 1 byte por char). */
export const dataUrlBytes = (dataUrl: string) => dataUrl.length;
