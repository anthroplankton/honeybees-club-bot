import type { APIApplicationCommandPermission } from 'discord-api-types/v9'
import { ApplicationCommandPermissionType } from 'discord-api-types/v9'
import { JSONSchemaType } from 'ajv'
import { makeNameObjMap } from '../common/util'
import { USER_EXACT_PATTERN } from '../common/pattern'

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
    description: 'Map guild keys to an array of command permission objects.',
    type: 'object',
    required: [],
    additionalProperties: {
        description: 'Command permission objects.',
        type: 'array',
        items: {
            anyOf: [
                {
                    description: 'A Command permission object for a user.',
                    type: 'object',
                    required: ['id', 'type', 'permission'],
                    properties: {
                        id: {
                            description: 'The user ID.',
                            type: 'string',
                            pattern: USER_EXACT_PATTERN.source,
                        },
                        type: {
                            description: 'Specify the command permission type.',
                            type: 'string',
                            const: 'user',
                        },
                        permission: {
                            description: 'True to allow, false, to disallow.',
                            type: 'boolean',
                        },
                    },
                    additionalProperties: false,
                },
                {
                    description: 'A Command permission object for a role',
                    type: 'object',
                    required: ['name', 'type', 'permission'],
                    properties: {
                        name: {
                            description:
                                'A Command permission object for a user.',
                            type: 'string',
                        },
                        type: {
                            description: 'Specify the command permission type.',
                            type: 'string',
                            const: 'role',
                        },
                        permission: {
                            description: 'True to allow, false, to disallow.',
                            type: 'boolean',
                        },
                    },
                    additionalProperties: false,
                },
            ],
        },
    },
}

export const schema: JSONSchemaType<typeof data> = {
    description: 'Map guild keys to an array of command permission objects.',
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
    map: Map<string, CommandPermission[]>,
    roles: { name: string; id: string }[]
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
                    type: ApplicationCommandPermissionType.User,
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
                    type: ApplicationCommandPermissionType.Role,
                    permission,
                })
            }
        }
        apiMap.set(key, apiPermissions)
    }
    return apiMap
}
