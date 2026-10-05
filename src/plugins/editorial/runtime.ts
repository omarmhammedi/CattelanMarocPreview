import { ContentSaveRejectedError, definePlugin } from 'emdash';
import { dataProblem, publicationProblem, protectsPublicRoute, record } from './guards.ts';

export function createPlugin() {
  return definePlugin({
    id: 'cattelan-editorial', version: '0.1.0', capabilities: ['content:read', 'content:write', 'hooks.content-policy:register'],
    admin: {
      entry: '/src/plugins/editorial/admin.tsx',
      pages: [{ path: '/site', label: 'Piloter le site', icon: 'browser' }, { path: '/settings', label: 'Réglages du site', icon: 'sliders' }],
      widgets: [{ id: 'editorial-tasks', size: 'full', title: 'Publier sur Cattelan' }],
      fieldWidgets: [
        { name: 'route-identity', label: 'Identité de page protégée', fieldTypes: ['select', 'string'] },
        { name: 'editorial-copy', label: 'Textes du site par tâche', fieldTypes: ['json'] },
        { name: 'retired-reference', label: 'Archive sans effet sur le site', fieldTypes: ['string', 'text', 'url'] },
        { name: 'private-pdf', label: 'PDF privé du catalogue', fieldTypes: ['string'] },
      ],
    },
    hooks: {
      'content:beforeSave': { errorPolicy: 'abort', handler: async (event, ctx) => {
        const content = ctx.content;
        if (!content) throw new ContentSaveRejectedError('Le contrôle des contenus est indisponible. Réessayez sans modifier les identifiants.');
        if (event.collection === 'site_content' && event.isNew) {
          const existing = await content.list('site_content', { limit: 1 });
          if (existing.items.length) throw new ContentSaveRejectedError('Une configuration du site existe déjà. Modifiez l’entrée « global » depuis Réglages du site.');
        }
        const previous = event.collection === 'pages' && event.id ? await content.get('pages', event.id) : null;
        const issue = dataProblem(event.collection, event.content, previous?.data);
        if (issue) throw new ContentSaveRejectedError(issue);
      } },
      'content:beforePublish': { errorPolicy: 'abort', handler: async event => {
        const reason = publicationProblem(event.collection, event.content);
        if (reason) return { cancel: true, reason };
      } },
      'content:beforeSchedule': { errorPolicy: 'abort', handler: async event => {
        const reason = publicationProblem(event.collection, event.content);
        if (reason) return { cancel: true, reason };
      } },
      'content:beforeDelete': { errorPolicy: 'abort', handler: async (event, ctx) => {
        if (event.collection !== 'pages' && event.collection !== 'site_content') return;
        if (!ctx.content) return false;
        const item = await ctx.content.get(event.collection, event.id);
        if (protectsPublicRoute(event.collection, item ? record(item) : null)) return false;
      } },
      'content:beforeUnpublish': { errorPolicy: 'abort', handler: async event => {
        if (protectsPublicRoute(event.collection, event.content)) return { cancel: true, reason: 'Cette entrée alimente un parcours permanent du site. Enregistrez et prévisualisez un brouillon pour la modifier sans interrompre le site.' };
      } },
    },
  });
}
