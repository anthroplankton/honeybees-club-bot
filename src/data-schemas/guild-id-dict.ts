import type { Snowflake } from 'discord.js'
import { JSONSchemaType } from 'ajv'

export const data: Readonly<Partial<Record<string, Snowflake>>> = {}
export const schema: JSONSchemaType<typeof data> = {
    description: 'Map guild keys to the corresponding guild IDs.',
    type: 'object',
    required: [],
    additionalProperties: {
        description: 'The corresponding guild ID.',
        type: 'string',
        pattern: String.raw`^\d{18}$`,
    },
}

type Data = typeof data
export default Data
