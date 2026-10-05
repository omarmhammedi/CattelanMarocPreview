type FamilyEntry = {id:string; data:Record<string, any>};

/** Match the collection's native sort_order ASC, id ASC without loading its models. */
export function orderedModelFamilies<T extends FamilyEntry>(entries:T[]):T[] {
  return [...entries].sort((a,b) => {
    const aId=String(a.data.id || a.id), bId=String(b.data.id || b.id);
    return (Number(a.data.sort_order) || 0) - (Number(b.data.sort_order) || 0)
      || (aId < bId ? -1 : aId > bId ? 1 : 0);
  });
}
