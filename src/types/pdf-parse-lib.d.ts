declare module "pdf-parse/lib/pdf-parse.js" {
  const pdfParse: (bytes: Buffer) => Promise<{ text: string }>;
  export default pdfParse;
}
