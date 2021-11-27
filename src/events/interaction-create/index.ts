import type { Client, Interaction } from 'discord.js'
import logger from '../../common/log'
import { loadInteractive } from '../../common/commandManager'
import { CommandInteractionCreateListener } from './commandInteractionCreate'
import { ContextMenuInteractionCreateListener } from './contextMenuInteractionCreate'
import {
    ButtonInteractionCreateListener,
    SelectMenuInteractionCreateListener,
} from './messageComponentInteractionCreate'

const commandListener = new CommandInteractionCreateListener()
const contextMenuListener = new ContextMenuInteractionCreateListener()
const buttonListener = new ButtonInteractionCreateListener()
const selectMenuListener = new SelectMenuInteractionCreateListener()

export async function load(client: Client) {
    const {
        slashCommandBuilders,
        contextMenuCommandBuilders,
        buttonCovers,
        selectMenuCovers,
    } = await loadInteractive(client)

    commandListener.load(slashCommandBuilders)
    contextMenuListener.load(contextMenuCommandBuilders)
    buttonListener.load(buttonCovers)
    selectMenuListener.load(selectMenuCovers)
}

export async function listener(interaction: Interaction) {
    try {
        if (interaction.isCommand()) {
            await commandListener.handle(interaction)
        } else if (interaction.isContextMenu()) {
            await contextMenuListener.handle(interaction)
        } else if (interaction.isButton()) {
            await buttonListener.handle(interaction)
        } else if (interaction.isSelectMenu()) {
            await selectMenuListener.handle(interaction)
        }
    } catch (err) {
        logger.error(err)
        await replyError(interaction)
    }
}

async function replyError(interaction: Interaction) {
    if (interaction.isApplicationCommand()) {
        const reply = {
            content: 'There was an error while executing this command!',
            ephemeral: interaction.ephemeral ?? true,
        }
        await (interaction.replied
            ? interaction.followUp(reply)
            : interaction.reply(reply))
    } else if (interaction.isMessageComponent()) {
        if (interaction.customId.startsWith('!')) {
            return
        }
        const reply = {
            content:
                'There was an error while replying this message component!',
            ephemeral: interaction.ephemeral ?? true,
        }
        await Promise.all([
            interaction.update({
                components: [],
            }),
            interaction.followUp(reply),
        ])
    }
}
