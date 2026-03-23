import QRCode from "qrcode";

/** PNG em base64 (data URL) para <img> ou transferência. */
export async function getConsultaQrDataUrl(absoluteConsultaUrl: string): Promise<string> {
  return QRCode.toDataURL(absoluteConsultaUrl, {
    width: 280,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
}
