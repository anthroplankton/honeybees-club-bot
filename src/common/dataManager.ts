import type { Client } from 'discord.js'
import type guildIdDict from '../data-schemas/guildIdDict'
import type cafeteriaRolesDict from '../data-schemas/cafeteriaRolesDict'
import type commandPermissionsDict from '../data-schemas/commandPermissionsDict'
import EventEmitter from 'events'
import fs from 'fs/promises'
import path from 'path'
import { inspect } from 'util'
import Ajv, { ValidateFunction } from 'ajv'
import { black, bgGreen, bgBlue } from 'chalk'
import logger from './log'

let djsClient: Client
/* Ajv 8.6.0 makes VSCode IntelliSense extremely slow
 * https://github.com/ajv-validator/ajv/issues/1667
 */
/* Semantic highlighting (encodedSemanticClassifications-full) extremely slow
 * https://github.com/microsoft/TypeScript/issues/44851
 */
/* JSONSchemaType incorrectly requires optional properties to be nullable
 * https://github.com/ajv-validator/ajv/issues/1664
 */
/* JSONSchemaType change nullable to be for nulls not undefined
 * https://github.com/ajv-validator/ajv/pull/1701
 */
const ajv = new Ajv()

export interface Data {
    guildIdDict: guildIdDict
    cafeteriaRolesDict: cafeteriaRolesDict
    commandPermissionsDict: commandPermissionsDict
}
export const data = {} as Data
export type DataName = typeof dataNames[number]
export const dataNames = [
    'cafeteriaRolesDict' as const,
    'commandPermissionsDict' as const,
    'guildIdDict' as const,
]
export default data

type DataKeyContainsDataName = DataName extends keyof Data ? true : false
type DataNameContainsDataKey = keyof Data extends DataName ? true : false
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const checking: DataNameContainsDataKey & DataKeyContainsDataName = true

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

export async function loadJSON<K extends DataName>(
    dataName: K
): Promise<Data[K]> {
    const file = await fs.readFile(getFilename(dataName), 'utf8')
    const json = JSON.parse(file)
    let validate = validates[dataName]
    if (validate === undefined) {
        const { data: aData, schema } = await import(
            path.join('../data-schemas', dataName)
        )
        data[dataName] = aData
        validate = validates[dataName] = ajv.compile(schema) as Required<
            typeof validates
        >[K]
    }
    if (!validate(json)) {
        throw new Error(
            `Failed to validate JSON data "${dataName}" ${inspect(
                validate.errors
            )}`
        )
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
