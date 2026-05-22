import { IsString, IsEnum } from 'class-validator'
import type { Difficulty } from '../../agent/types'

export class EvaluateAnswerDto {
  @IsString()
  question!: string

  @IsString()
  correctAnswer!: string

  @IsString()
  userAnswer!: string

  @IsString()
  topic!: string

  @IsString()
  domain!: string

  @IsEnum(['easy', 'medium', 'hard'])
  difficulty!: Difficulty
}