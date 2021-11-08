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
import { bgBlue } from 'chalk'
import logger, { LogPath, LogTree } from '../common/log'
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

const OptionTypeNameDict = {
    [ApplicationCommandOptionType.String]: 'String',
    [ApplicationCommandOptionType.Integer]: 'Integer',
    [ApplicationCommandOptionType.Boolean]: 'Boolean',
    [ApplicationCommandOptionType.User]: 'User',
    [ApplicationCommandOptionType.Channel]: 'Channel',
    [ApplicationCommandOptionType.Role]: 'Role',
    [ApplicationCommandOptionType.Mentionable]: 'Mentionable',
    [ApplicationCommandOptionType.Number]: 'Number',
} as const

export async function load(client: Client) {
    const { slashCommandBuilders, selectMenuCovers } = await getInteractive(
        client
    )
    for (const builder of slashCommandBuilders) {
        setCommandBuilderMap(commandBuilderMap, builder)
    }
    logger.event(
        'Loading Completed',
        bgBlue('Slash Comamnd'),
        makeLogTree(commandBuilderMap)
    )
    for (const cover of selectMenuCovers) {
        selectMenuCoverMap.set(cover.customId, cover)
    }
    logger.event(
        'Loading Completed',
        bgBlue('select menu'),
        new LogTree().addChildren(
            ...Array.from(selectMenuCoverMap.keys(), customId =>
                new LogTree().setName(customId)
            )
        )
    )
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

function makeLogTree(map: CommandBuilderMap) {
    const logTree = new LogTree()
    for (const [name, node] of map) {
        if (node.children.size) {
            logTree.addChildren(makeLogTree(node.children).setName(name))
            continue
        }
        const child = new LogTree()
            .setName(name)
            .addChildren(
                ...(node.builder.options as SlashCommandOption[]).map(
                    ({ name, type, required }) =>
                        new LogTree()
                            .setName(name)
                            .setValue(
                                required
                                    ? OptionTypeNameDict[type]
                                    : `?${OptionTypeNameDict[type]}`
                            )
                )
            )
        logTree.addChildren(child)
    }
    return logTree
}

export async function listener(interaction: Interaction) {
    try {
        if (interaction.isCommand()) {
            await commandListener(interaction)
        } else if (interaction.isSelectMenu()) {
            await selectMenuListener(interaction)
        }
    } catch (err) {
        logger.error(err)
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
    const commandPath = new LogPath()
    let [node, commandPathTail] = getCommandBuilderNode(
        commandBuilderMap,
        commandName,
        commandPath
    )
    if (subcommandGroupName !== null) {
        void ([node, commandPathTail] = getCommandBuilderNode(
            node.children,
            subcommandGroupName,
            commandPathTail
        ))
    }
    if (subcommandName !== null) {
        void ([node] = getCommandBuilderNode(
            node.children,
            subcommandName,
            commandPathTail
        ))
    }
    logger.event('Command Interaction Create', commandPath)
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
    commandPath = new LogPath().setName('/')
): [node: CommandBuilderNode, nextCommandPath: LogPath] {
    commandPath = commandPath.setNext(new LogPath().setName(name))
    const node = map.get(name)
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
    const getMethodName = `get${OptionTypeNameDict[type]}` as const
    return options[getMethodName](name, required)
}

async function selectMenuListener(interaction: SelectMenuInteraction) {
    const { customId } = interaction
    logger.event(
        'Select Menu Interaction Create',
        new LogPath().setName(customId)
    )
    const cover = selectMenuCoverMap.get(customId)
    if (cover === undefined) {
        throw new Error(`The select menu "${customId}" does not bind.`)
    }
    await cover.interactor(interaction, interaction.values)
}
