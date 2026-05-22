import { IsNumber, IsArray, ValidateNested, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import type { ExamDomain } from '../../agent/types'

export class DomainScoreDto {
  @IsString()
  domain!: ExamDomain

  @IsNumber()
  correct!: number

  @IsNumber()
  total!: number
}

export class SubmitExamDto {
  @IsNumber()
  correctAnswers!: number

  @IsNumber()
  totalQuestions!: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DomainScoreDto)
  domainScores!: DomainScoreDto[]
}