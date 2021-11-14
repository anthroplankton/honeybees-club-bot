import type { Snowflake } from 'discord.js'
import { JSONSchemaType } from 'ajv'

export const data: Readonly<Partial<Record<string, Snowflake>>> = {}
export const schema: JSONSchemaType<typeof data> = {
    type: 'object',
    required: [],
    additionalProperties: { type: 'string', pattern: String.raw`\d{18}` },
}

type Data = typeof data
export default Data
