export function makeNameObjMap<TName, T extends { readonly name: TName }>(
    ...objs: ({ readonly name: TName } & T)[]
) {
    return new Map<TName, T>(objs.map(obj => [obj.name, obj]))
}
