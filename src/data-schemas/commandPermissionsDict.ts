import type { APIApplicationCommandPermission } from 'discord-api-types/v9'
import { ApplicationCommandPermissionType } from 'discord-api-types/v9'
import { JSONSchemaType } from 'ajv'
import { makeNameObjMap } from '../common/util'

export const enum CommandPermissionsKey {
    DEV = 'dev',
    NORMAL = 'normal',
}

export type CommandPermission = Readonly<
    | {
          id: string
          type: 'user'
          permission: boolean
      }
    | {
          name: string
          type: 'role'
          permission: boolean
      }
>

export const data: {
    readonly [K in CommandPermissionsKey]: Readonly<
        Partial<Record<string, CommandPermission[]>>
    >
} = { dev: {}, normal: {} }

const guildCommandPermissionsSchema: JSONSchemaType<
    typeof data[CommandPermissionsKey]
> = {
    type: 'object',
    required: [],
    additionalProperties: {
        type: 'array',
        items: {
            anyOf: [
                {
                    type: 'object',
                    required: ['id', 'type', 'permission'],
                    properties: {
                        id: { type: 'string', pattern: String.raw`\d{18}` },
                        type: { type: 'string', const: 'user' },
                        permission: { type: 'boolean' },
                    },
                    additionalProperties: false,
                },
                {
                    type: 'object',
                    required: ['name', 'type', 'permission'],
                    properties: {
                        name: { type: 'string' },
                        type: { type: 'string', const: 'role' },
                        permission: { type: 'boolean' },
                    },
                    additionalProperties: false,
                },
            ],
        },
    },
}

export const schema: JSONSchemaType<typeof data> = {
    type: 'object',
    required: ['dev', 'normal'] as CommandPermissionsKey[],
    properties: {
        dev: guildCommandPermissionsSchema,
        normal: guildCommandPermissionsSchema,
    },
    additionalProperties: false,
}

type Data = typeof data
export default Data

export function makeSpecifiedGuildCommandPermissionsMap(
    guildKey: string,
    data: Data
) {
    const map = new Map(
        Object.entries(data).map(([key, guildKeyCommandPermissionsDict]) => [
            key,
            guildKeyCommandPermissionsDict[guildKey] ?? [],
        ])
    )
    return map
}

export function toAPIApplicationCommandPermissionsMap(
    roles: { name: string; id: string }[],
    map: Map<string, CommandPermission[]>
) {
    const roleMap = makeNameObjMap(...roles)
    const apiMap = new Map<string, APIApplicationCommandPermission[]>()
    for (const [key, permissions] of map) {
        const apiPermissions: APIApplicationCommandPermission[] = []
        for (const permissionObj of permissions) {
            if (permissionObj.type == 'user') {
                const { id, permission } = permissionObj
                apiPermissions.push({
                    id,
                    type: ApplicationCommandPermissionType['User'],
                    permission,
                })
            } else if (permissionObj.type == 'role') {
                const { name, permission } = permissionObj
                const id = roleMap.get(name)?.id
                if (id === undefined) {
                    throw new Error(`No such role is named "${name}".`)
                }
                apiPermissions.push({
                    id,
                    type: ApplicationCommandPermissionType['Role'],
                    permission,
                })
            }
        }
        apiMap.set(key, apiPermissions)
    }
    return apiMap
}
