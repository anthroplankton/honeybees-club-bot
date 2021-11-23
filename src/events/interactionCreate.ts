import type {
    Client,
    Interaction,
    CommandInteraction,
    ContextMenuInteraction,
    ButtonInteraction,
    SelectMenuInteraction,
} from 'discord.js'
import type { ToAPIApplicationCommandOptions } from '@discordjs/builders'
import type {
    SlashCommandOption,
    SlashCommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandSubcommandBuilder,
    ContextMenuCommandBuilder,
    ButtonCover,
    SelectMenuCover,
} from '../common/interactive'
import { ApplicationCommandOptionType } from 'discord-api-types/v9'
import { bgBlue, bgGray } from 'chalk'
import logger, { LogPath, LogTree } from '../common/log'
import { getInteractive } from '../common/commandManager'
import {
    ApplicationCommandTypeNames,
    ApplicationCommandOptionTypeNames,
} from '../common/interactive'

type SlashCommandBuilderFamily =
    | SlashCommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | SlashCommandSubcommandBuilder
type SlashCommandBuilderNode = {
    builder: SlashCommandBuilderFamily
    children: SlashCommandBuilderMap
}
type SlashCommandBuilderMap = Map<string, SlashCommandBuilderNode>
const slashCommandBuilderMap: SlashCommandBuilderMap = new Map()

type ContextMenuCommandBuilderMap = Map<string, ContextMenuCommandBuilder>
const contextMenucommandBuilderMap: ContextMenuCommandBuilderMap = new Map()

type ButtonCoverMap = Map<string, ButtonCover>
const buttonCoverMap: ButtonCoverMap = new Map()

type SelectMenuCoverMap = Map<string, SelectMenuCover>
const selectMenuCoverMap: SelectMenuCoverMap = new Map()

export async function load(client: Client) {
    const {
        slashCommandBuilders,
        contextMenuCommandBuilders,
        buttonCovers,
        selectMenuCovers,
    } = await getInteractive(client)

    for (const builder of slashCommandBuilders) {
        setCommandBuilderMap(slashCommandBuilderMap, builder)
    }
    logger.event(
        'Loading Completed',
        bgBlue('slash comamnd'),
        makeSlashCommandBuildersLogTree(slashCommandBuilderMap)
    )

    for (const builder of contextMenuCommandBuilders) {
        contextMenucommandBuilderMap.set(builder.name, builder)
    }
    logger.event(
        'Loading Completed',
        bgBlue('context menu'),
        makeContextMenuCommandBuildersLogTree(contextMenucommandBuilderMap)
    )

    for (const cover of buttonCovers) {
        buttonCoverMap.set(cover.customId, cover)
    }
    logger.event(
        'Loading Completed',
        bgBlue('button'),
        makeCoversLogTree(buttonCoverMap)
    )

    for (const cover of selectMenuCovers) {
        selectMenuCoverMap.set(cover.customId, cover)
    }
    logger.event(
        'Loading Completed',
        bgBlue('select menu'),
        makeCoversLogTree(selectMenuCoverMap)
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

function setCommandBuilderMap(
    map: SlashCommandBuilderMap,
    builder: SlashCommandBuilderFamily
) {
    const children: SlashCommandBuilderMap = new Map()
    map.set(builder.name, { builder, children })
    for (const option of builder.options) {
        if (isSubcommandGroup(option)) {
            setCommandBuilderMap(children, option)
        } else if (isSubcommand(option)) {
            setCommandBuilderMap(children, option)
        }
    }
}

function makeSlashCommandBuildersLogTree(map: SlashCommandBuilderMap) {
    const logTree = new LogTree()
    for (const [name, node] of map) {
        const child = node.children.size
            ? makeSlashCommandBuildersLogTree(node.children)
            : makeSlashCommandOptionsLogTree(
                  node.builder.options as SlashCommandOption[]
              )

        if (
            'permissionsKeys' in node.builder &&
            node.builder.permissionsKeys.length
        ) {
            child.setValue(bgGray('@' + node.builder.permissionsKeys.join('|')))
        }
        logTree.addChildren(child.setName(name))
    }
    return logTree
}

function makeSlashCommandOptionsLogTree(
    options: readonly SlashCommandOption[]
) {
    return new LogTree().addChildren(
        ...options.map(({ name, type, required }) =>
            new LogTree()
                .setName(name)
                .setValue(
                    required
                        ? ApplicationCommandOptionTypeNames[type]
                        : `?${ApplicationCommandOptionTypeNames[type]}`
                )
        )
    )
}

function makeContextMenuCommandBuildersLogTree(
    map: ContextMenuCommandBuilderMap
) {
    const logTree = new LogTree().addChildren(
        ...Array.from(map.entries(), ([name, { type, permissionsKeys }]) => {
            const child = new LogTree()
                .setName(name)
                .addChildren(
                    new LogTree()
                        .setName('')
                        .setValue(ApplicationCommandTypeNames[type])
                )
            if (permissionsKeys.length) {
                child.setValue(bgGray('@' + permissionsKeys.join('|')))
            }
            return child
        })
    )
    return logTree
}

function makeCoversLogTree(map: ButtonCoverMap | SelectMenuCoverMap) {
    const logTree = new LogTree().addChildren(
        ...Array.from(map.keys(), customId => new LogTree().setName(customId))
    )
    return logTree
}

export async function listener(interaction: Interaction) {
    try {
        if (interaction.isCommand()) {
            await commandListener(interaction)
        } else if (interaction.isContextMenu()) {
            await contextMenuListener(interaction)
        } else if (interaction.isButton()) {
            await buttonListener(interaction)
        } else if (interaction.isSelectMenu()) {
            await selectMenuListener(interaction)
        }
    } catch (err) {
        logger.error(err)
        if (interaction.isApplicationCommand()) {
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
    let [node, commandPathTail] = getSlashCommandBuilderNode(
        slashCommandBuilderMap,
        commandName,
        commandPath
    )
    if (subcommandGroupName !== null) {
        void ([node, commandPathTail] = getSlashCommandBuilderNode(
            node.children,
            subcommandGroupName,
            commandPathTail
        ))
    }
    if (subcommandName !== null) {
        void ([node] = getSlashCommandBuilderNode(
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

function getSlashCommandBuilderNode(
    map: SlashCommandBuilderMap,
    name: string,
    commandPath = new LogPath().setName('/')
): [node: SlashCommandBuilderNode, nextCommandPath: LogPath] {
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
    const getMethodName =
        `get${ApplicationCommandOptionTypeNames[type]}` as const
    return options[getMethodName](name, required)
}

async function contextMenuListener(interaction: ContextMenuInteraction) {
    const { commandName } = interaction
    logger.event(
        'Context Menu Interaction Create',
        new LogPath().setName(commandName)
    )
    const builder = contextMenucommandBuilderMap.get(commandName)
    if (builder === undefined) {
        throw new Error(`The context menu "${commandName}" does not bind.`)
    }
    const typeName = ApplicationCommandTypeNames[builder.type]
    const getMethodName = `get${typeName}` as const
    const options = {
        [typeName.toLowerCase()]: interaction.options[getMethodName](
            typeName.toLowerCase(),
            true
        ),
    }
    await builder.interactor(interaction, options)
}

async function buttonListener(interaction: ButtonInteraction) {
    const { customId } = interaction
    logger.event('Button Interaction Create', new LogPath().setName(customId))
    const cover = buttonCoverMap.get(customId)
    if (cover === undefined) {
        throw new Error(`The button "${customId}" does not bind.`)
    }
    await cover.interactor(interaction)
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
