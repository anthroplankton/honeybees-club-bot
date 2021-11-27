import type { Snowflake } from 'discord.js'
import { JSONSchemaType } from 'ajv'
import { GUILD_EXACT_PATTERN } from '../common/pattern'

export const data: Readonly<Partial<Record<string, Snowflake>>> = {}
export const schema: JSONSchemaType<typeof data> = {
    description: 'Map guild keys to the corresponding guild IDs.',
    type: 'object',
    required: [],
    additionalProperties: {
        description: 'The corresponding guild ID.',
        type: 'string',
        pattern: GUILD_EXACT_PATTERN.source,
    },
}

type Data = typeof data
export default Data
