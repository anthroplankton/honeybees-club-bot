import type { DataName } from '../src/common/data-manager'

import fs from 'fs/promises'
import path from 'path/posix'
import { format } from 'prettier'
import {
    dataNames,
    getFilename,
    importDataSchema,
} from '../src/common/data-manager'

async function exportJSONSchema(dataNames: readonly DataName[]) {
    await dataNames.map(async dataName => {
        const { schema } = await importDataSchema(dataName)
        await fs.writeFile(
            path.format({ name: getFilename(dataName), ext: '.schema' }),
            format(JSON.stringify(schema), { parser: 'json' })
        )
    })
}

async function exportVSCodeSettings(dataNames: readonly DataName[]) {
    const schemas = dataNames.map(dataName => {
        let filename = getFilename(dataName)
        const url = path.format({
            name: filename,
            ext: '.schema',
        })
        filename = path.normalize(filename)
        const fileMatch = [
            filename,
            path.format({ name: filename, ext: '.example' }),
        ]
        return { fileMatch, url }
    })
    const vscodeSettingsJSONFilename = './.vscode/settings.json'
    const vscodeSettingsJSON = JSON.parse(
        await fs.readFile(vscodeSettingsJSONFilename, 'utf8')
    )
    vscodeSettingsJSON['json.schemas'] = schemas
    await fs.writeFile(
        vscodeSettingsJSONFilename,
        format(JSON.stringify(vscodeSettingsJSON), { parser: 'json' })
    )
}

Promise.all([
    exportJSONSchema(dataNames),
    exportVSCodeSettings(dataNames),
]).then(() => console.log('Successfully export the JSON schemas.'))
