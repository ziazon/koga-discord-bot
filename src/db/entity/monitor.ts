import { Transform } from 'class-transformer';
import { Moment } from 'moment';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { DateTransformer } from '../date-transformer';

export enum MonitorType {
  PLAYER = 'player',
  GUILD = 'guild',
  ALLIANCE = 'alliance'
}

@Entity()
export class Monitor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
  serverId: string;

  @Column('bigint')
  channelId: string;

  @Column({
    type: 'enum',
    enum: MonitorType
  })
  monitorType: MonitorType;

  @Column('varchar')
  monitorId: string;

  @Transform(({ value }) => value?.format() || null)
  @CreateDateColumn({ transformer: new DateTransformer() })
  lastMessageAt: Moment;

  @Transform(({ value }) => value?.format() || null)
  @CreateDateColumn({ transformer: new DateTransformer() })
  createdAt: Moment;
}
