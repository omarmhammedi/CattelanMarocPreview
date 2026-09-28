import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Read-only browser enforcement checks against the running development server.
// HTTPS editor/webview origins are fixtures; app responses come from localhost.
// This does not authenticate to GitHub or test its private-port cookie handling.
const codespace = process.env.CODESPACE_NAME;
assert.match(codespace ?? '', /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Run this test in the Codespace whose development server is on port 4321.');
const editor = `https://${codespace}.github.dev`;
const site = `https://${codespace}-4321.app.github.dev`;
const cdnWebview = 'https://cattelan-fixture.vscode-cdn.net';
const hostedWebview = 'https://cattelan-fixture.vscode-webview.net';
const frameStyle = '<style>body{margin:0}iframe{border:0;width:100%;height:100vh}</style>';
const cases = [
  { name: 'cdn-webview-allowed', parent: editor, webview: cdnWebview, path: '/', allowed: true },
  { name: 'hosted-webview-allowed', parent: editor, webview: hostedWebview, path: '/', allowed: true },
  { name: 'unknown-webview-allowed', parent: editor, webview: 'https://unrelated-webview.example.test', path: '/', allowed: true },
  { name: 'other-editor-allowed', parent: 'https://unrelated-codespace.github.dev', webview: hostedWebview, path: '/', allowed: true },
  { name: 'opaque-ancestor-allowed', parent: editor, webview: hostedWebview, path: '/', allowed: true, opaque: true },
  { name: 'model-navigation-allowed', parent: editor, webview: hostedWebview, path: '/collections/tables/', allowed: true },
  { name: 'admin-protected', parent: editor, webview: hostedWebview, path: '/_emdash/admin/login', allowed: false },
  { name: 'cms-preview-protected', parent: editor, webview: hostedWebview, path: '/?_preview=invalid', allowed: false },
];

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const passes = [];
try {
  for (const { name, parent, webview, path, allowed, opaque = false } of cases) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      serviceWorkers: 'block',
    });
    const writes = [];
    const documentResponses = [];
    try {
      await context.routeWebSocket('**/*', socket => socket.close());
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method())) {
          writes.push(request.method());
          return route.abort();
        }
        if (url.origin === parent) {
          const sandbox = opaque ? ' sandbox="allow-scripts"' : '';
          return route.fulfill({ contentType: 'text/html', body: `${frameStyle}<iframe${sandbox} src="${webview}/"></iframe>` });
        }
        if (url.origin === webview) {
          return route.fulfill({ contentType: 'text/html', body: `${frameStyle}<iframe name="website" sandbox="allow-scripts allow-forms allow-same-origin allow-downloads" src="${site}${path}"></iframe>` });
        }
        if (url.origin === site) {
          // Media is unnecessary for deciding whether Chromium accepts the frame.
          if (['image', 'media', 'font'].includes(request.resourceType())) return route.abort();
          const response = await route.fetch({
            url: `http://localhost:4321${url.pathname}${url.search}`,
            maxRedirects: 0,
          });
          if (request.resourceType() === 'document') {
            const headers = response.headers();
            documentResponses.push({
              status: response.status(),
              policy: headers['content-security-policy'],
              xFrameOptions: headers['x-frame-options'],
            });
          }
          return route.fulfill({ response });
        }
        return route.abort();
      });

      const page = await context.newPage();
      const website = page.frameLocator('iframe').frameLocator('iframe');
      if (allowed) {
        await page.goto(parent, { waitUntil: 'domcontentloaded' });
        // Framing acceptance is independent of scripts/styles in an opaque frame.
        await website.locator('h1').first().waitFor({ state: 'attached', timeout: 30_000 });
        assert.deepEqual(documentResponses, [{
          status: 200,
          policy: "object-src 'none'",
          xFrameOptions: undefined,
        }], `${name}: expected the public GET framing policy`);
        if (name === 'model-navigation-allowed') {
          await website.locator('.model-card a[href="/modeles/skorpio/"]').click();
          await website.locator('.model-detail h1').waitFor({state:'visible'});
          assert.equal(await website.locator('.model-detail h1').textContent(), 'Skorpio');
          assert.equal(context.pages().length, 1, 'Model discovery must remain inside the same preview tab.');
          assert.equal(documentResponses.at(-1)?.status, 200);
          assert.equal(documentResponses.at(-1)?.policy, "object-src 'none'");
        }
        if (opaque) {
          assert.equal(await website.locator('html').evaluate(() => globalThis.origin), 'null',
            `${name}: the ancestor sandbox must give the page an opaque origin`);
        }
      } else {
        await Promise.all([
          page.waitForEvent('console', {
            predicate: message => message.text().includes(site)
              && /frame-ancestors|X-Frame-Options/.test(message.text()),
            timeout: 15_000,
          }),
          page.goto(parent, { waitUntil: 'domcontentloaded' }),
        ]);
        assert.equal(await website.locator('h1').count(), 0, `${name}: blocked content rendered`);
      }
      assert.deepEqual(writes, [], `${name}: a request attempted to modify server state`);
      passes.push(name);
      console.log(`PASS ${name}`);
    } finally {
      // App assets can still be fetching after the frame assertion completes.
      await context.unrouteAll({ behavior: 'ignoreErrors' });
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({
  passes,
  transport: 'Simulated HTTPS editor/webview origins; real localhost app responses; GET/HEAD only; no GitHub authenticated session',
}));
