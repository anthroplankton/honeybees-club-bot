import { SlashCommandBuilder } from '../common/interactive'

export const test = new SlashCommandBuilder()
    .setDescription('test')
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
                        await interaction.reply(
                            '```json\n' + `${JSON.stringify(options)}` + '```'
                        )
                    })
            )
    )
