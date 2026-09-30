/** Embeddable public development preview; admin/API/production keep EmDash policy. */
export function editorPreviewContentPolicy({
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
  // Hosted editors can introduce additional or opaque sandboxed ancestors.
  // Public pages in this private development environment intentionally permit
  // embedding by any ancestor. An explicit CSP also stops EmDash from adding
  // X-Frame-Options. Never apply this to admin/API/auth or signed CMS previews.
  return "object-src 'none'";
}
