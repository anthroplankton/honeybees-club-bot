import type { Client, Snowflake } from 'discord.js'
import type {
    APIApplicationCommandPermission,
    RESTPutAPIApplicationCommandsResult,
    RESTPutAPIGuildApplicationCommandsPermissionsJSONBody,
} from 'discord-api-types/v9'
import type CommandPermissionsDict from '../data-schemas/command-permissions-dict'
import { ApplicationCommandType, Routes } from 'discord-api-types/v9'
import {
    SlashCommandBuilder as DjsSlashCommandBuilder,
    ContextMenuCommandBuilder as DjsContextMenuCommandBuilder,
} from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import fs from 'fs/promises'
import path from 'path/posix'
import logger from './log'
import {
    SlashCommandBuilder,
    ContextMenuCommandBuilder,
    ButtonCover,
    SelectMenuCover,
} from '../common/interactive'
import {
    makeSpecifiedGuildCommandPermissionsMap,
    toAPIApplicationCommandPermissionsMap,
} from '../data-schemas/command-permissions-dict'

if (process.env.CLIENTID === undefined) {
    throw new Error('There is no client id in environment.')
}
if (process.env.TOKEN === undefined) {
    throw new Error('There is no token in environment.')
}
const clientId = process.env.CLIENTID
const token = process.env.TOKEN

type CommandName = string
type DjsCommandBuilder = DjsSlashCommandBuilder | DjsContextMenuCommandBuilder

export async function getCommandNames() {
    const files = await fs.readdir(path.resolve(__dirname, '../commands'))
    return files
        .map(file => path.parse(file))
        .filter(
            parsedPath => parsedPath.ext == '.ts' || parsedPath.ext == '.js'
        )
        .map(parsedPath => parsedPath.name)
}

export async function loadCommandModules(
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
                Promise.resolve(load(client)).catch(err =>
                    client.emit('error', err)
                )
            }
            return commandModule
        })
    )
    return commandModules
}

export async function loadCommands(commandNames?: CommandName[]) {
    const commandModules = await loadCommandModules(undefined, commandNames)
    return commandModules
        .map(Object.entries)
        .flat()
        .filter((entry): entry is [string, DjsCommandBuilder] => {
            const [, obj] = entry
            return (
                obj instanceof DjsSlashCommandBuilder ||
                obj instanceof DjsContextMenuCommandBuilder
            )
        })
        .map(([name, command]) => command.setName(command.name || name))
}

export async function loadInteractive(
    client?: Client,
    commandNames?: CommandName[]
) {
    const commandModules = await loadCommandModules(client, commandNames)
    const slashCommandBuilders: SlashCommandBuilder[] = []
    const contextMenuCommandBuilders: ContextMenuCommandBuilder[] = []
    const buttonCovers: ButtonCover[] = []
    const selectMenuCovers: SelectMenuCover[] = []
    for (const [key, obj] of commandModules.map(Object.entries).flat()) {
        if (obj instanceof SlashCommandBuilder) {
            slashCommandBuilders.push(obj.setName(obj.name ?? key))
        } else if (obj instanceof ContextMenuCommandBuilder) {
            contextMenuCommandBuilders.push(obj.setName(obj.name ?? key))
        } else if (obj instanceof ButtonCover) {
            buttonCovers.push(obj.setCustomId(obj.customId ?? key))
        } else if (obj instanceof SelectMenuCover) {
            selectMenuCovers.push(obj.setCustomId(obj.customId ?? key))
        }
    }
    return {
        slashCommandBuilders,
        contextMenuCommandBuilders,
        buttonCovers,
        selectMenuCovers,
    }
}

export abstract class BaseCommandRefresher {
    public async refresh(
        guildId: Snowflake,
        guildKey: string,
        commandNames: CommandName[]
    ) {
        const [[commands, apiCommands], map] = await Promise.all([
            this._putCommands(guildId, commandNames),
            this._getAPIApplicationCommandPermissionsMap(guildId, guildKey),
        ])

        const commandNamePermissionsMap = new Map<
            CommandName,
            APIApplicationCommandPermission[]
        >()
        for (const command of commands) {
            if (
                !(command instanceof SlashCommandBuilder) &&
                !(command instanceof ContextMenuCommandBuilder)
            ) {
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

        await this._putPermissions(
            guildId,
            apiCommands,
            commandNamePermissionsMap
        )
    }

    protected abstract _getCommandPermissionsDict(): Promise<CommandPermissionsDict>

    protected abstract _getRoles(
        guildId: Snowflake,
        guildKey: string
    ): Promise<{ name: string; id: Snowflake }[]>

    private async _getAPIApplicationCommandPermissionsMap(
        guildId: Snowflake,
        guildKey: string
    ) {
        const [commandPermissionsDict, roles] = await Promise.all([
            this._getCommandPermissionsDict(),
            this._getRoles(guildId, guildKey),
        ])
        const commandPermissionsMap = makeSpecifiedGuildCommandPermissionsMap(
            guildKey,
            commandPermissionsDict
        )
        return toAPIApplicationCommandPermissionsMap(
            commandPermissionsMap,
            roles
        )
    }

    private async _putCommands(
        guildId: Snowflake,
        commandNames: string[]
    ): Promise<[DjsCommandBuilder[], RESTPutAPIApplicationCommandsResult]> {
        const commands = await loadCommands(commandNames)
        const commandJSONs = commands.map(command => command.toJSON())

        // https://discord.com/developers/docs/interactions/application-commands#registering-a-command
        let nChatInputCommand = 0,
            nUserCommand = 0,
            nMessageCommand = 0
        for (const { type } of commandJSONs) {
            switch (type) {
                case undefined:
                case ApplicationCommandType.ChatInput:
                    if (nChatInputCommand == 100) {
                        throw new Error(
                            'An app cannot have more then 100 chat input commands.'
                        )
                    }
                    nChatInputCommand += 1
                    break
                case ApplicationCommandType.User:
                    if (nUserCommand == 5) {
                        throw new Error(
                            'An app cannot have more then 5 user commands.'
                        )
                    }
                    nUserCommand += 1
                    break
                case ApplicationCommandType.Message:
                    if (nMessageCommand == 5) {
                        throw new Error(
                            'An app cannot have more then 5 message commands.'
                        )
                    }
                    nMessageCommand += 1
                    break
            }
        }

        const rest = new REST({ version: '9' }).setToken(token)

        logger.info('Started refreshing application (/) commands.')

        const response = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commandJSONs }
        )

        logger.debug(response)
        logger.info('Successfully refreshed application (/) commands.')

        return [commands, response as RESTPutAPIApplicationCommandsResult]
    }

    private async _putPermissions(
        guildId: Snowflake,
        commands: RESTPutAPIApplicationCommandsResult,
        map: Map<CommandName, APIApplicationCommandPermission[]>
    ) {
        const body: RESTPutAPIGuildApplicationCommandsPermissionsJSONBody = []
        for (const { id, name } of commands) {
            const permissions = map.get(name)
            if (permissions === undefined) {
                continue
            }
            body.push({ id, permissions })
        }

        const rest = new REST({ version: '9' }).setToken(token)

        logger.info('Started edit application (/) commands permissions.')

        const response = await rest.put(
            Routes.guildApplicationCommandsPermissions(clientId, guildId),
            { body }
        )

        logger.debug(response)
        logger.info('Successfully edited application (/) commands permissions.')
    }
}
