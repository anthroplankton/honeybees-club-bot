import type {
    MessageComponentInteraction,
    ButtonInteraction,
    SelectMenuInteraction,
} from 'discord.js'
import type { ButtonCover, SelectMenuCover } from '../../common/interactive'
import { LogPath, LogTree } from '../../common/log'
import { BaseInteractionCreateListener } from './base-interaction-create'

export abstract class MessageComponentInteractionCreateListener<
    TInteraction extends MessageComponentInteraction,
    TCover extends { customId: string }
> extends BaseInteractionCreateListener<TInteraction, TCover> {
    protected override _setInteractive(
        map: Map<string, TCover>,
        cover: TCover
    ) {
        map.set(cover.customId, cover)
    }

    protected override _getInteractive(
        map: Map<string, TCover>,
        { customId }: TInteraction
    ): [cover: TCover | undefined, componentPath: LogPath] {
        const cover = map.get(customId)
        const componentPath = new LogPath().setName(customId)
        return [cover, componentPath]
    }

    protected override _makeLogTree(map: Map<string, TCover>) {
        const logTree = new LogTree().addChildren(
            ...Array.from(map.keys(), customId =>
                new LogTree().setName(customId)
            )
        )
        return logTree
    }
}

export class SelectMenuInteractionCreateListener extends MessageComponentInteractionCreateListener<
    SelectMenuInteraction,
    SelectMenuCover
> {
    public constructor() {
        super('button')
    }

    protected override async _interact(
        interaction: SelectMenuInteraction,
        cover: SelectMenuCover
    ) {
        await cover.interactor(interaction, interaction.values)
    }
}

export class ButtonInteractionCreateListener extends MessageComponentInteractionCreateListener<
    ButtonInteraction,
    ButtonCover
> {
    public constructor() {
        super('select menu')
    }

    protected override async _interact(
        interaction: ButtonInteraction,
        cover: ButtonCover
    ) {
        await cover.interactor(interaction)
    }
}
