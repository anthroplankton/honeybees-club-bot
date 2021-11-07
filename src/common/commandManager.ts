import { Routes } from 'discord-api-types/v9'
import { SlashCommandBuilder as DjsSlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import fs from 'fs/promises'
import path from 'path'
import { SlashCommandBuilder, SelectMenuCover } from '../common/interactive'
import { Client } from 'discord.js'

if (process.env.CLIENTID === undefined) {
    throw new Error('There is no client id in environment.')
}
if (process.env.TOKEN === undefined) {
    throw new Error('There is no token in environment.')
}
const clientId = process.env.CLIENTID
const token = process.env.TOKEN

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
    commandNames?: string[],
    client?: Client
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

export async function getCommands(commandNames?: string[]) {
    const commandModules = await getCommandModules(commandNames)
    return commandModules
        .map(Object.entries)
        .flat()
        .filter((entry): entry is [string, DjsSlashCommandBuilder] => {
            const [, obj] = entry
            return obj instanceof DjsSlashCommandBuilder
        })
        .map(([name, command]) => command.setName(command.name || name))
}

export async function getInteractive(client?: Client, commandNames?: string[]) {
    const commandModules = await getCommandModules(commandNames, client)
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

export async function refresh(guildId: string, CommandNames: string[]) {
    const commandJSONs = (await getCommands(CommandNames)).map(command =>
        command.toJSON()
    )

    const rest = new REST({ version: '9' }).setToken(token)
    try {
        console.log('Started refreshing application (/) commands.')

        const response = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            {
                body: commandJSONs,
            }
        )

        console.log(response)
        console.log('Successfully reloaded application (/) commands.')
    } catch (err) {
        console.error(err)
    }
}
