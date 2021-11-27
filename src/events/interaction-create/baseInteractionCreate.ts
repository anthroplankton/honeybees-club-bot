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
    private readonly _interactiveMap: Map<string, TEndInteractive>

    public constructor(name: string) {
        this.name = name
        this._interactiveMap = new Map()
    }

    public load(interactives: TInteractive[]) {
        for (const interactive of interactives) {
            this._setInteractive(this._interactiveMap, interactive)
        }
        logger.event(
            'Loading Completed',
            bgBlue(this.name),
            this._makeLogTree(this._interactiveMap)
        )
    }

    public async handle(interaction: TInteraction) {
        const [interactive, interactionPath] = this._getInteractive(
            this._interactiveMap,
            interaction
        )
        if (interactive == undefined) {
            throw new Error(
                `The ${this.name} "${interactionPath}" does not bind.`
            )
        }
        logger.event('Interaction Create', bgBlue(this.name), interactionPath)
        await this._interact(interaction, interactive)
    }

    protected abstract _setInteractive(
        map: Map<string, TEndInteractive>,
        interactive: TInteractive
    ): void
    protected abstract _getInteractive(
        map: Map<string, TEndInteractive>,
        interaction: TInteraction
    ): [interactive: TEndInteractive | undefined, interactionPath: LogPath]
    protected abstract _makeLogTree(map: Map<string, TEndInteractive>): LogTree
    protected abstract _interact(
        interaction: TInteraction,
        interactive: TEndInteractive
    ): Promise<void>
}
