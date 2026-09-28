/** Frame allowance for the public site in this Codespace's VS Code editor. */
export function editorPreviewFramePolicy({
  development,
  editorOrigin,
  cmsPreview,
}: {
  development: boolean;
  editorOrigin: string | undefined;
  cmsPreview: boolean;
}): string | undefined {
  if (!development || cmsPreview || !editorOrigin
    || !/^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)*\.github\.dev$/.test(editorOrigin)) return;
  // The editor is the top-level ancestor; Simple Browser adds a VS Code webview
  // between the editor and the page. Both must be permitted by frame-ancestors.
  return `frame-ancestors 'self' ${editorOrigin} https://*.vscode-cdn.net`;
}
