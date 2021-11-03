import { Entity, BaseEntity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class GIS extends BaseEntity {
    @PrimaryGeneratedColumn()
    public readonly id!: number

    @Column()
    public readonly country!: string
}
