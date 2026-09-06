/** Git may check text out as CRLF; embedded source always uses canonical LF. */
export function canonicalSourceText(source: string): string {
  return source.replaceAll('\r\n', '\n');
}
