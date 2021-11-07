import prompts from 'prompts'
import { loadJSON } from '../src/common/dataManager'
import { getCommandNames, refresh } from '../src/common/commandManager'

void (async () => {
    const guildIdDict = await loadJSON('guildIdDict')
    const commandNames = await getCommandNames()
    const { guildId, pickedCommandNames } = await prompts([
        {
            type: 'select',
            name: 'guildId',
            message: 'Select a guild.',
            initial: 0,
            choices: Object.entries(guildIdDict).map(([key, id]) => ({
                title: key,
                value: id,
            })),
        },
        {
            type: commandNames.length ? 'multiselect' : null,
            name: 'pickedCommandNames',
            message: 'Pick the command modules to deploy.',
            choices: commandNames.map(commandName => ({
                title: commandName,
                value: commandName,
            })),
        },
    ])
    await refresh(guildId, pickedCommandNames)
})()
