import type { Client, Snowflake } from 'discord.js'
import type {
    APIApplicationCommandPermission,
    RESTPutAPIApplicationCommandsResult,
    RESTPutAPIGuildApplicationCommandsPermissionsJSONBody,
} from 'discord-api-types/v9'
import { Routes } from 'discord-api-types/v9'
import { SlashCommandBuilder as DjsSlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import fs from 'fs/promises'
import path from 'path'
import logger from './log'
import { SlashCommandBuilder, SelectMenuCover } from '../common/interactive'

if (process.env.CLIENTID === undefined) {
    throw new Error('There is no client id in environment.')
}
if (process.env.TOKEN === undefined) {
    throw new Error('There is no token in environment.')
}
const clientId = process.env.CLIENTID
const token = process.env.TOKEN

type CommandName = string
type CommandPermissionsKey = string

export async function getCommandNames() {
    const files = await fs.readdir(path.resolve(__dirname, '../commands'))
    return files
        .map(file => path.parse(file))
        .filter(
            parsedPath => parsedPath.ext == '.ts' || parsedPath.ext == '.js'
        )
        .map(parsedPath => parsedPath.name)
}

export async function getCommandModules(
    client?: Client,
    commandNames?: CommandName[]
) {
    commandNames = commandNames || (await getCommandNames())
    const commandModules = await Promise.all(
        commandNames.map(async commandName => {
            const commandModule = await import(
                path.join('../commands', commandName)
            )
            const { load } = commandModule
            if (client !== undefined && typeof load === 'function') {
                void (async () => {
                    await load(client)
                })().catch(err => client.emit('error', err))
            }
            return commandModule
        })
    )
    return commandModules
}

export async function getCommands(commandNames?: CommandName[]) {
    const commandModules = await getCommandModules(undefined, commandNames)
    return commandModules
        .map(Object.entries)
        .flat()
        .filter((entry): entry is [string, DjsSlashCommandBuilder] => {
            const [, obj] = entry
            return obj instanceof DjsSlashCommandBuilder
        })
        .map(([name, command]) => command.setName(command.name || name))
}

export async function getInteractive(
    client?: Client,
    commandNames?: CommandName[]
) {
    const commandModules = await getCommandModules(client, commandNames)
    const slashCommandBuilders: SlashCommandBuilder[] = []
    const selectMenuCovers: SelectMenuCover[] = []
    for (const [key, obj] of commandModules.map(Object.entries).flat()) {
        if (obj instanceof SlashCommandBuilder) {
            slashCommandBuilders.push(obj.setName(obj.name || key))
        } else if (obj instanceof SelectMenuCover) {
            selectMenuCovers.push(obj.setCustomId(obj.customId || key))
        }
    }
    return { slashCommandBuilders, selectMenuCovers }
}

export async function refresh(
    guildId: Snowflake,
    commandNames: CommandName[],
    mapPromise: Promise<
        Map<CommandPermissionsKey, APIApplicationCommandPermission[]>
    >
) {
    try {
        const [[commands, apiCommands], map] = await Promise.all([
            putCommands(guildId, commandNames),
            mapPromise,
        ])

        const commandNamePermissionsMap = new Map<
            CommandName,
            APIApplicationCommandPermission[]
        >()
        for (const command of commands) {
            if (!(command instanceof SlashCommandBuilder)) {
                continue
            }
            const permissions = command.permissionsKeys.map(key => {
                const permissions = map.get(key)
                if (permissions === undefined) {
                    throw new Error(
                        `The permissions of the key "${key}" was not be found`
                    )
                }
                return permissions
            })
            commandNamePermissionsMap.set(command.name, permissions.flat())
        }

        await putPermissions(guildId, apiCommands, commandNamePermissionsMap)
    } catch (err) {
        logger.error(err)
    }
}

async function putCommands(
    guildId: Snowflake,
    commandNames: string[]
): Promise<[DjsSlashCommandBuilder[], RESTPutAPIApplicationCommandsResult]> {
    const commands = await getCommands(commandNames)
    const commandJSONs = commands.map(command => command.toJSON())

    const rest = new REST({ version: '9' }).setToken(token)

    logger.info('Started refreshing application (/) commands.')

    const response = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        {
            body: commandJSONs,
        }
    )

    logger.debug(response)
    logger.info('Successfully refreshed application (/) commands.')

    return [commands, response as RESTPutAPIApplicationCommandsResult]
}

async function putPermissions(
    guildId: Snowflake,
    commands: RESTPutAPIApplicationCommandsResult,
    map: Map<CommandName, APIApplicationCommandPermission[]>
) {
    const body: RESTPutAPIGuildApplicationCommandsPermissionsJSONBody = []
    for (const command of commands) {
        const permissions = map.get(command.name)
        if (permissions === undefined) {
            continue
        }
        body.push({
            id: command.id,
            permissions,
        })
    }

    const rest = new REST({ version: '9' }).setToken(token)

    logger.info('Started edit application (/) commands permissions.')

    const response = await rest.put(
        Routes.guildApplicationCommandsPermissions(clientId, guildId),
        {
            body,
        }
    )

    logger.debug(response)
    logger.info('Successfully edited application (/) commands permissions.')
}
