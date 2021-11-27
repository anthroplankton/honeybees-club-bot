import { JSONSchemaType } from 'ajv'

export const data: Readonly<
    Partial<
        Record<
            string,
            Readonly<{
                role: string
                description?: string | null
                emoji?: string | null
            }>[]
        >
    >
> = {}
export const schema: JSONSchemaType<typeof data> = {
    description:
        'Map guild keys to an array of role objects for select menu option.',
    type: 'object',
    required: [],
    additionalProperties: {
        description: 'Role objects for select menu option.',
        type: 'array',
        uniqueItems: true,
        items: {
            description: 'A Role object for select menu option.',
            type: 'object',
            required: ['role'],
            properties: {
                role: {
                    description: 'A Role name in specified guild.',
                    type: 'string',
                },
                description: {
                    description: 'A Description of the select menu option.',
                    type: 'string',
                    nullable: true,
                },
                emoji: {
                    description: 'An emoji name of the select menu option.',
                    type: 'string',
                    nullable: true,
                    pattern: String.raw`^[_0-9A-Za-z]+$`,
                },
            },
            additionalProperties: false,
        },
    },
}

type Data = typeof data
export default Data
