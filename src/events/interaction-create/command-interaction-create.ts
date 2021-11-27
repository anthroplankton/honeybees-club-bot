import type { CommandInteraction } from 'discord.js'
import type { ToAPIApplicationCommandOptions } from '@discordjs/builders'
import type {
    SlashCommandOption,
    SlashCommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandSubcommandBuilder,
} from '../../common/interactive'
import { ApplicationCommandOptionType } from 'discord-api-types/v9'
import { bgGray } from 'chalk'
import { LogPath, LogTree } from '../../common/log'
import { ApplicationCommandOptionTypeNames } from '../../common/interactive'
import { BaseInteractionCreateListener } from './base-interaction-create'

type SlashCommandBuilderFamily =
    | SlashCommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | SlashCommandSubcommandBuilder
type SlashCommandBuilderNode = {
    builder: SlashCommandBuilderFamily
    children: Map<string, SlashCommandBuilderNode>
}
type SlashCommandBuilderMap = Map<string, SlashCommandBuilderNode>

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

export class CommandInteractionCreateListener extends BaseInteractionCreateListener<
    CommandInteraction,
    SlashCommandBuilder,
    SlashCommandBuilderNode
> {
    public constructor() {
        super('slash comamnd')
    }

    protected override _setInteractive(
        map: SlashCommandBuilderMap,
        builder: SlashCommandBuilderFamily
    ) {
        const children: SlashCommandBuilderMap = new Map()
        map.set(builder.name, { builder, children })
        for (const option of builder.options) {
            if (isSubcommandGroup(option)) {
                this._setInteractive(children, option)
            } else if (isSubcommand(option)) {
                this._setInteractive(children, option)
            }
        }
    }

    protected override _getInteractive(
        map: SlashCommandBuilderMap,
        { commandName, options }: CommandInteraction
    ): [node: SlashCommandBuilderNode | undefined, commandPath: LogPath] {
        const subcommandGroupName = options.getSubcommandGroup(false)
        const subcommandName = options.getSubcommand(false)
        const commandPath = new LogPath()
        let [node, commandPathTail] = this._getSlashCommandBuilderNode(
            map,
            commandName,
            commandPath
        )
        if (node !== undefined && subcommandGroupName !== null) {
            void ([node, commandPathTail] = this._getSlashCommandBuilderNode(
                node.children,
                subcommandGroupName,
                commandPathTail
            ))
        }
        if (node !== undefined && subcommandName !== null) {
            void ([node] = this._getSlashCommandBuilderNode(
                node.children,
                subcommandName,
                commandPathTail
            ))
        }
        return [node, commandPath]
    }

    private _getSlashCommandBuilderNode(
        map: SlashCommandBuilderMap,
        name: string,
        commandPath: LogPath
    ): [node: SlashCommandBuilderNode | undefined, nextCommandPath: LogPath] {
        commandPath = commandPath.setNext(new LogPath().setName(name))
        const node = map.get(name)
        return [node, commandPath]
    }

    protected override _makeLogTree(map: SlashCommandBuilderMap) {
        const logTree = new LogTree()
        for (const [name, node] of map) {
            const child = node.children.size
                ? this._makeLogTree(node.children)
                : this._makeOptionsLogTree(
                      node.builder.options as SlashCommandOption[]
                  )

            child.setName(name)

            if (
                'permissionsKeys' in node.builder &&
                node.builder.permissionsKeys.length
            ) {
                child.setValue(
                    bgGray('@' + node.builder.permissionsKeys.join('|'))
                )
            }

            logTree.addChildren(child)
        }
        return logTree
    }

    private _makeOptionsLogTree(options: readonly SlashCommandOption[]) {
        const logTree = new LogTree()
        for (const { type, name, required } of options) {
            const typeName = ApplicationCommandOptionTypeNames[type]
            const child = new LogTree()
                .setName(name)
                .setValue(required ? typeName : `?${typeName}`)
            logTree.addChildren(child)
        }
        return logTree
    }

    protected override async _interact(
        interaction: CommandInteraction,
        node: SlashCommandBuilderNode
    ) {
        const builder = node.builder as
            | SlashCommandBuilder
            | SlashCommandSubcommandBuilder
        const optionEntries = (builder.options as SlashCommandOption[]).map(
            ({ type, name, required }) => [
                name,
                this._getInteractionOption(
                    interaction.options,
                    type,
                    name,
                    required
                ),
            ]
        )
        const options = Object.fromEntries(optionEntries)
        await builder.interactor(interaction, options)
    }

    private _getInteractionOption(
        options: CommandInteraction['options'],
        type: SlashCommandOption['type'],
        name: string,
        required: boolean
    ) {
        const typeName = ApplicationCommandOptionTypeNames[type]
        return options[`get${typeName}`](name, required)
    }
}
