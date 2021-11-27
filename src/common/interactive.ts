import type {
    BaseCommandInteraction,
    CommandInteraction,
    ContextMenuInteraction,
    MessageComponentInteraction,
    ButtonInteraction,
    SelectMenuInteraction,
    CommandInteractionOption,
    EmojiIdentifierResolvable,
    MessageButtonStyleResolvable as DjsMessageButtonStyleResolvable,
    MessageSelectOption as DjsMessageSelectOption,
    MessageSelectOptionData as DjsMessageSelectOptionData,
} from 'discord.js'

import {
    BaseMessageComponent,
    MessageButton,
    MessageSelectMenu,
} from 'discord.js'
import {
    ApplicationCommandType,
    ApplicationCommandOptionType,
} from 'discord-api-types/v9'
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

export type CommandInteractionOptions = {
    [ApplicationCommandOptionType.String]: string
    [ApplicationCommandOptionType.Integer]: number
    [ApplicationCommandOptionType.Boolean]: boolean
    [ApplicationCommandOptionType.User]: NonNullable<
        CommandInteractionOption['user']
    >
    [ApplicationCommandOptionType.Channel]: NonNullable<
        CommandInteractionOption['channel']
    >
    [ApplicationCommandOptionType.Role]: NonNullable<
        CommandInteractionOption['role']
    >
    [ApplicationCommandOptionType.Mentionable]: NonNullable<
        CommandInteractionOption['member' | 'role' | 'user']
    >
    [ApplicationCommandOptionType.Number]: number
}

export type ApplicationCommandOptionTypeNames =
    typeof ApplicationCommandOptionTypeNames
export const ApplicationCommandOptionTypeNames = {
    [ApplicationCommandOptionType.String]: 'String',
    [ApplicationCommandOptionType.Integer]: 'Integer',
    [ApplicationCommandOptionType.Boolean]: 'Boolean',
    [ApplicationCommandOptionType.User]: 'User',
    [ApplicationCommandOptionType.Channel]: 'Channel',
    [ApplicationCommandOptionType.Role]: 'Role',
    [ApplicationCommandOptionType.Mentionable]: 'Mentionable',
    [ApplicationCommandOptionType.Number]: 'Number',
} as const

type InteractionOptionDict = Readonly<
    Record<string, CommandInteractionOptions[SlashCommandOption['type']] | null>
>

interface InteractionOptions<
    T extends InteractionOptionDict = InteractionOptionDict
> {
    interactionOptions: Partial<T>
}

type SimplifyInteractionOptions<T extends InteractionOptions> =
    T extends InteractionOptions<infer TInteractionOptions>
        ? InteractionOptions<{
              readonly [K in keyof TInteractionOptions]: TInteractionOptions[K]
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
                | CommandInteractionOptions[TOption['type']]
                | (TRequired1 & TRequired2 extends true ? never : null)
        }>
>

interface SheardInteractor {
    readonly interactor: (
        interaction: never,
        options: Readonly<Record<string, never>>
    ) => Promise<void>
    setInteractor(
        interactor: (
            interaction: BaseCommandInteraction,
            options: Readonly<Record<string, unknown>>
        ) => Promise<void>
    ): SheardInteractor
}

interface ShardPermissions {
    readonly permissionsKeys: string[]
    setPermissionsKeys(...Keys: string[]): this
}

class Interactive<
    T extends Interactive<T, ShouldOmitSubcommandFunctions>,
    ShouldOmitSubcommandFunctions
> implements InteractionOptions, SheardInteractor
{
    public interactionOptions = {}
    public readonly interactor!: (
        interaction: CommandInteraction,
        options: InteractionOptionDict
    ) => Promise<void>
    public setInteractor(
        interactor: (
            interaction: CommandInteraction,
            options: {
                readonly [K in keyof this['interactionOptions']]-?: this['interactionOptions'][K]
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
export class SlashCommandBuilder
    extends SimpleMixin(b.SlashCommandBuilder)<NarrowedSlashCommandBuilder>()
    implements ShardPermissions
{
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

export type ContextMenuInteractionOptions = {
    [ApplicationCommandType.User]: NonNullable<CommandInteractionOption['user']>
    [ApplicationCommandType.Message]: NonNullable<
        CommandInteractionOption['message']
    >
}

export type ApplicationCommandTypeNames = typeof ApplicationCommandTypeNames
export const ApplicationCommandTypeNames = {
    [ApplicationCommandType.User]: 'User',
    [ApplicationCommandType.Message]: 'Message',
} as const

// Enum number return type is not type safe
// https://github.com/microsoft/TypeScript/issues/36756
export interface ContextMenuCommandBuilder {
    setType<T extends b.ContextMenuCommandType>(
        type: T
    ): ContextMenuCommandBuilder<
        T extends (ApplicationCommandType.User extends 2 ? 2 : never)
            ? ApplicationCommandType.User
            : T extends (ApplicationCommandType.Message extends 3 ? 3 : never)
            ? ApplicationCommandType.Message
            : never
    >
    setType(type: b.ContextMenuCommandType): this
}

export class ContextMenuCommandBuilder<
        T extends b.ContextMenuCommandType = b.ContextMenuCommandType
    >
    extends b.ContextMenuCommandBuilder
    implements SheardInteractor, ShardPermissions
{
    public readonly interactor!: (
        interaction: ContextMenuInteraction,
        options: Readonly<
            Record<string, ContextMenuInteractionOptions[this['type']]>
        >
    ) => Promise<void>
    public setInteractor(
        interactor: (
            interaction: ContextMenuInteraction,
            options: {
                readonly [K in Lowercase<
                    ApplicationCommandTypeNames[T]
                >]: ContextMenuInteractionOptions[T]
            }
        ) => Promise<void>
    ) {
        Reflect.set(this, 'interactor', interactor)
        return this
    }

    public readonly permissionsKeys: string[] = []
    public setPermissionsKeys(...Keys: string[]) {
        this.permissionsKeys.splice(0, this.permissionsKeys.length, ...Keys)
        return this
    }
}

type CoverInteractor = (
    interaction: MessageComponentInteraction
) => Promise<void>

abstract class BaseCover {
    public readonly customId!: string
    public readonly interactor: (
        interaction: never,
        values: never[]
    ) => Promise<void>

    constructor(interactor: CoverInteractor)
    constructor(customId: string, interactor: CoverInteractor)
    constructor(
        customIdOrInteractor: string | CoverInteractor,
        interactor?: CoverInteractor
    )
    constructor(
        customIdOrInteractor: string | CoverInteractor,
        interactor?: CoverInteractor
    ) {
        if (interactor === undefined) {
            this.interactor = customIdOrInteractor as CoverInteractor
        } else {
            this.customId = customIdOrInteractor as string
            this.interactor = interactor
        }
    }

    public setCustomId(customId: string) {
        Reflect.set(this, 'customId', customId)
        return this
    }

    public readonly Builder!: new (
        data?: BaseMessageComponent
    ) => BaseMessageComponent
}

export type MessageButtonStyleResolvable = Exclude<
    DjsMessageButtonStyleResolvable,
    'LINK'
>

export interface MessageCustomIdOnlyButton
    extends Omit<
        MessageButton,
        | 'url'
        | 'setURL'
        | 'setCustomId'
        | 'setDisabled'
        | 'setEmoji'
        | 'setLabel'
        | 'setStyle'
    > {
    setCustomId(customId: string): this
    setDisabled(disabled?: boolean): this
    setEmoji(emoji: EmojiIdentifierResolvable): this
    setLabel(label: string): this
    setStyle(style: MessageButtonStyleResolvable): this
}
export const MessageCustomIdOnlyButton = MessageButton as abstract new (
    data?: MessageCustomIdOnlyButton
) => MessageCustomIdOnlyButton

type ButtonCoverInteractor = (interaction: ButtonInteraction) => Promise<void>

export interface ButtonCover {
    readonly interactor: ButtonCoverInteractor
}
export class ButtonCover extends BaseCover {
    public constructor(interactor: ButtonCoverInteractor)
    public constructor(customId: string, interactor: ButtonCoverInteractor)
    public constructor(
        customIdOrInteractor: string | ButtonCoverInteractor,
        interactor?: ButtonCoverInteractor
    ) {
        super(
            customIdOrInteractor as string | CoverInteractor,
            interactor as undefined | CoverInteractor
        )
    }

    public readonly Builder = (cover =>
        class MessageButton extends MessageCustomIdOnlyButton {
            public override readonly customId!: string
            public override setCustomId(customId: string) {
                Reflect.defineProperty(this, 'customId', { value: customId })
                return this
            }

            public constructor()
            public constructor(data?: MessageButton)
            public constructor(data?: MessageButton) {
                super(data)
                Reflect.defineProperty(this, 'customId', {
                    get: () => cover.customId,
                })
            }
        })(this)
}

export interface MessageSelectOption<T extends string>
    extends DjsMessageSelectOption {
    value: T
}

export interface MessageSelectOptionData<T extends string>
    extends DjsMessageSelectOptionData {
    value: T
}

export interface MessageValueRestrictedSelectMenu<T extends string> {
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
export abstract class MessageValueRestrictedSelectMenu<T extends string>
    extends MessageSelectMenu
    implements MessageValueRestrictedSelectMenu<T> {}

type SelectMenuInteractor<T extends string> = (
    interaction: SelectMenuInteraction,
    values: T[]
) => Promise<void>

export interface SelectMenuCover<T extends string = string> {
    readonly interactor: SelectMenuInteractor<T>
}
export class SelectMenuCover<T extends string = string> extends BaseCover {
    public constructor(interactor: SelectMenuInteractor<T>)
    public constructor(customId: string, interactor: SelectMenuInteractor<T>)
    public constructor(
        customIdOrInteractor: string | SelectMenuInteractor<T>,
        interactor?: SelectMenuInteractor<T>
    ) {
        super(
            customIdOrInteractor as string | CoverInteractor,
            interactor as undefined | CoverInteractor
        )
    }

    public readonly Builder = (cover =>
        class MessageSelectMenu extends MessageValueRestrictedSelectMenu<T> {
            public override readonly customId!: string
            public override setCustomId(customId: string) {
                Reflect.defineProperty(this, 'customId', { value: customId })
                return this
            }

            public constructor()
            public constructor(data?: MessageSelectMenu)
            public constructor(data?: MessageSelectMenu) {
                super(data)
                Reflect.defineProperty(this, 'customId', {
                    get: () => cover.customId,
                })
            }
        })(this)
}
