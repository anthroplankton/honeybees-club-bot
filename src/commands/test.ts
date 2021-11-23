import { MessageActionRow } from 'discord.js'
import { ApplicationCommandType } from 'discord-api-types'
import { codeBlock } from '@discordjs/builders'
import {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    ContextMenuCommandBuilder,
    ButtonCover,
    SelectMenuCover,
} from '../common/interactive'
import { CommandPermissionsKey } from '../data-schemas/commandPermissionsDict'

const button = new SlashCommandSubcommandBuilder()
    .setName('button')
    .setDescription('test button')
    .setInteractor(async interaction => {
        const component = new testMessageButton.Builder()
            .setStyle('PRIMARY')
            .setLabel(testMessageButton.customId)
        await interaction.reply({
            content: testMessageButton.customId,
            components: [new MessageActionRow().setComponents(component)],
        })
    })

const selectMenu = new SlashCommandSubcommandBuilder()
    .setName('selectmenu')
    .setDescription('test select munu')
    .setInteractor(async interaction => {
        const component = new testSelectMenu.Builder().setOptions({
            label: testSelectMenu.customId,
            value: testSelectMenu.customId,
        })
        await interaction.reply({
            content: testSelectMenu.customId,
            components: [new MessageActionRow().setComponents(component)],
        })
    })

export const test = new SlashCommandBuilder()
    .setDescription('test')
    .setDefaultPermission(false)
    .setPermissionsKeys(CommandPermissionsKey.DEV)
    .addSubcommand(button)
    .addSubcommand(selectMenu)
    .addSubcommandGroup(subcommandGroup =>
        subcommandGroup
            .setName('subcommandgroup')
            .setDescription('test subcommand group')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('subcommand')
                    .setDescription('test subcommand')
                    .addStringOption(o =>
                        o.setName('string').setDescription('string')
                    )
                    .addIntegerOption(o =>
                        o.setName('integer').setDescription('integer')
                    )
                    .addBooleanOption(o =>
                        o.setName('boolean').setDescription('boolean')
                    )
                    .addUserOption(o =>
                        o.setName('user').setDescription('user')
                    )
                    .addChannelOption(o =>
                        o.setName('channel').setDescription('channel')
                    )
                    .addRoleOption(o =>
                        o.setName('role').setDescription('role')
                    )
                    .addMentionableOption(o =>
                        o.setName('mention').setDescription('mention')
                    )
                    .addNumberOption(o =>
                        o.setName('number').setDescription('number')
                    )
                    .setInteractor(async (interaction, options) => {
                        await interaction.reply(
                            codeBlock('json', JSON.stringify(options, null, 2))
                        )
                    })
            )
    )

export const testSelectMenu = new SelectMenuCover(
    async (interaction, values) => {
        await interaction.update({
            content: values.join('|'),
            components: [],
        })
    }
)

export const testMessageButton = new ButtonCover(async interaction => {
    await interaction.update({
        content: testMessageButton.customId,
        components: [],
    })
})

export const testUserCommand = new ContextMenuCommandBuilder()
    .setType(ApplicationCommandType.User)
    .setDefaultPermission(false)
    .setPermissionsKeys(CommandPermissionsKey.DEV)
    .setInteractor(async (interaction, { user }) => {
        await interaction.reply(
            codeBlock('json', JSON.stringify(user, null, 2))
        )
    })

export const testMessageCommand = new ContextMenuCommandBuilder()
    .setType(ApplicationCommandType.Message)
    .setDefaultPermission(false)
    .setPermissionsKeys(CommandPermissionsKey.DEV)
    .setInteractor(async (interaction, { message }) => {
        await interaction.reply(
            codeBlock('json', JSON.stringify(message, null, 2))
        )
    })
