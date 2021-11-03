import { SlashCommandBuilder } from '../common/interactive'

export const test = new SlashCommandBuilder()
    .setDescription('test')
    .addStringOption(o => o.setName('a').setRequired(true).setDescription('a'))
    .addIntegerOption(o => o.setName('b').setDescription('b'))
    .addIntegerOption(o => o.setName('c').setDescription('c'))
    .addIntegerOption(o => o.setName('d').setDescription('d'))
    .setInteractor(async (interaction, options) => {
        options.a
        options.b
        options.c
        options.d
        await interaction.reply(
            '```json\n' + `${JSON.stringify(options)}` + '```'
        )
    })
