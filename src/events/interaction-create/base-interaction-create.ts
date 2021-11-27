import type { Interaction } from 'discord.js'
import type { LogPath, LogTree } from '../../common/log'

import { bgBlue } from 'chalk'
import logger from '../../common/log'

export abstract class BaseInteractionCreateListener<
    TInteraction extends Interaction,
    TInteractive,
    TEndInteractive = TInteractive
> {
    public readonly name: string
    protected readonly _interactiveMap: Map<string, TEndInteractive>

    public constructor(name: string) {
        this.name = name
        this._interactiveMap = new Map()
    }

    public load(interactives: TInteractive[]) {
        for (const interactive of interactives) {
            this._setInteractive(interactive)
        }
        logger.event(
            'Loading Completed',
            bgBlue(this.name),
            this._makeLogTree()
        )
    }

    public async interact(interaction: TInteraction) {
        const [interactive, interactionPath] = this._getInteractive(interaction)
        if (interactive == undefined) {
            throw new Error(
                `The ${this.name} interaction "${interactionPath}" does not bind.`
            )
        }
        logger.event('Interaction Create', bgBlue(this.name), interactionPath)
        await this._interact(interaction, interactive)
    }

    protected abstract _setInteractive(interactive: TInteractive): void
    protected abstract _getInteractive(
        interaction: TInteraction
    ): [interactive: TEndInteractive | undefined, interactionPath: LogPath]
    protected abstract _makeLogTree(): LogTree
    protected abstract _interact(
        interaction: TInteraction,
        interactive: TEndInteractive
    ): Promise<void>
}
