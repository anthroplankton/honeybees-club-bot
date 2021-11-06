import type {
    CommandInteraction,
    SelectMenuInteraction,
    MessageSelectOption as DjsMessageSelectOption,
    MessageSelectOptionData as DjsMessageSelectOptionData,
} from 'discord.js'
// import type { ApplicationCommandOptionType } from 'discord-api-types/v9'
import { MessageSelectMenu as DjsMessageSelectMenu } from 'discord.js'
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

interface MessageSelectOption<T extends string> extends DjsMessageSelectOption {
    value: T
}

interface MessageSelectOptionData<T extends string>
    extends DjsMessageSelectOptionData {
    value: T
}

interface MessageSelectMenu<T extends string> {
    options: MessageSelectOption<T>[]
    addOptions(
        ...options:
            | MessageSelectOptionData<T>[]
            | MessageSelectOptionData<T>[][]
    ): this
    setOptions(
        ...options:
            | MessageSelectOptionData<T>[]
            | MessageSelectOptionData<T>[][]
    ): this
    spliceOptions(
        index: number,
        deleteCount: number,
        ...options:
            | MessageSelectOptionData<T>[]
            | MessageSelectOptionData<T>[][]
    ): this
}
abstract class MessageSelectMenu<T extends string>
    extends DjsMessageSelectMenu
    implements MessageSelectMenu<T> {}

type SelectMenuInteractor<Value extends string> = (
    interaction: SelectMenuInteraction,
    values: Value[]
) => Promise<void>

export class SelectMenuCover<Value extends string = string> {
    public readonly customId!: string
    public readonly interactor: SelectMenuInteractor<Value>
    constructor(interactor: SelectMenuInteractor<Value>)
    constructor(customId: string, interactor: SelectMenuInteractor<Value>)
    constructor(
        customIdOrInteractor: string | SelectMenuInteractor<Value>,
        interactor?: SelectMenuInteractor<Value>
    ) {
        if (interactor === undefined) {
            this.interactor =
                customIdOrInteractor as SelectMenuInteractor<Value>
        } else {
            this.customId = customIdOrInteractor as string
            this.interactor = interactor
        }
    }
    public setCustomId(customId: string) {
        Reflect.set(this, 'customId', customId)
        return this
    }
    public readonly Builder = (cover =>
        class Builder extends MessageSelectMenu<Value> {
            public readonly customId!: string
            public override setCustomId(customId: string) {
                Reflect.defineProperty(this, 'customId', { value: customId })
                return this
            }
            constructor()
            constructor(data?: Builder)
            constructor(data?: Builder) {
                super(data)
                Reflect.defineProperty(this, 'customId', {
                    get: () => cover.customId,
                })
            }
        })(this)
}
