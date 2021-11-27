import type { Client, Snowflake } from 'discord.js'
import type { MessageSelectOptionData } from '../common/interactive'
import { MessageActionRow, InteractionCollector, Permissions } from 'discord.js'
import logger from '../common/log'
import { makeNameObjectMap } from '../common/util'
import data, { dataEmitter } from '../common/data-manager'
import { SlashCommandBuilder, SelectMenuCover } from '../common/interactive'
import { CommandPermissionsKey } from '../data-schemas/command-permissions-dict'

export const role = new SlashCommandBuilder()
    .setDescription('handle role')
    .setDefaultPermission(false)
    .setPermissionsKeys(CommandPermissionsKey.NORMAL)
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
    dataEmitter.on('cafeteriaRolesDict', () =>
        makeGuildIdSelectMenuMap(client, data.cafeteriaRolesDict)
    )
}

const permissionBlacklist =
    Permissions.FLAGS.CREATE_INSTANT_INVITE |
    Permissions.FLAGS.KICK_MEMBERS |
    Permissions.FLAGS.BAN_MEMBERS |
    Permissions.FLAGS.ADMINISTRATOR |
    Permissions.FLAGS.MANAGE_CHANNELS |
    Permissions.FLAGS.MANAGE_GUILD |
    Permissions.FLAGS.VIEW_AUDIT_LOG |
    Permissions.FLAGS.PRIORITY_SPEAKER |
    Permissions.FLAGS.MANAGE_MESSAGES |
    Permissions.FLAGS.MENTION_EVERYONE |
    Permissions.FLAGS.VIEW_GUILD_INSIGHTS |
    Permissions.FLAGS.MUTE_MEMBERS |
    Permissions.FLAGS.DEAFEN_MEMBERS |
    Permissions.FLAGS.MOVE_MEMBERS |
    Permissions.FLAGS.MANAGE_ROLES |
    Permissions.FLAGS.MANAGE_WEBHOOKS |
    Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS |
    Permissions.FLAGS.MANAGE_THREADS

async function makeGuildIdSelectMenuMap(
    client: Client,
    dict: CafeteriaRolesDict
) {
    const guildIdRolesEntries = (
        await Promise.all(
            Object.entries(dict).map(entry =>
                makeGuildIdRoleOptionsEntry(client, entry)
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

async function makeGuildIdRoleOptionsEntry(
    client: Client,
    [guildKey, roleEmojiObjs]: [string, CafeteriaRolesDict[string]]
): Promise<[guildId: string, roleOptions: RoleOption[]] | void> {
    const guildId = data.guildIdDict[guildKey]
    if (guildId === undefined) {
        logger.warn(
            `The guild "${guildKey}" that on "cafeteriaRolesDict" does not exist on "guildIdDict".`
        )
        return
    }
    if (roleEmojiObjs === undefined || !roleEmojiObjs.length) {
        return
    }
    const guild = await client.guilds.fetch(guildId)
    const [roleCollection, emojiCollection] = await Promise.all([
        guild.roles.fetch(),
        // patch new GuildEmojiManager into the guild
        // https://github.com/discordjs/discord.js/blob/13.3.1/src/structures/Guild.js#L428
        guild.fetch().then(guild => guild.emojis.fetch()),
    ])
    const roleMap = makeNameObjectMap(...roleCollection.values())
    const emojiMap = makeNameObjectMap(...emojiCollection.values())

    const roleOptionSet = new Set<string>()
    const roleOptions: RoleOption[] = []
    for (const { role: roleName, emoji: emojiName } of roleEmojiObjs) {
        if (roleOptionSet.has(roleName)) {
            logger.warn(
                `The role "${roleName}" of the guild "${guildKey}" repeats on "cafeteriaRolesDict".`
            )
            continue
        }
        const role = roleMap.get(roleName)
        if (role === undefined) {
            logger.warn(
                `No such role "${roleName}" of the guild "${guildKey}".`
            )
            continue
        }
        if (role.permissions.any(permissionBlacklist)) {
            logger.warn(
                `The role "${role.name}" of the guild "${guildKey}" has any permissions not allowed on "cafeteriaRolesDict".`
            )
            continue
        }
        roleOptions.push({
            label: roleName,
            value: role.id,
            emoji: emojiName ? emojiMap.get(emojiName) : undefined,
        })
    }
    return [guildId, roleOptions]
}
