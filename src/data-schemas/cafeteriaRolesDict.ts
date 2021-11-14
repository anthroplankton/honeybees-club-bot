import { JSONSchemaType } from 'ajv'

export const data: Readonly<
    Partial<Record<string, Readonly<{ role: string; emoji?: string | null }>[]>>
> = {}
export const schema: JSONSchemaType<typeof data> = {
    type: 'object',
    required: [],
    additionalProperties: {
        type: 'array',
        uniqueItems: true,
        items: {
            type: 'object',
            required: ['role'],
            properties: {
                role: { type: 'string' },
                emoji: {
                    type: 'string',
                    nullable: true,
                    pattern: String.raw`[_0-9A-Za-z]`,
                },
            },
            additionalProperties: false,
        },
    },
}

type Data = typeof data
export default Data
