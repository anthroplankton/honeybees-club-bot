import type { InspectOptions } from 'util'
import type { Chalk } from 'chalk'

import { inspect } from 'util'
import { red, green, yellow, blue, cyan, gray } from 'chalk'

export const enum Level {
    DEBUG = 0,
    EVENT = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4,
}

const LevelNameDict = {
    [Level.DEBUG]: 'DEBUG',
    [Level.EVENT]: 'EVENT',
    [Level.INFO]: 'INFO',
    [Level.WARN]: 'WARN',
    [Level.ERROR]: 'ERROR',
} as const

export type Event = 'Loading Completed' | 'Interaction Create'

type MethodName = 'debug' | 'info' | 'warn' | 'error'

type LogParameters = Parameters<typeof console['log']>

export default {
    debug(...args: LogParameters) {
        log('debug', Level.DEBUG, cyan, args)
    },
    event(event: Event, ...args: LogParameters) {
        log('debug', event, blue, args)
    },
    info(...args: LogParameters) {
        log('info', Level.INFO, green, args)
    },
    warn(...args: LogParameters) {
        log('warn', Level.WARN, yellow, args)
    },
    error(...args: LogParameters) {
        log('error', Level.ERROR, red, args)
    },
}

function log(
    methodName: MethodName,
    levelOrEvent: Level | Event,
    chalk: Chalk,
    args: LogParameters
) {
    const prefix =
        typeof levelOrEvent === 'number'
            ? LevelNameDict[levelOrEvent]
            : levelOrEvent
    console[methodName](chalk(prefix) + gray(':'), ...args)
}

export class LogPath {
    public name?: string
    public next?: LogPath
    public setName(name: string) {
        this.name = name
        return this
    }
    public setNext(input: LogPath | ((next: LogPath) => LogPath)) {
        const result =
            typeof input === 'function' ? input(new LogPath()) : input
        this.next = result
        return this.next
    }
    public [inspect.custom](depth: number, options: InspectOptions) {
        const name = cyan(this.name ?? '')
        if (this.next === undefined) {
            return name
        } else {
            return `${name}/${inspect(this.next, options)}`
        }
    }
    public toString() {
        return inspect(this)
    }
}

export class LogTree {
    public name?: string
    public value?: string
    public children: LogTree[] = []
    public setName(name: string) {
        this.name = name
        return this
    }
    public setValue(value: string) {
        this.value = value
        return this
    }
    public addChildren(...inputs: (LogTree | ((child: LogTree) => LogTree))[]) {
        const results = inputs.map(input =>
            typeof input === 'function' ? input(new LogTree()) : input
        )
        this.children.push(...results)
        return this
    }
    [inspect.custom](depth: number, options: InspectOptions) {
        // ├ ─ └ │ ┐
        const space = 4
        const representation: string[] = []
        const name =
            this.name === undefined ? gray('─┐') : cyan(` ${this.name}`)
        const { value, children } = this
        if (value === undefined) {
            representation.push(name)
        } else {
            representation.push(`${name}${gray(': ')}${value}`)
        }
        const childrenRepresentation = children.map((child, i, arr) => {
            const lineToSelf =
                (i == arr.length - 1 ? ' └' : ' ├') + '─'.repeat(space - 2)
            const lineToSibling =
                (i == arr.length - 1 ? '  ' : ' │') + ' '.repeat(space - 2)
            const representation = inspect(child, options)
                .split('\n')
                .map((item, i) => gray(i ? lineToSibling : lineToSelf) + item)
            return representation
        })
        representation.push(...childrenRepresentation.flat())
        return representation.join('\n')
    }
}
