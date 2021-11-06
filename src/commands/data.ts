import type {
    CommandInteraction,
    MessageComponentInteraction,
} from 'discord.js'
import type { DataName } from '../common/dataManager'
import { MessageActionRow, InteractionCollector } from 'discord.js'
import { inlineCode, blockQuote } from '@discordjs/builders'
import { dataNames, loadJSON } from '../common/dataManager'
import {
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SelectMenuCover,
} from '../common/interactive'

const all = new SlashCommandSubcommandBuilder()
    .setName('all')
    .setDescription('reload all data')
    .setInteractor(async interaction => {
        await Promise.all([
            interaction.reply({
                content:
                    'To reload the following data:\n' +
                    blockQuote(dataNames.map(inlineCode).join('\n')),
            }),
            reloadSelectedData(interaction, dataNames),
        ])
    })

const selected = new SlashCommandSubcommandBuilder()
    .setName('selected')
    .setDescription('select data, then reload they')
    .setInteractor(async interaction => {
        const reply = await interaction.reply({
            content: 'Select the data to reload.',
            components: [new MessageActionRow().setComponents(component)],
            fetchReply: true,
        })
        const collector = new InteractionCollector(interaction.client, {
            message: reply,
            time: 10_000,
        })
        const collected = await new Promise<{ size: number }>(res =>
            collector.once('end', res)
        )
        if (collected.size) {
            return
        }
        await interaction.editReply({
            components: [
                new MessageActionRow().setComponents(timeoutComponent),
            ],
        })
    })

export const data = new SlashCommandBuilder()
    .setDescription('handle data')
    .addSubcommandGroup(subcommandGroup =>
        subcommandGroup
            .setName('reload')
            .setDescription('reload data')
            .addSubcommand(all)
            .addSubcommand(selected)
    )

async function reloadSelectedData(
    interaction: CommandInteraction | MessageComponentInteraction,
    dataNames: DataName[]
) {
    await Promise.all(
        dataNames.map(async dataName => {
            try {
                await loadJSON(dataName)
            } catch (err) {
                console.error(err)
                await interaction.followUp(
                    `Failed to reload ${inlineCode(dataName)}`
                )
                return
            }
            console.log(`Reloaded JSON data: "${dataName}".`)
            await interaction.followUp(
                `Successfully reloaded ${inlineCode(dataName)}.`
            )
        })
    )
}

export const reloadSelectedDataSelectMenu = new SelectMenuCover(
    async (interaction, dataNames: DataName[]) => {
        await Promise.all([
            interaction.update({
                content:
                    'To reload the following data:\n' +
                    blockQuote(dataNames.map(inlineCode).join('\n')),
                fetchReply: true,
                components: [],
            }),
            reloadSelectedData(interaction, dataNames),
        ])
    }
)

const component = new reloadSelectedDataSelectMenu.Builder()
    .setPlaceholder('Make a selection in 1 minute')
    .setMinValues(0)
    .setMaxValues(dataNames.length)
    .setOptions(
        dataNames.map(dataName => ({
            label: dataName,
            value: dataName,
        }))
    )

const timeoutComponent = new reloadSelectedDataSelectMenu.Builder()
    .setDisabled()
    .setPlaceholder('Timeout')
