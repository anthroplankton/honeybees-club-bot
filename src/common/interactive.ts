import type { CommandInteractionOption, CommandInteraction } from 'discord.js'
import type { ApplicationCommandOptionType } from 'discord-api-types/v9'
import type * as co from '@discordjs/builders/dist/interactions/slashCommands/mixins/CommandOptions'
import type * as cob from '@discordjs/builders/dist/interactions/slashCommands/mixins/CommandOptionBase'
import type { SharedNameAndDescription } from '@discordjs/builders/dist/interactions/slashCommands/mixins/NameAndDescription'
import * as b from '@discordjs/builders'
import { Mixin } from 'ts-mixer'

type Name<T extends string = string> = {
    name: T
}

type Required<T extends boolean = boolean> = {
    required: T
}

export interface SlashCommandOption<T extends SlashCommandOption<T>>
    extends InteractorOptionBase<T>,
        Omit<cob.SlashCommandOptionBase, keyof InteractorOptionBase<T>> {}

abstract class InteractorOptionBase<T extends SlashCommandOption<T>>
    implements Name, Required
{
    public readonly name!: string
    public readonly required!: boolean
    public setName<TName extends string>(
        name: TName
    ): T & Name<TName> & Required<this['required']> {
        return (this as unknown as cob.SlashCommandOptionBase).setName(
            name
        ) as T & Name<TName> & Required<this['required']>
    }
    public setRequired<TRequired extends boolean>(
        required: TRequired
    ): T & Name<this['name']> & Required<TRequired> {
        return (this as unknown as cob.SlashCommandOptionBase).setRequired(
            required
        ) as T & Name<this['name']> & Required<TRequired>
    }
}

abstract class InteractorStringOption extends InteractorOptionBase<SlashCommandStringOption> {}
export class SlashCommandStringOption extends Mixin(
    InteractorStringOption,
    b.SlashCommandStringOption
) {}

abstract class InteractorIntegerOption extends InteractorOptionBase<SlashCommandIntegerOption> {}
export class SlashCommandIntegerOption extends Mixin(
    InteractorIntegerOption,
    b.SlashCommandIntegerOption
) {}

abstract class InteractorUserOption extends InteractorOptionBase<SlashCommandUserOption> {}
export class SlashCommandUserOption extends Mixin(
    InteractorUserOption,
    b.SlashCommandUserOption
) {}

abstract class InteractorChannelOption extends InteractorOptionBase<SlashCommandChannelOption> {}
export class SlashCommandChannelOption extends Mixin(
    InteractorChannelOption,
    b.SlashCommandChannelOption
) {}

abstract class InteractorRoleOption extends InteractorOptionBase<SlashCommandRoleOption> {}
export class SlashCommandRoleOption extends Mixin(
    InteractorRoleOption,
    b.SlashCommandRoleOption
) {}

abstract class InteractorMentionableOption extends InteractorOptionBase<SlashCommandMentionableOption> {}
export class SlashCommandMentionableOption extends Mixin(
    InteractorMentionableOption,
    b.SlashCommandMentionableOption
) {}

abstract class InteractorNumberOption extends InteractorOptionBase<SlashCommandNumberOption> {}
export class SlashCommandNumberOption extends Mixin(
    InteractorNumberOption,
    b.SlashCommandNumberOption
) {}

export type OptionType =
    | ApplicationCommandOptionType.String
    | ApplicationCommandOptionType.Integer
    | ApplicationCommandOptionType.Boolean
    | ApplicationCommandOptionType.User
    | ApplicationCommandOptionType.Channel
    | ApplicationCommandOptionType.Role
    | ApplicationCommandOptionType.Mentionable
    | ApplicationCommandOptionType.Number

type InteractionOptionMap = {
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

type InteractionOption<
    T extends OptionType = OptionType,
    TName extends string = string,
    TRequired extends boolean = boolean
> = {
    [K in TName]: TRequired extends true
        ? InteractionOptionMap[T]
        : InteractionOptionMap[T] | null
}

type InteractionOptions<
    T extends Readonly<
        Record<string, InteractionOptionMap[OptionType] | null>
    > = Readonly<Record<string, InteractionOptionMap[OptionType] | null>>
> = {
    interactionOptions: T
}

type AddOption<
    T,
    TOption extends InteractionOption
> = T extends InteractionOptions<infer TOptions>
    ? InteractionOptions<{
          readonly [K in keyof (TOptions & TOption)]: (TOptions & TOption)[K]
      }>
    : never

export interface SharedSlashCommandOptions<
    T extends SharedSlashCommandOptions<T, ShouldOmitSubcommandFunctions>,
    ShouldOmitSubcommandFunctions = true
> extends SharedInteractorOptions<T, ShouldOmitSubcommandFunctions>,
        Omit<
            co.SharedSlashCommandOptions,
            keyof SharedInteractorOptions<T, ShouldOmitSubcommandFunctions>
        > {}

abstract class SharedInteractorOptions<
    T extends SharedSlashCommandOptions<T, ShouldOmitSubcommandFunctions>,
    ShouldOmitSubcommandFunctions = true
> implements InteractionOptions
{
    public readonly interactionOptions = {}
    public readonly interactor?: (
        interaction: CommandInteraction,
        options: this['interactionOptions']
    ) => Promise<void>

    public setInteractor(
        interactor: this['interactor']
    ): ShouldOmitSubcommandFunctions extends true
        ? Omit<this, 'addSubcommand' | 'addSubcommandGroup'>
        : this {
        Reflect.set(this, 'interactor', interactor)
        return this
    }

    public addStringOption<
        TName1 extends string,
        TRequired1 extends boolean,
        TName2 extends string,
        TRequired2 extends boolean
    >(
        input:
            | (SlashCommandStringOption & Name<TName1> & Required<TRequired1>)
            | ((
                  builder: SlashCommandStringOption
              ) => SlashCommandStringOption &
                  Name<TName2> &
                  Required<TRequired2>)
    ) {
        return this._sharedInteractorAddOptionMethod<
            SlashCommandStringOption,
            TName1 & TName2,
            TRequired1 & TRequired2,
            ApplicationCommandOptionType.String
        >(input, SlashCommandStringOption, 'addIntegerOption')
    }

    public addIntegerOption<
        TName1 extends string,
        TRequired1 extends boolean,
        TName2 extends string,
        TRequired2 extends boolean
    >(
        input:
            | (SlashCommandIntegerOption & Name<TName1> & Required<TRequired1>)
            | ((
                  builder: SlashCommandIntegerOption
              ) => SlashCommandIntegerOption &
                  Name<TName2> &
                  Required<TRequired2>)
    ) {
        return this._sharedInteractorAddOptionMethod<
            SlashCommandIntegerOption,
            TName1 & TName2,
            TRequired1 & TRequired2,
            ApplicationCommandOptionType.Integer
        >(input, SlashCommandIntegerOption, 'addIntegerOption')
    }

    private _sharedInteractorAddOptionMethod<
        TSlashCommandOption extends SlashCommandOption<TSlashCommandOption>,
        TName extends string,
        TRequired extends boolean,
        TOptionType extends OptionType
    >(
        input:
            | TSlashCommandOption
            | ((builder: TSlashCommandOption) => TSlashCommandOption),
        Instance: new () => TSlashCommandOption,
        addOptionMethodName: keyof Omit<co.SharedSlashCommandOptions, 'options'>
    ): ShouldOmitSubcommandFunctions extends true
        ? Omit<
              T &
                  AddOption<
                      this,
                      InteractionOption<TOptionType, TName, TRequired>
                  >,
              'addSubcommand' | 'addSubcommandGroup'
          >
        : T &
              AddOption<
                  this,
                  InteractionOption<TOptionType, TName, TRequired>
              > {
        const result =
            typeof input !== 'function' ? input : input(new Instance())
        const addOptionMethod = (
            this as unknown as co.SharedSlashCommandOptions
        )[addOptionMethodName] as (
            input: TSlashCommandOption
        ) => Omit<
            co.SharedSlashCommandOptions,
            'addSubcommand' | 'addSubcommandGroup'
        >
        return addOptionMethod(
            result
        ) as ShouldOmitSubcommandFunctions extends true
            ? Omit<
                  T &
                      AddOption<
                          this,
                          InteractionOption<TOptionType, TName, TRequired>
                      >,
                  'addSubcommand' | 'addSubcommandGroup'
              >
            : T &
                  AddOption<
                      this,
                      InteractionOption<TOptionType, TName, TRequired>
                  >
    }
}

abstract class InteractorBuilder extends SharedInteractorOptions<SlashCommandBuilder> {}
export class SlashCommandBuilder extends Mixin(
    InteractorBuilder,
    b.SlashCommandBuilder
) {
    public override addSubcommand(
        // Not need pass SlashCommandSubcommandBuilder instance
        input:
            | b.SlashCommandSubcommandBuilder
            | ((
                  subcommand: SlashCommandSubcommandBuilder
              ) => b.SlashCommandSubcommandBuilder)
    ): SlashCommandSubcommandsOnlyBuilder {
        const result =
            typeof input === 'function'
                ? input(new SlashCommandSubcommandBuilder())
                : input
        super.addSubcommand(result)
        return this
    }
}

export class SlashCommandSubcommandGroupBuilder extends b.SlashCommandSubcommandGroupBuilder {
    public override addSubcommand(
        // Not need pass SlashCommandSubcommandBuilder instance
        input:
            | b.SlashCommandSubcommandBuilder
            | ((
                  subcommand: SlashCommandSubcommandBuilder
              ) => b.SlashCommandSubcommandBuilder)
    ) {
        const result =
            typeof input === 'function'
                ? input(new SlashCommandSubcommandBuilder())
                : input
        super.addSubcommand(result)
        return this
    }
}

abstract class InteractorSubcommandBuilder extends SharedInteractorOptions<
    SlashCommandSubcommandBuilder,
    false
> {}
export class SlashCommandSubcommandBuilder extends Mixin(
    InteractorSubcommandBuilder,
    b.SlashCommandSubcommandBuilder
) {}

export interface SlashCommandSubcommandsOnlyBuilder
    extends SharedNameAndDescription,
        Pick<
            SlashCommandBuilder,
            'toJSON' | 'addSubcommand' | 'addSubcommandGroup'
        > {}
