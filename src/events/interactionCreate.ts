import type {
    Client,
    Interaction,
    CommandInteraction,
    SelectMenuInteraction,
} from 'discord.js'
import type { ToAPIApplicationCommandOptions } from '@discordjs/builders'
import type {
    SlashCommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandOption,
    SelectMenuCover,
} from '../common/interactive'
import { ApplicationCommandOptionType } from 'discord-api-types/v9'
import path from 'path'
import { getInteractive } from '../common/commandManager'

type CommandBuilder =
    | SlashCommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | SlashCommandSubcommandBuilder
type CommandBuilderNode = {
    builder: CommandBuilder
    children: CommandBuilderMap
}
type CommandBuilderMap = Map<string, CommandBuilderNode>
const commandBuilderMap: CommandBuilderMap = new Map()

type SelectMenuCoverMap = Map<string, SelectMenuCover>
const selectMenuCoverMap: SelectMenuCoverMap = new Map()

export async function load(client: Client) {
    const { slashCommandBuilders, selectMenuCovers } = await getInteractive(
        client
    )
    for (const builder of slashCommandBuilders) {
        setCommandBuilderMap(commandBuilderMap, builder)
    }
    for (const cover of selectMenuCovers) {
        selectMenuCoverMap.set(cover.customId, cover)
    }
    console.log('Loading completed: interaction')
    console.log(commandBuilderMap)
    console.log(selectMenuCoverMap)
}

function isSubcommandGroup(
    option: ToAPIApplicationCommandOptions
): option is SlashCommandSubcommandGroupBuilder {
    return option.toJSON().type === ApplicationCommandOptionType.SubcommandGroup
}

function isSubcommand(
    option: ToAPIApplicationCommandOptions
): option is SlashCommandSubcommandBuilder {
    return option.toJSON().type === ApplicationCommandOptionType.Subcommand
}

function setCommandBuilderMap(map: CommandBuilderMap, builder: CommandBuilder) {
    const children: CommandBuilderMap = new Map()
    map.set(builder.name, { builder, children })
    for (const option of builder.options) {
        if (isSubcommandGroup(option)) {
            setCommandBuilderMap(children, option)
        } else if (isSubcommand(option)) {
            setCommandBuilderMap(children, option)
        }
    }
}

export async function listener(interaction: Interaction) {
    try {
        if (interaction.isCommand()) {
            await commandListener(interaction)
        } else if (interaction.isSelectMenu()) {
            await selectMenuListener(interaction)
        }
    } catch (err) {
        console.log(err)
        if (interaction.isCommand()) {
            const reply = {
                content: 'There was an error while executing this command!',
                ephemeral: interaction.ephemeral ?? true,
            }
            await (interaction.replied
                ? interaction.followUp(reply)
                : interaction.reply(reply))
        } else if (interaction.isMessageComponent()) {
            if (interaction.customId.startsWith('!')) {
                return
            }
            await Promise.all([
                interaction.update({
                    components: [],
                }),
                interaction.followUp({
                    content:
                        'There was an error while replying this message component!',
                    ephemeral: interaction.ephemeral ?? true,
                }),
            ])
        }
    }
}

async function commandListener(interaction: CommandInteraction) {
    const { commandName } = interaction
    const subcommandGroupName = interaction.options.getSubcommandGroup(false)
    const subcommandName = interaction.options.getSubcommand(false)
    let [node, commandPath] = getCommandBuilderNode(
        commandBuilderMap,
        commandName
    )
    if (subcommandGroupName !== null) {
        void ([node, commandPath] = getCommandBuilderNode(
            node.children,
            subcommandGroupName,
            commandPath
        ))
    }
    if (subcommandName !== null) {
        void ([node, commandPath] = getCommandBuilderNode(
            node.children,
            subcommandName,
            commandPath
        ))
    }
    console.log(`Command interaction create: ${commandPath}`)
    const builder = node.builder as
        | SlashCommandBuilder
        | SlashCommandSubcommandBuilder
    const options = Object.fromEntries(
        (builder.options as SlashCommandOption[]).map(
            ({ name, required, type }) => [
                name,
                getInteractionOption(interaction.options, name, required, type),
            ]
        )
    )
    await builder.interactor(interaction, options)
}

function getCommandBuilderNode(
    map: CommandBuilderMap,
    name: string,
    commandPath = '/'
): [node: CommandBuilderNode, commandPath: string] {
    const node = map.get(name)
    commandPath = path.join(commandPath, name)
    if (node === undefined) {
        throw new Error(`The command "${commandPath}" does not bind.`)
    }
    return [node, commandPath]
}

function getInteractionOption(
    options: CommandInteraction['options'],
    name: string,
    required: boolean,
    type: SlashCommandOption['type']
) {
    switch (type) {
        case ApplicationCommandOptionType.String:
            return options.getString(name, required)
        case ApplicationCommandOptionType.Integer:
            return options.getInteger(name, required)
        case ApplicationCommandOptionType.Boolean:
            return options.getBoolean(name, required)
        case ApplicationCommandOptionType.User:
            return options.getUser(name, required)
        case ApplicationCommandOptionType.Channel:
            return options.getChannel(name, required)
        case ApplicationCommandOptionType.Role:
            return options.getRole(name, required)
        case ApplicationCommandOptionType.Mentionable:
            return options.getMentionable(name, required)
        case ApplicationCommandOptionType.Number:
            return options.getNumber(name, required)
    }
}

async function selectMenuListener(interaction: SelectMenuInteraction) {
    const { customId } = interaction
    console.log(`Select menu interaction create: ${customId}`)
    const cover = selectMenuCoverMap.get(customId)
    if (cover === undefined) {
        throw new Error(`The select menu "${customId}" does not bind.`)
    }
    await cover.interactor(interaction, interaction.values)
}
