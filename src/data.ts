import EventEmitter from 'events'
import fs from 'fs/promises'
import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv'

const ajv = new Ajv()

type Data = typeof data
const data = {
    guildIdCollection: {} as Record<string, string>,
    cafeteriaRolesCollection: {} as Record<
        string,
        { role: string; emoji?: string }[]
    >,
}
export default data

const schemas: { [K in keyof Data]: JSONSchemaType<Data[K]> } = {
    guildIdCollection: {
        additionalProperties: { type: 'string', pattern: String.raw`\d{18}` },
    } as JSONSchemaType<typeof data.guildIdCollection>,
    cafeteriaRolesCollection: {
        type: 'object',
        required: [],
        additionalProperties: {
            type: 'array',
            uniqueItem: true,
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

const validates: { [K in keyof Data]?: ValidateFunction<Data[K]> } = {}

interface DataLoader {
    emit<K extends keyof Data>(eventName: K, data: Data[K]): boolean
    on<K extends keyof Data>(
        eventName: K,
        listener: (data: Data[K]) => void
    ): this
}
class DataLoader extends EventEmitter {}
export const dataLoader: Pick<DataLoader, 'on' | 'emit'> = new DataLoader()

export async function load() {
    await Promise.all(
        Object.keys(data).map(
            async dataName => await loadAndWatch(dataName as keyof Data)
        )
    )
}
export async function loadJSON<K extends keyof Data>(dataName: K) {
    const file = await fs.readFile(`./data/${dataName}.json`, 'utf8')
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

async function loadAndWatch(dataName: keyof Data) {
    try {
        await loadJSON(dataName)
    } catch (err) {
        console.log(err)
    }
    watch(dataName)
}

async function watch(dataName: keyof Data) {
    try {
        const watcher = fs.watch(dataName)
        for await (const event of watcher) {
            if (event.eventType != 'change') {
                continue
            }
            await loadJSON(dataName)
            console.log(`Reload JSON data: ${dataName}.`)
        }
    } catch (err) {
        console.log(err)
    }
}
