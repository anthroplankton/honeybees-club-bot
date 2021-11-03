import type { CommandInteraction } from 'discord.js'
// import type { ApplicationCommandOptionType } from 'discord-api-types/v9'
import * as b from '@discordjs/builders'

interface SlashCommandBuilderStrictFunctionTypes {
    addSubcommand(
        input: SlashCommandSubcommandBuilder
    ): Pick<
        SlashCommandBuilderStrictFunctionTypes,
        keyof b.SlashCommandSubcommandsOnlyBuilder
    >
    addSubcommandGroup(
        input: SlashCommandSubcommandGroupBuilderStrictFunctionTypes
    ): Pick<
        SlashCommandBuilderStrictFunctionTypes,
        keyof b.SlashCommandSubcommandsOnlyBuilder
    >
}
abstract class SlashCommandBuilderStrictFunctionTypes extends b.SlashCommandBuilder {}
export class SlashCommandBuilder extends SlashCommandBuilderStrictFunctionTypes {
    public readonly interactor!: (
        interaction: CommandInteraction,
        options: Record<string, unknown>
    ) => Promise<void>
    public setInteractor(
        interactor: this['interactor']
    ): Omit<this, 'addSubcommand' | 'addSubcommandGroup'> {
        Reflect.set(this, 'interactor', interactor)
        return this
    }
    public override addSubcommand(
        input:
            | SlashCommandSubcommandBuilder
            | ((
                  subcommand: SlashCommandSubcommandBuilder
              ) => SlashCommandSubcommandBuilder)
    ): SlashCommandSubcommandsOnlyBuilder {
        const result =
            typeof input === 'function'
                ? input(new SlashCommandSubcommandBuilder())
                : input
        super.addSubcommand(result)
        return this
    }
    public override addSubcommandGroup(
        input:
            | SlashCommandSubcommandGroupBuilder
            | ((
                  subcommandGroup: SlashCommandSubcommandGroupBuilder
              ) => SlashCommandSubcommandGroupBuilder)
    ): SlashCommandSubcommandsOnlyBuilder {
        const result =
            typeof input === 'function'
                ? input(new SlashCommandSubcommandGroupBuilder())
                : input
        super.addSubcommandGroup(result)
        return this
    }
}

interface SlashCommandSubcommandGroupBuilderStrictFunctionTypes {
    addSubcommand(input: SlashCommandSubcommandBuilder): this
}
abstract class SlashCommandSubcommandGroupBuilderStrictFunctionTypes extends b.SlashCommandSubcommandGroupBuilder {}
export class SlashCommandSubcommandGroupBuilder extends SlashCommandSubcommandGroupBuilderStrictFunctionTypes {
    public override addSubcommand(
        input:
            | SlashCommandSubcommandBuilder
            | ((
                  subcommandGroup: SlashCommandSubcommandBuilder
              ) => SlashCommandSubcommandBuilder)
    ) {
        const result =
            typeof input === 'function'
                ? input(new SlashCommandSubcommandBuilder())
                : input
        super.addSubcommand(result)
        return this
    }
}

export class SlashCommandSubcommandBuilder extends b.SlashCommandSubcommandBuilder {
    public readonly interactor!: (
        interaction: CommandInteraction,
        options: Record<string, unknown>
    ) => Promise<void>
    public setInteractor(interactor: this['interactor']) {
        Reflect.set(this, 'interactor', interactor)
        return this
    }
}

export type SlashCommandSubcommandsOnlyBuilder = Pick<
    SlashCommandBuilder,
    keyof b.SlashCommandSubcommandsOnlyBuilder
>

// export type OptionType =
//     | ApplicationCommandOptionType.String
//     | ApplicationCommandOptionType.Integer
//     | ApplicationCommandOptionType.Boolean
//     | ApplicationCommandOptionType.User
//     | ApplicationCommandOptionType.Channel
//     | ApplicationCommandOptionType.Role
//     | ApplicationCommandOptionType.Mentionable
//     | ApplicationCommandOptionType.Number

export type SlashCommandOption =
    | b.SlashCommandStringOption
    | b.SlashCommandIntegerOption
    | b.SlashCommandBooleanOption
    | b.SlashCommandUserOption
    | b.SlashCommandChannelOption
    | b.SlashCommandRoleOption
    | b.SlashCommandMentionableOption
    | b.SlashCommandNumberOption
