import { IsString, IsEnum, IsOptional, IsNumberString } from 'class-validator'
import type { ExamDomain } from '../../agent/types'

export class GenerateQuizDto {
  @IsString()
  topic!: string

  @IsEnum(['Cloud Concepts', 'Security & Compliance', 'Cloud Technology & Services', 'Billing, Pricing & Support'])
  domain!: ExamDomain

  @IsNumberString()
  @IsOptional()
  questionCount?: string
}