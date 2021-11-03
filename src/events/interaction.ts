import type {
    Interaction,
    CommandInteraction,
    CommandInteractionOptionResolver,
} from 'discord.js'
import type { ToAPIApplicationCommandOptions } from '@discordjs/builders'
import { ApplicationCommandOptionType } from 'discord-api-types/v9'
import type {
    OptionType,
    SlashCommandOption,
    SlashCommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    SlashCommandSubcommandBuilder,
} from '../common/interactor'
import { getCommands } from '../common/commandUtil'

type builder =
    | SlashCommandBuilder
    | SlashCommandSubcommandGroupBuilder
    | SlashCommandSubcommandBuilder

type option = SlashCommandOption<option> & { type: OptionType }

type Interactive = {
    builder: builder
    children: InteractiveMap
}

type InteractiveMap = Map<string, Interactive>

const interactiveMap: InteractiveMap = new Map()

export async function load() {
    for (const slashCommand of await getCommands()) {
        setinteractiveMap(interactiveMap, slashCommand)
    }
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

function setinteractiveMap(interactiveMap: InteractiveMap, builder: builder) {
    const children: InteractiveMap = new Map()
    interactiveMap.set(builder.name, { builder: builder, children })
    for (const option of builder.options) {
        if (isSubcommandGroup(option)) {
            setinteractiveMap(children, option)
        } else if (isSubcommand(option)) {
            setinteractiveMap(children, option)
        }
    }
}

export async function listener(interaction: Interaction) {
    if (interaction.isCommand()) {
        commandListener(interaction)
    }
}

async function commandListener(interaction: CommandInteraction) {
    const { commandName } = interaction
    const subcommandGroupName = interaction.options.getSubcommandGroup(false)
    const subcommandName = interaction.options.getSubcommand(false)
    let [interactive, commandPath] = getInteractive(
        interactiveMap,
        commandName,
        '/'
    )
    if (subcommandGroupName !== null) {
        void ([interactive, commandPath] = getInteractive(
            interactive.children,
            subcommandGroupName,
            commandPath
        ))
    }
    if (subcommandName !== null) {
        void ([interactive, commandPath] = getInteractive(
            interactive.children,
            subcommandName,
            commandPath
        ))
    }
    const builder = interactive.builder as
        | SlashCommandBuilder
        | SlashCommandSubcommandBuilder
    const options = Object.fromEntries(
        (builder.options as option[]).map(({ name, required, type }) => [
            name,
            getInteractionOption(interaction.options, name, required, type),
        ])
    )
    await builder.interactor?.(interaction, options)
}

function getInteractive(
    interactiveMap: InteractiveMap,
    name: string,
    commandPath: string
): [Interactive, string] {
    const interactive = interactiveMap.get(name)
    commandPath = `${commandPath}${name}/`
    if (interactive === undefined) {
        throw new Error(`The command "${commandPath}" does not bind.`)
    }
    return [interactive, commandPath]
}

function getInteractionOption(
    options: CommandInteractionOptionResolver,
    name: string,
    required: boolean,
    type: OptionType
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