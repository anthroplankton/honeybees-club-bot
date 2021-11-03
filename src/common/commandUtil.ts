import { SlashCommandBuilder } from '@discordjs/builders'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import fs from 'fs/promises'
import { hasMixin } from 'ts-mixer'

if (process.env.CLIENTID === undefined) {
    throw new Error('There is no client id in environment.')
}
if (process.env.TOKEN === undefined) {
    throw new Error('There is no token in environment.')
}
const clientId = process.env.CLIENTID
const token = process.env.TOKEN

export async function getCommandNames() {
    const files = await fs.readdir('./src/commands')
    const getCommandNames = files
        .map(file => file.match(/(.+)\.ts$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map(m => m[1])
    return getCommandNames
}

export async function getCommands(): Promise<SlashCommandBuilder[]>
export async function getCommands(
    CommandNames: string[]
): Promise<SlashCommandBuilder[]>
export async function getCommands(CommandNames?: string[]) {
    CommandNames = CommandNames || (await getCommandNames())
    const commandModules = await Promise.all(
        CommandNames.map(
            async CommandName => await import(`../commands/${CommandName}`)
        )
    )
    return commandModules
        .map(commandModule => Object.entries(commandModule))
        .flat()
        .filter((entrie): entrie is [string, SlashCommandBuilder] => {
            const [, obj] = entrie
            return hasMixin(obj, SlashCommandBuilder)
        })
        .map(([name, command]) => {
            command.setName(command.name || name)
            return command
        })
}

export async function refresh(guildId: string, CommandNames: string[]) {
    const commandJSONs = (await getCommands(CommandNames)).map(command =>
        command.toJSON()
    )

    const rest = new REST({ version: '9' }).setToken(token)
    try {
        console.log('Started refreshing application (/) commands.')

        console.log(commandJSONs)

        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commandJSONs,
        })

        console.log('Successfully reloaded application (/) commands.')
    } catch (err) {
        console.error(err)
    }
}
