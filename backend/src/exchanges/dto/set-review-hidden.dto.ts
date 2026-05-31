import { IsBoolean } from 'class-validator';

export class SetReviewHiddenDto {
  @IsBoolean()
  isHidden!: boolean;
}
