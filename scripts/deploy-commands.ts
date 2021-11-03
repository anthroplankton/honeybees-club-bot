import prompts from 'prompts'
import { loadJSON } from '../src/data'
import { getCommandNames, refresh } from '../src/common/commandUtil'

void (async () => {
    const guildIdCollection = await loadJSON('guildIdCollection')
    const { guildId, commandModules } = await prompts([
        {
            type: 'select',
            name: 'guildId',
            message: 'Select a guild.',
            initial: 0,
            choices: Object.entries(guildIdCollection).map(([key, id]) => ({
                title: key,
                value: id,
            })),
        },
        {
            type: 'multiselect',
            name: 'commandModules',
            message: 'Pick the command modules to deploy.',
            choices: (
                await getCommandNames()
            ).map(commandModule => ({
                title: commandModule,
                value: commandModule,
            })),
        },
    ])
    await refresh(guildId, commandModules)
})()
