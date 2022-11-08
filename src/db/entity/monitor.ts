import { Transform } from 'class-transformer';
import { Moment } from 'moment';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { AlbionMonitorType } from '../../types';
import { DateTransformer } from '../date-transformer';

@Entity()
export class Monitor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
  serverId: number;

  @Column('bigint')
  channelId: number;

  @Column({
    type: 'enum',
    enum: AlbionMonitorType
  })
  monitorType: AlbionMonitorType;

  @Column('varchar')
  monitorId: string;

  @Transform(({ value }) => value?.format() || null)
  @CreateDateColumn({ transformer: new DateTransformer() })
  lastMessageAt: Moment;

  @Transform(({ value }) => value?.format() || null)
  @CreateDateColumn({ transformer: new DateTransformer() })
  createdAt: Moment;
}
