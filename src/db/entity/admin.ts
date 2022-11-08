import { Transform } from 'class-transformer';
import { Moment } from 'moment';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { DateTransformer } from '../date-transformer';

@Entity()
@Index(['userId', 'serverId'], { unique: true })
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
  serverId: string;

  @Column('bigint')
  userId: string;

  @Transform(({ value }) => value?.format() || null)
  @CreateDateColumn({ transformer: new DateTransformer() })
  createdAt: Moment;
}
