import { Client, Intents } from 'discord.js'
import { createConnection } from 'typeorm'
import * as data from './data'
import * as interaction from '../src/events/interaction'

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

client.once('ready', c => {
    console.log(`Ready! Logged in as ${c.user.tag}`)
})

client.on('interaction', interaction.listener)

void (async () => {
    await Promise.all([
        createConnection('default'),
        createConnection('survey'),
        data.load(),
        interaction.load(),
    ])
    client.login(token)
})()
