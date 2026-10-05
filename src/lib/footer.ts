import {FOOTER_MENU} from './navigation-copy.mjs';
type MenuItem={label:string;url?:string;target?:string|null;children?:MenuItem[]};

/** Leaves out the links the main menu already lists in the same footer. */
export function secondaryLinks(menu: { url?: string }[], footer:MenuItem[]=FOOTER_MENU.items) {
  return footer.filter(link => !menu.some(item => item.url === link.url)).map(link=>({...link,href:link.url}));
}
