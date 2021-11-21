import type {
    CommandInteraction,
    SelectMenuInteraction,
    CommandInteractionOption as DjsCommandInteractionOption,
    MessageSelectOption as DjsMessageSelectOption,
    MessageSelectOptionData as DjsMessageSelectOptionData,
} from 'discord.js'
import type { ApplicationCommandOptionType } from 'discord-api-types/v9'
import { MessageSelectMenu as DjsMessageSelectMenu } from 'discord.js'
import * as b from '@discordjs/builders'

function SimpleMixin<T1>(Cls: abstract new () => T1) {
    return <T2>() => Cls as abstract new () => T2 & T1
}

interface Name<T extends string = string> {
    name: T
}

interface Required<T extends boolean = boolean> {
    required: T
}

interface NarrowedSlashCommandOption<T extends NarrowedSlashCommandOption<T>>
    extends Name,
        Required {
    setName<TName extends string>(
        name: TName
    ): T & Name<TName> & Required<this['required']>
    setRequired<TRequired extends boolean>(
        name: TRequired
    ): T & Name<this['name']> & Required<TRequired>
}

type NarrowedSlashCommandStringOption =
    NarrowedSlashCommandOption<SlashCommandStringOption>
export class SlashCommandStringOption extends SimpleMixin(
    b.SlashCommandStringOption
)<NarrowedSlashCommandStringOption>() {}

type NarrowedSlashCommandIntegerOption =
    NarrowedSlashCommandOption<SlashCommandIntegerOption>
export class SlashCommandIntegerOption extends SimpleMixin(
    b.SlashCommandIntegerOption
)<NarrowedSlashCommandIntegerOption>() {}

type NarrowedSlashCommandBooleanOption =
    NarrowedSlashCommandOption<SlashCommandBooleanOption>
export class SlashCommandBooleanOption extends SimpleMixin(
    b.SlashCommandBooleanOption
)<NarrowedSlashCommandBooleanOption>() {}

type NarrowedSlashCommandUserOption =
    NarrowedSlashCommandOption<SlashCommandUserOption>
export class SlashCommandUserOption extends SimpleMixin(
    b.SlashCommandUserOption
)<NarrowedSlashCommandUserOption>() {}

type NarrowedSlashCommandChannelOption =
    NarrowedSlashCommandOption<SlashCommandChannelOption>
export class SlashCommandChannelOption extends SimpleMixin(
    b.SlashCommandChannelOption
)<NarrowedSlashCommandChannelOption>() {}

type NarrowedSlashCommandRoleOption =
    NarrowedSlashCommandOption<SlashCommandRoleOption>
export class SlashCommandRoleOption extends SimpleMixin(
    b.SlashCommandRoleOption
)<NarrowedSlashCommandRoleOption>() {}

type NarrowedSlashCommandMentionableOption =
    NarrowedSlashCommandOption<SlashCommandMentionableOption>
export class SlashCommandMentionableOption extends SimpleMixin(
    b.SlashCommandMentionableOption
)<NarrowedSlashCommandMentionableOption>() {}

type NarrowedSlashCommandNumberOption =
    NarrowedSlashCommandOption<SlashCommandNumberOption>
export class SlashCommandNumberOption extends SimpleMixin(
    b.SlashCommandNumberOption
)<NarrowedSlashCommandNumberOption>() {}

export type SlashCommandOption =
    | SlashCommandStringOption
    | SlashCommandIntegerOption
    | SlashCommandBooleanOption
    | SlashCommandUserOption
    | SlashCommandChannelOption
    | SlashCommandRoleOption
    | SlashCommandMentionableOption
    | SlashCommandNumberOption

type CommandInteractionOption = {
    [ApplicationCommandOptionType.String]: string
    [ApplicationCommandOptionType.Integer]: number
    [ApplicationCommandOptionType.Boolean]: boolean
    [ApplicationCommandOptionType.User]: NonNullable<
        DjsCommandInteractionOption['user']
    >
    [ApplicationCommandOptionType.Channel]: NonNullable<
        DjsCommandInteractionOption['channel']
    >
    [ApplicationCommandOptionType.Role]: NonNullable<
        DjsCommandInteractionOption['role']
    >
    [ApplicationCommandOptionType.Mentionable]: NonNullable<
        DjsCommandInteractionOption['member' | 'role' | 'user']
    >
    [ApplicationCommandOptionType.Number]: number
}

type interactionOptionDict = Readonly<
    Record<string, CommandInteractionOption[SlashCommandOption['type']] | null>
>

interface InteractionOptions<
    T extends interactionOptionDict = interactionOptionDict
> {
    interactionOptions: Partial<T>
}

type SimplifyInteractionOptions<T extends InteractionOptions> =
    T extends InteractionOptions<infer TOptions>
        ? InteractionOptions<{
              readonly [K in keyof TOptions]: TOptions[K]
          }>
        : never

type Narrow<
    T extends Interactive<T, ShouldOmitSubcommandFunctions>,
    ShouldOmitSubcommandFunctions,
    TInteractionOptions extends InteractionOptions
> = ShouldOmitSubcommandFunctions extends true
    ? Omit<T & TInteractionOptions, 'addSubcommand' | 'addSubcommandGroup'>
    : T & TInteractionOptions

type AddOptionFunction<
    T extends NarrowedSharedSlashCommandOptions<
        T,
        ShouldOmitSubcommandFunctions
    >,
    ShouldOmitSubcommandFunctions,
    This extends NarrowedSharedSlashCommandOptions<
        T,
        ShouldOmitSubcommandFunctions
    >,
    TOption extends SlashCommandOption
> = <
    TName1 extends string,
    TRequired1 extends boolean,
    TName2 extends string,
    TRequired2 extends boolean
>(
    input:
        | (TOption & Name<TName1> & Required<TRequired1>)
        | ((builder: TOption) => TOption & Name<TName2> & Required<TRequired2>)
) => Narrow<
    T,
    ShouldOmitSubcommandFunctions,
    This &
        InteractionOptions<{
            [K in TName1 & TName2]:
                | CommandInteractionOption[TOption['type']]
                | (TRequired1 & TRequired2 extends true ? never : null)
        }>
>

class Interactive<
    T extends Interactive<T, ShouldOmitSubcommandFunctions>,
    ShouldOmitSubcommandFunctions
> implements InteractionOptions
{
    public interactionOptions = {}
    public readonly interactor!: (
        interaction: CommandInteraction,
        options: interactionOptionDict
    ) => Promise<void>
    public setInteractor(
        interactor: (
            interaction: CommandInteraction,
            options: {
                [K in keyof this['interactionOptions']]-?: this['interactionOptions'][K]
            }
        ) => Promise<void>
    ) {
        Reflect.set(this, 'interactor', interactor)
        return this as unknown as Narrow<
            T,
            ShouldOmitSubcommandFunctions,
            SimplifyInteractionOptions<this>
        >
    }
    public static assignMethod<T extends Interactive<T, boolean>>(
        Cls: new () => T
    ) {
        Reflect.defineProperty(Cls.prototype, 'setInteractor', {
            value: Interactive.prototype.setInteractor,
            enumerable: false,
        })
        return Cls
    }
    public static assign<
        T extends Interactive<T, boolean>,
        This extends Interactive<T, boolean>
    >(instance: This): This {
        return Object.assign(instance, new Interactive())
    }
}

interface NarrowedSharedSlashCommandOptions<
    T extends NarrowedSharedSlashCommandOptions<
        T,
        ShouldOmitSubcommandFunctions
    >,
    ShouldOmitSubcommandFunctions = true
> extends Interactive<T, ShouldOmitSubcommandFunctions> {
    readonly addStringOption: AddOptionFunction<
        T,
        ShouldOmitSubcommandFunctions,
        this,
        SlashCommandStringOption
    >
    readonly addIntegerOption: AddOptionFunction<
        T,
        ShouldOmitSubcommandFunctions,
        this,
        SlashCommandIntegerOption
    >
    readonly addBooleanOption: AddOptionFunction<
        T,
        ShouldOmitSubcommandFunctions,
        this,
        SlashCommandBooleanOption
    >
    readonly addUserOption: AddOptionFunction<
        T,
        ShouldOmitSubcommandFunctions,
        this,
        SlashCommandUserOption
    >
    readonly addChannelOption: AddOptionFunction<
        T,
        ShouldOmitSubcommandFunctions,
        this,
        SlashCommandChannelOption
    >
    readonly addRoleOption: AddOptionFunction<
        T,
        ShouldOmitSubcommandFunctions,
        this,
        SlashCommandRoleOption
    >
    readonly addMentionableOption: AddOptionFunction<
        T,
        ShouldOmitSubcommandFunctions,
        this,
        SlashCommandMentionableOption
    >
    readonly addNumberOption: AddOptionFunction<
        T,
        ShouldOmitSubcommandFunctions,
        this,
        SlashCommandNumberOption
    >
}

type AddSubcommandFunctionInput<T> = T | ((x: T) => T)

type NarrowedSlashCommandBuilder =
    NarrowedSharedSlashCommandOptions<SlashCommandBuilder>
@Interactive.assignMethod
export class SlashCommandBuilder extends SimpleMixin(
    b.SlashCommandBuilder
)<NarrowedSlashCommandBuilder>() {
    public constructor() {
        super()
        Interactive.assign(this)
    }

    public readonly permissionsKeys: string[] = []
    public setPermissionsKeys(...Keys: string[]) {
        this.permissionsKeys.splice(0, this.permissionsKeys.length, ...Keys)
        return this
    }

    // Just need pass SlashCommandSubcommandBuilder instance when call the addSubcommand method of super
    public override addSubcommandGroup(
        input: SlashCommandSubcommandGroupBuilder
    ): SlashCommandSubcommandsOnlyBuilder
    public override addSubcommandGroup(
        input: (
            subcommandGroup: SlashCommandSubcommandGroupBuilder
        ) => SlashCommandSubcommandGroupBuilder
    ): SlashCommandSubcommandsOnlyBuilder
    public override addSubcommandGroup(
        input: AddSubcommandFunctionInput<SlashCommandSubcommandGroupBuilder>
    ) {
        const result =
            typeof input === 'function'
                ? input(new SlashCommandSubcommandGroupBuilder())
                : input
        super.addSubcommandGroup(result)
        return this
    }

    public override addSubcommand(
        input: SlashCommandSubcommandBuilder
    ): SlashCommandSubcommandsOnlyBuilder
    public override addSubcommand(
        input: (
            subcommand: SlashCommandSubcommandBuilder
        ) => SlashCommandSubcommandBuilder
    ): SlashCommandSubcommandsOnlyBuilder
    public override addSubcommand(
        input: AddSubcommandFunctionInput<SlashCommandSubcommandBuilder>
    ) {
        const result =
            typeof input === 'function'
                ? input(new SlashCommandSubcommandBuilder())
                : input
        super.addSubcommand(result)
        return this
    }
}

export class SlashCommandSubcommandGroupBuilder extends b.SlashCommandSubcommandGroupBuilder {
    public override addSubcommand(input: SlashCommandSubcommandBuilder): this
    public override addSubcommand(
        input: (
            subcommand: SlashCommandSubcommandBuilder
        ) => SlashCommandSubcommandBuilder
    ): this
    public override addSubcommand(
        input: AddSubcommandFunctionInput<SlashCommandSubcommandBuilder>
    ) {
        const result =
            typeof input === 'function'
                ? input(new SlashCommandSubcommandBuilder())
                : input
        super.addSubcommand(result)
        return this
    }
}

type NarrowedSlashCommandSubcommandBuilder = NarrowedSharedSlashCommandOptions<
    SlashCommandSubcommandBuilder,
    false
>
@Interactive.assignMethod
export class SlashCommandSubcommandBuilder extends SimpleMixin(
    b.SlashCommandSubcommandBuilder
)<NarrowedSlashCommandSubcommandBuilder>() {
    public constructor() {
        super()
        Interactive.assign(this)
    }
}

export type SlashCommandSubcommandsOnlyBuilder = Pick<
    SlashCommandBuilder,
    keyof b.SlashCommandSubcommandsOnlyBuilder
>

export interface MessageSelectOption<T extends string>
    extends DjsMessageSelectOption {
    value: T
}

export interface MessageSelectOptionData<T extends string>
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
