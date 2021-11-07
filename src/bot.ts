import { Client, Intents } from 'discord.js'
import { createConnection } from 'typeorm'
import * as dataManager from './common/dataManager'
import * as interactionCreate from './events/interactionCreate'

if (process.env.TOKEN === undefined) {
    throw new Error('There is no token in environment.')
}
const token = process.env.TOKEN
const client = new Client({ intents: new Intents() })

process.on('SIGINT', () => {
    client.destroy()
    console.log('Interrupt! Client is Destroyed!')
    process.exit()
})

process.on('unhandledRejection', err => {
    console.error('Unhandled promise rejection:', err)
})

client.on('error', console.error)

client.on('interactionCreate', interactionCreate.listener)

client.once('ready', c => console.log(`Ready! Logged in as ${c.user.tag}`))

void (async () => {
    await Promise.all([createConnection('default'), createConnection('survey')])
    await Promise.all([
        dataManager.load(client),
        interactionCreate.load(client),
        client.login(token),
    ])
})()
