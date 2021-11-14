import { MessageActionRow } from 'discord.js'
import { SlashCommandBuilder, SelectMenuCover } from '../common/interactive'
import { CommandPermissionsKey } from '../data-schemas/commandPermissionsDict'

export const test = new SlashCommandBuilder()
    .setDescription('test')
    .setDefaultPermission(false)
    .setPermissionsKeys(CommandPermissionsKey.DEV)
    .addStringOption(o => o.setName('a').setRequired(true).setDescription('a'))
    .addIntegerOption(o => o.setName('b').setDescription('b'))
    .addIntegerOption(o => o.setName('c').setDescription('c'))
    .addIntegerOption(o => o.setName('d').setDescription('d'))
    .setInteractor(async (interaction, options) => {
        await interaction.reply(
            '```json\n' + `${JSON.stringify(options)}` + '```'
        )
    })

export const test2 = new SlashCommandBuilder()
    .setDescription('test2')
    .setDefaultPermission(false)
    .setPermissionsKeys(CommandPermissionsKey.DEV)
    .addSubcommand(subcommand =>
        subcommand
            .setName('a')
            .setDescription('a')
            .setInteractor(async (interaction, options) => {
                await interaction.reply(
                    '```json\n' + `${JSON.stringify(options)}` + '```'
                )
            })
    )
    .addSubcommandGroup(subcommandGroup =>
        subcommandGroup
            .setName('b')
            .setDescription('b')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('a')
                    .setDescription('a')
                    .addBooleanOption(o => o.setName('c').setDescription('c'))
                    .setInteractor(async (interaction, options) => {
                        const component =
                            new testSelectMenu.Builder().setOptions({
                                label: '1',
                                value: '1',
                            })
                        component.setCustomId('124')
                        await interaction.reply({
                            content:
                                '```json\n' +
                                `${JSON.stringify(options)}` +
                                '```',
                            components: [
                                new MessageActionRow().setComponents(component),
                            ],
                        })
                    })
            )
    )

export const testSelectMenu = new SelectMenuCover(async interaction => {
    await interaction.update({ components: [] })
})
