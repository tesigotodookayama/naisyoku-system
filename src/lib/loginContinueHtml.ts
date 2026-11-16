/**
 * HTML body for a 200 login response that also sets the session cookie.
 * iOS / WebView often drops Set-Cookie on empty 302/303 responses, but keeps
 * cookies on a 200 with a document. The page then moves to the destination.
 */

function isRelativePath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function continueAfterLoginHtml(href: string, linkLabel: string): string {
  const path = isRelativePath(href) ? href : "/";
  const htmlPath = escapeHtml(path);
  const htmlLabel = escapeHtml(linkLabel);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${htmlPath}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ログインしました</title>
</head>
<body>
<p><a href="${htmlPath}">${htmlLabel}</a></p>
<script>location.replace(${JSON.stringify(path)});</script>
</body>
</html>`;
}
