import { definePlugin } from 'emdash';
import { renderedSeo } from '../../lib/seo-render-context';
import { structuredDataContributions } from '../../lib/structured-data';

export function createPlugin() {
  return definePlugin({
    id: 'cattelan-seo', version: '0.1.0', capabilities: [],
    hooks: {
      'page:metadata': async ({page}) => {
        // EmDash has applied the native SEO panel to page at this point. The
        // remaining schema fields come from the same entry as the body, with
        // no extra CMS/media hydration and no second preview lookup.
        const {site, entry} = renderedSeo(page);
        return structuredDataContributions(page, site, entry);
      },
    },
  });
}
