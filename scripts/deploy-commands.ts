import type { Snowflake } from 'discord.js'
import type { RESTGetAPIGuildRolesResult } from 'discord-api-types/v9'

import { Routes } from 'discord-api-types/v9'
import { REST } from '@discordjs/rest'
import { inspect } from 'util'
import { supportsColor } from 'chalk'
import PrettyError from 'pretty-error'
import prompts from 'prompts'
import { loadJSON } from '../src/common/data-manager'
import {
    getCommandNames,
    BaseCommandRefresher,
} from '../src/common/command-manager'

if (process.env.TOKEN === undefined) {
    throw new Error('There is no token in environment.')
}
const token = process.env.TOKEN

inspect.defaultOptions.depth = 4
inspect.defaultOptions.colors = Boolean(supportsColor)
PrettyError.start()

class CommandRefresher extends BaseCommandRefresher {
    protected override async _getCommandPermissionsDict() {
        return await loadJSON('commandPermissionsDict')
    }
    protected override async _getRoles(guildId: Snowflake) {
        const rest = new REST({ version: '9' }).setToken(token)
        const roles = await rest.get(Routes.guildRoles(guildId))
        return roles as RESTGetAPIGuildRolesResult
    }
}

void (async () => {
    const guildIdDict = await loadJSON('guildIdDict')
    const commandNames = await getCommandNames()
    const {
        guild: [guildKey, guildId],
        pickedCommandNames,
    } = await prompts([
        {
            type: 'select',
            name: 'guild',
            message: 'Select a guild.',
            initial: 0,
            choices: Object.entries(guildIdDict).map(([key, id]) => ({
                title: key,
                value: [key, id],
            })),
        },
        {
            type: commandNames.length ? 'multiselect' : null,
            name: 'pickedCommandNames',
            message: 'Pick command modules to deploy.',
            choices: commandNames.map(commandName => ({
                title: commandName,
                value: commandName,
            })),
        },
    ])
    try {
        await new CommandRefresher().refresh(
            guildId,
            guildKey,
            pickedCommandNames
        )
    } catch (err) {
        console.error(err)
    }
})()
