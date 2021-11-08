import type { Client, Snowflake } from 'discord.js'
import EventEmitter from 'events'
import fs from 'fs/promises'
import path from 'path'
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv'
import { black, bgGreen, bgBlue } from 'chalk'
import { inspect } from 'util'
import logger from '../common/log'

let djsClient: Client
const ajv = new Ajv()

export type Data = typeof data
export type DataName = keyof Data
const data = {
    guildIdDict: {} as Partial<Record<string, Snowflake>>,
    cafeteriaRolesDict: {} as Partial<
        Record<string, { role: string; emoji?: string | null }[]>
    >,
}
export default data
export const dataNames: DataName[] = ['guildIdDict', 'cafeteriaRolesDict']

/* JSONSchemaType incorrectly requires optional properties to be nullable
 * https://github.com/ajv-validator/ajv/issues/1664
 */
/* JSONSchemaType change nullable to be for nulls not undefined
 * https://github.com/ajv-validator/ajv/pull/1701
 */
const schemas: { [K in DataName]: JSONSchemaType<Data[K]> } = {
    guildIdDict: {
        type: 'object',
        required: [],
        additionalProperties: { type: 'string', pattern: String.raw`\d{18}` },
    } as JSONSchemaType<typeof data.guildIdDict>,
    cafeteriaRolesDict: {
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
    } as JSONSchemaType<typeof data.cafeteriaRolesDict>,
}

const validates: { [K in DataName]?: ValidateFunction<Data[K]> } = {}

const isReadySet = new Set<DataName>()

class DataEmitter extends EventEmitter {
    constructor() {
        super()
        for (const dataName of dataNames) {
            super.once(dataName, () => isReadySet.add(dataName))
        }
    }
    private static wrap<K extends DataName>(
        listener: (client: Client, data: Data[K]) => void
    ) {
        return async (client: Client, data: Data[K]) => {
            try {
                await listener(client, data)
            } catch (err) {
                client.emit('error', err as Error)
            }
        }
    }
    public isReady(dataName: DataName) {
        return isReadySet.has(dataName)
    }
    public emit<K extends DataName>(eventName: K, data: Data[K]) {
        return super.emit(eventName, djsClient, data)
    }
    public on<K extends DataName>(
        eventName: K,
        listener: (client: Client, data: Data[K]) => void
    ) {
        return super.on(eventName, DataEmitter.wrap(listener))
    }
    public once<K extends DataName>(
        eventName: K,
        listener: (client: Client, data: Data[K]) => void
    ) {
        return super.once(eventName, DataEmitter.wrap(listener))
    }
}
export const dataEmitter: Pick<
    DataEmitter,
    'isReady' | 'emit' | 'on' | 'once'
> = new DataEmitter()

export async function load(client: Client) {
    djsClient = client
    await Promise.all(dataNames.map(loadAndWatch))
    logger.event('Loading Completed', bgBlue('data'), data)
}

export async function loadJSON<K extends DataName>(dataName: K) {
    const file = await fs.readFile(getFilename(dataName), 'utf8')
    const json = JSON.parse(file)
    let validate = validates[dataName]
    if (validate === undefined) {
        validate = validates[dataName] = ajv.compile(
            schemas[dataName]
        ) as Required<typeof validates>[K]
    }
    if (!validate(json)) {
        throw new Error(inspect(validate.errors))
    }
    data[dataName] = json as Data[K]
    dataEmitter.emit(dataName, json as Data[K])
    return json as Data[K]
}

function getFilename(dataName: DataName) {
    return path.format({ dir: './data', name: dataName, ext: '.json' })
}

async function loadAndWatch(dataName: DataName) {
    try {
        await loadJSON(dataName)
    } catch (err) {
        console.error(err)
        dataEmitter.emit(dataName, data[dataName])
    }
    watch(dataName)
}

async function watch(dataName: DataName) {
    try {
        const watcher = fs.watch(getFilename(dataName))
        for await (const event of watcher) {
            if (event.eventType != 'change') {
                continue
            }
            await loadJSON(dataName)
            logger.info('Reloaded JSON data', bgGreen(black(dataName)))
        }
    } catch (err) {
        console.error(err)
    }
}
