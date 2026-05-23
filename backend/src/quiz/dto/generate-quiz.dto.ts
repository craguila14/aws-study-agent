import { IsString, IsEnum, IsOptional, IsNumberString } from 'class-validator'
import type { ExamDomain, Difficulty } from '../../agent/types'

export class GenerateQuizDto {
  @IsString()
  topic!: string

  @IsEnum(['Cloud Concepts', 'Security & Compliance', 'Cloud Technology & Services', 'Billing, Pricing & Support'])
  domain!: ExamDomain

  @IsEnum(['easy', 'medium', 'hard'])
  difficulty!: Difficulty

  @IsNumberString()
  @IsOptional()
  questionCount?: string

  @IsOptional()
  previousFeedback?: {
    weakPoints: string[]
    focusTopics: string[]
    studyRecommendations: string[]
  }
}