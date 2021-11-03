import { Entity, BaseEntity, Column, PrimaryColumn } from 'typeorm'

@Entity()
export class Survey extends BaseEntity {
    @PrimaryColumn()
    public readonly discordUserID: string

    @Column('boolean')
    public readonly gis = true

    constructor(discordUserID: string) {
        super()
        this.discordUserID = discordUserID
    }
}
