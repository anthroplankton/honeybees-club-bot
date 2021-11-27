export function toExact(pattren: RegExp) {
    return new RegExp(`^${pattren.source}$`)
}

export const USER_PATTERN = /\d{18}/
export const USER_EXACT_PATTERN = toExact(USER_PATTERN)

export const GUILD_PATTERN = /\d{18}/
export const GUILD_EXACT_PATTERN = toExact(GUILD_PATTERN)

export const CHANNEL_PATTERN = /\d{18}/
export const CHANNEL_EXACT_PATTERN = toExact(CHANNEL_PATTERN)
