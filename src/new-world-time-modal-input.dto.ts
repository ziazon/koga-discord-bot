import { IsEnum, IsInt, IsMilitaryTime, IsOptional, IsString } from 'class-validator';

import { NewWorldDay } from './types';

export class NewWorldTimeModalInput {
  @IsInt()
  @IsOptional()
  id?: number;

  @IsString({
    message: 'userId must be specified.'
  })
  userId: string;

  @IsString({
    message: 'serverId must be specified.'
  })
  serverId: string;

  @IsEnum(NewWorldDay, {
    message: `stage must be ${NewWorldDay.Daybreak} or ${NewWorldDay.Nightfall}.`
  })
  stage: NewWorldDay;

  @IsMilitaryTime({
    message: 'value must be in military time, example: 13:01'
  })
  time: string;
}
