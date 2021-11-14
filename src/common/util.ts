export function makeNameObjMap<TName, T extends { name: TName }>(
    ...objs: ({ name: TName } & T)[]
) {
    const map = new Map<TName, T>()
    for (const obj of objs) {
        map.set(obj.name, obj)
    }
    return map
}
