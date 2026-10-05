type CursorPage<T> = {entries:T[]; nextCursor?:string; hasMore?:boolean; error?:Error};

/** Follow native cursors; fail visibly on malformed or cyclic pagination. */
export async function collectPages<T>(
  fetchPage:(cursor?:string)=>Promise<CursorPage<T>>,
  maxPages=1000,
):Promise<T[]> {
  const entries:T[]=[];
  const seen=new Set<string>();
  let cursor:string|undefined;
  for(let page=0;page<maxPages;page++) {
    const result=await fetchPage(cursor);
    if(result.error) throw result.error;
    entries.push(...result.entries);
    if(!result.nextCursor) {
      if(result.hasMore) throw new Error('Le CMS annonce une suite sans curseur de pagination.');
      return entries;
    }
    if(seen.has(result.nextCursor)) throw new Error('Le CMS a renvoyé un curseur de pagination déjà lu.');
    seen.add(result.nextCursor);
    cursor=result.nextCursor;
  }
  throw new Error('La pagination du CMS dépasse la limite de sécurité.');
}
