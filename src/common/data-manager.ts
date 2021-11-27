import type GuildIdDict from '../data-schemas/guildIdDict'
import type CafeteriaRolesDict from '../data-schemas/cafeteriaRolesDict'
import type CommandPermissionsDict from '../data-schemas/commandPermissionsDict'
import EventEmitter from 'events'
import fs from 'fs/promises'
import path from 'path/posix'
import { inspect } from 'util'
import Ajv, { ValidateFunction } from 'ajv'
import { black, bgGreen, bgBlue } from 'chalk'
import logger from './log'

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
    guildIdDict: GuildIdDict
    cafeteriaRolesDict: CafeteriaRolesDict
    commandPermissionsDict: CommandPermissionsDict
}
export const data = {} as Data
export type DataName = typeof dataNames[number]
export const dataNames = [
    'cafeteriaRolesDict',
    'commandPermissionsDict',
    'guildIdDict',
] as const
export default data as Readonly<Data>

type DataKeyContainsDataName = DataName extends keyof Data ? true : false
type DataNameContainsDataKey = keyof Data extends DataName ? true : false
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const checking: DataNameContainsDataKey & DataKeyContainsDataName = true

const validates: { [K in DataName]?: ValidateFunction<Data[K]> } = {}

const isReadySet = new Set<DataName>()

interface DataEmitter {
    emit<K extends DataName>(eventName: K, data: Data[K]): boolean
    on<K extends DataName>(
        eventName: K,
        listener: (data: Data[K]) => void
    ): this
    once<K extends DataName>(
        eventName: K,
        listener: (data: Data[K]) => void
    ): this
}
class DataEmitter extends EventEmitter {
    constructor() {
        super()
        for (const dataName of dataNames) {
            super.once(dataName, () => isReadySet.add(dataName))
        }
    }
    public isReady(dataName: DataName) {
        return isReadySet.has(dataName)
    }
}
export const dataEmitter: Pick<
    DataEmitter,
    'isReady' | 'emit' | 'on' | 'once'
> = new DataEmitter()

export async function load() {
    await Promise.all(dataNames.map(loadAndWatch))
    logger.event('Loading Completed', bgBlue('data'), data)
}

export async function loadJSON<K extends DataName>(
    dataName: K
): Promise<Data[K]> {
    const [json, validate] = await Promise.all([
        (async () => {
            const file = await fs.readFile(getFilename(dataName), 'utf8')
            return JSON.parse(file)
        })(),
        (async () => {
            if (validates[dataName] === undefined) {
                const { data: aData, schema } = await importDataSchema(dataName)
                data[dataName] = aData
                validates[dataName] = ajv.compile(schema) as Required<
                    typeof validates
                >[K]
            }
            return validates[dataName] as Required<typeof validates>[K]
        })(),
    ])
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

export function getFilename(dataName: DataName) {
    return path.format({ dir: './data', name: dataName, ext: '.json' })
}

export async function importDataSchema(dataName: DataName) {
    return await import(path.join('../data-schemas', dataName))
}

async function loadAndWatch(dataName: DataName) {
    try {
        await loadJSON(dataName)
    } catch (err) {
        logger.error(err)
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
        logger.error(err)
    }
}
