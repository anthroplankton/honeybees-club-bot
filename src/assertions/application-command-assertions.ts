import ow from 'ow'

/**
 * @see https://discord.com/developers/docs/interactions/application-commands#registering-a-command
 */
export function validateChatInputCommandAmount(amount: number) {
    ow(amount, 'chat-input command amount', ow.number.lessThanOrEqual(100))
}

/**
 * @see https://discord.com/developers/docs/interactions/application-commands#registering-a-command
 */
export function validateUserCommandAmount(amount: number) {
    ow(amount, 'user command amount', ow.number.lessThanOrEqual(5))
}

/**
 * @see https://discord.com/developers/docs/interactions/application-commands#registering-a-command
 */
export function validateMessageCommandAmount(amount: number): void {
    ow(amount, 'message command amount', ow.number.lessThanOrEqual(5))
}
