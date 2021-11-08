import type { Client, Snowflake } from 'discord.js'
import type { MessageSelectOptionData } from '../common/interactive'
import { MessageActionRow, InteractionCollector } from 'discord.js'
import logger from '../common/log'
import data, { dataEmitter } from '../common/dataManager'
import { SlashCommandBuilder, SelectMenuCover } from '../common/interactive'

export const role = new SlashCommandBuilder()
    .setDescription('handle role')
    .addSubcommand(subcommand =>
        subcommand
            .setName('set')
            .setDescription('自助設定身分組')
            .setInteractor(async interaction => {
                if (!interaction.inGuild()) {
                    await interaction.reply('無從得知伺服器')
                    return
                }
                if (!guildIdSelectMenuMap.has(interaction.guildId)) {
                    await interaction.reply('伺服器沒有自助的身分組')
                    return
                }
                const component = new setCafeteriaRolesSelectMenu.Builder(
                    guildIdSelectMenuMap.get(interaction.guildId)
                )
                // type foo = typeof interaction.member
                // Weird, interaction.member should be nullable
                // https://discord.js.org/#/docs/main/stable/class/CommandInteraction?scrollTo=member
                for (const roleOptions of component.options) {
                    const guild = await interaction.client.guilds.fetch(
                        interaction.guildId
                    )
                    const member = await guild.members.fetch(interaction.user)
                    const roles = member.roles.cache
                    roleOptions.default = roles.has(roleOptions.value)
                }
                const reply = await interaction.reply({
                    content: '請在兩分鐘內選擇身分組，將更新為有打勾的身分組',
                    components: [
                        new MessageActionRow().setComponents(component),
                    ],
                    ephemeral: true,
                    fetchReply: true,
                })
                const collector = new InteractionCollector(interaction.client, {
                    message: reply,
                    time: 120_000,
                })
                const collected = await new Promise<{ size: number }>(res =>
                    collector.once('end', res)
                )
                if (collected.size) {
                    return
                }
                await interaction.editReply({
                    components: [
                        new MessageActionRow().setComponents(
                            component.setDisabled().setPlaceholder('超時')
                        ),
                    ],
                })
            })
    )

export const setCafeteriaRolesSelectMenu = new SelectMenuCover(
    async (interaction, roleIds: Snowflake[]) => {
        const guild = await interaction.client.guilds.fetch(interaction.guildId)
        const member = await guild.members.fetch(interaction.user)
        await member.roles.set(roleIds)
        await interaction.update({ content: '身分組設定完成', components: [] })
    }
)

const guildIdSelectMenuMap = new Map<
    Snowflake,
    InstanceType<typeof setCafeteriaRolesSelectMenu.Builder>
>()

type CafeteriaRolesDict = typeof data.cafeteriaRolesDict
type RoleOption = MessageSelectOptionData<Snowflake>

export async function load(client: Client | Client<false>) {
    if (!client.isReady()) {
        await new Promise(res => client.once('ready', res))
    }
    if (!dataEmitter.isReady('guildIdDict')) {
        await new Promise(res => dataEmitter.once('guildIdDict', res))
    }
    if (!dataEmitter.isReady('cafeteriaRolesDict')) {
        await new Promise(res => dataEmitter.once('cafeteriaRolesDict', res))
    }
    await makeGuildIdSelectMenuMap(client, data.cafeteriaRolesDict)
    dataEmitter.on('cafeteriaRolesDict', makeGuildIdSelectMenuMap)
}

async function makeGuildIdSelectMenuMap(
    client: Client,
    cafeteriaRolesDict: CafeteriaRolesDict
) {
    const guildIdRolesEntries = (
        await Promise.all(
            Object.entries(cafeteriaRolesDict).map(entry =>
                makeGuildIdRolesEntry(client, entry)
            )
        )
    ).filter((entry): entry is [string, RoleOption[]] => {
        if (entry === undefined) {
            return false
        }
        const [, roles] = entry
        if (!roles.length) {
            return false
        }
        return true
    })
    // Note: Do Not use await in the period of setting guildIdSelectMenuMap
    guildIdSelectMenuMap.clear()
    for (const [guildId, roles] of guildIdRolesEntries) {
        const componet = new setCafeteriaRolesSelectMenu.Builder()
            .setPlaceholder('請在兩分鐘內選擇身分組')
            .setMinValues(0)
            .setMaxValues(roles.length)
            .setOptions(roles)
        guildIdSelectMenuMap.set(guildId, componet)
    }
}

async function makeGuildIdRolesEntry(
    client: Client,
    [guildName, roleEmojiObjs]: [string, CafeteriaRolesDict[string]]
): Promise<[guildId: string, roleOptions: RoleOption[]] | void> {
    const guildId = data.guildIdDict[guildName]
    if (guildId === undefined) {
        logger.warn(
            `The guild "${guildName}" that on "cafeteriaRolesDict" does not exist on "guildIdDict".`
        )
        return
    }
    if (roleEmojiObjs === undefined || !roleEmojiObjs.length) {
        return
    }
    const guild = await client.guilds.fetch({ guild: guildId, force: true })
    const [roleCollection, emojiCollection] = await Promise.all([
        guild.roles.fetch(),
        guild.emojis.fetch(),
    ])
    const roles: RoleOption[] = []
    const indexMap = new Map<string, number>()
    for (const { role, emoji } of roleEmojiObjs) {
        if (indexMap.has(role)) {
            logger.warn(
                `The role "${role}" of the guild "${guildName}" repeats on "cafeteriaRolesDict".`
            )
            continue
        }
        roles.push({
            label: role,
            value: '',
            emoji: emojiCollection.findKey(({ name }) => name == emoji),
        })
        indexMap.set(role, indexMap.size)
    }
    for (const role of roleCollection.values()) {
        const i = indexMap.get(role.name)
        if (i !== undefined) {
            roles[i].value = role.id
        }
    }
    return [guildId, roles]
}
