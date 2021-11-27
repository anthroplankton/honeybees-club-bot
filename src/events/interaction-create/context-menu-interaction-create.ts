import type { ContextMenuInteraction } from 'discord.js'
import type { ContextMenuCommandBuilder } from '../../common/interactive'

import { bgGray } from 'chalk'
import { LogPath, LogTree } from '../../common/log'
import { ApplicationCommandTypeNames } from '../../common/interactive'
import { BaseInteractionCreateListener } from './base-interaction-create'

export class ContextMenuInteractionCreateListener extends BaseInteractionCreateListener<
    ContextMenuInteraction,
    ContextMenuCommandBuilder
> {
    public constructor() {
        super('context menu')
    }

    protected override _setInteractive(builder: ContextMenuCommandBuilder) {
        this._interactiveMap.set(builder.name, builder)
    }

    protected override _getInteractive({
        commandName,
    }: ContextMenuInteraction): [
        builder: ContextMenuCommandBuilder | undefined,
        commandPath: LogPath
    ] {
        const builder = this._interactiveMap.get(commandName)
        const commandPath = new LogPath().setName(commandName)
        return [builder, commandPath]
    }

    protected override _makeLogTree() {
        const builders = this._interactiveMap.values()
        const logTree = new LogTree()
        for (const { type, name, permissionsKeys } of builders) {
            const typeName = ApplicationCommandTypeNames[type]
            const child = new LogTree()
                .setName(name)
                .addChildren(new LogTree().setName('').setValue(typeName))
            if (permissionsKeys.length) {
                child.setValue(bgGray('@' + permissionsKeys.join('|')))
            }
            logTree.addChildren(child)
        }
        return logTree
    }

    protected override async _interact(
        interaction: ContextMenuInteraction,
        builder: ContextMenuCommandBuilder
    ) {
        const typeName = ApplicationCommandTypeNames[builder.type]
        const options = {
            [typeName.toLowerCase()]: interaction.options[`get${typeName}`](
                typeName.toLowerCase(),
                true
            ),
        }
        await builder.interactor(interaction, options)
    }
}
