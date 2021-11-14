import { Client, Intents } from 'discord.js'
import { inspect } from 'util'
import { black, bgGreen, supportsColor } from 'chalk'
import PrettyError from 'pretty-error'
import 'source-map-support/register'
import { createConnection } from 'typeorm'
import logger from './common/log'
import * as dataManager from './common/dataManager'
import * as interactionCreate from './events/interactionCreate'

inspect.defaultOptions.depth = 4
inspect.defaultOptions.colors = Boolean(supportsColor)
PrettyError.start()

if (process.env.TOKEN === undefined) {
    throw new Error('There is no token in environment.')
}
const token = process.env.TOKEN
const client = new Client({ intents: new Intents() })

process.on('SIGINT', () => {
    client.destroy()
    logger.info('Interrupt! Client is Destroyed!')
    process.exit()
})

process.on('unhandledRejection', err => {
    logger.error('Unhandled promise rejection', err)
})

client.on('error', logger.error)

client.on('interactionCreate', interactionCreate.listener)

client.once('ready', client => {
    process.stdout.write(`\x1b]0;${client.user.tag}\x07`)
    logger.info(`Ready! Logged in as ${bgGreen(black(client.user.tag))}`)
})

void (async () => {
    await Promise.all([createConnection('default'), createConnection('survey')])
    await Promise.all([
        dataManager.load(client),
        interactionCreate.load(client),
        client.login(token),
    ])
})()
