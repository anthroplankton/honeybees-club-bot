import EventEmitter from 'events'
import fs from 'fs/promises'
import path from 'path'
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv'

const ajv = new Ajv()

export type Data = typeof data
export type DataName = keyof Data
const data = {
    guildIdCollection: {} as Record<string, string>,
    cafeteriaRolesCollection: {} as Record<
        string,
        { role: string; emoji?: string }[]
    >,
}
export default data
export const dataNames: DataName[] = [
    'guildIdCollection',
    'cafeteriaRolesCollection',
]

const schemas: { [K in DataName]: JSONSchemaType<Data[K]> } = {
    guildIdCollection: {
        type: 'object',
        required: [],
        additionalProperties: { type: 'string', pattern: String.raw`\d{18}` },
    } as JSONSchemaType<typeof data.guildIdCollection>,
    cafeteriaRolesCollection: {
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
    } as JSONSchemaType<typeof data.cafeteriaRolesCollection>,
}

const validates: { [K in DataName]?: ValidateFunction<Data[K]> } = {}

interface DataLoader {
    emit<K extends DataName>(eventName: K, data: Data[K]): boolean
    on<K extends DataName>(
        eventName: K,
        listener: (data: Data[K]) => void
    ): this
}
class DataLoader extends EventEmitter {}
export const dataLoader: Pick<DataLoader, 'on' | 'emit'> = new DataLoader()

export async function load() {
    await Promise.all(dataNames.map(loadAndWatch))
    console.log('Loading completed: data')
    console.log(data)
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
        throw validate.errors
    }
    dataLoader.emit(dataName, json as Data[K])
    return (data[dataName] = json as Data[K])
}

function getFilename(dataName: DataName) {
    return path.format({ dir: './data', name: dataName, ext: '.json' })
}

async function loadAndWatch(dataName: DataName) {
    try {
        await loadJSON(dataName)
    } catch (err) {
        console.error(err)
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
            console.log(`Reloaded JSON data: "${dataName}".`)
        }
    } catch (err) {
        console.error(err)
    }
}
