export function makeNameObjectMap<TName, T extends { readonly name: TName }>(
    ...objects: ({ readonly name: TName } & T)[]
) {
    return new Map<TName, T>(objects.map(object => [object.name, object]))
}
