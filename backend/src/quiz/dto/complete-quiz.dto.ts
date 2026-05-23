import { IsString, IsEnum, IsArray, ValidateNested, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'
import type { Difficulty, ExamDomain } from '../../agent/types'

export class QuizAnswerDto {
  @IsString()
  question!: string

  @IsString()
  correctAnswer!: string

  @IsString()
  userAnswer!: string

  @IsString()
  explanation!: string
}

export class CompleteQuizDto {
  @IsString()
  topic!: string

  @IsEnum(['Cloud Concepts', 'Security & Compliance', 'Cloud Technology & Services', 'Billing, Pricing & Support'])
  domain!: ExamDomain

  @IsEnum(['easy', 'medium', 'hard'])
  difficulty!: Difficulty

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[]
}