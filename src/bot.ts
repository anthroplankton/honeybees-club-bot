import { Client, Intents } from 'discord.js'
import { createConnection } from 'typeorm'
import * as data from './common/dataManager'
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

client.once('ready', c => console.log(`Ready! Logged in as ${c.user.tag}`))

client.on('interactionCreate', i =>
    interactionCreate.listener(i).catch(console.error)
)

void (async () => {
    await Promise.all([
        createConnection('default'),
        createConnection('survey'),
        data.load(),
        interactionCreate.load(),
    ])
    await client.login(token)
})()
