import { IsString, IsDateString, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator'
import type { KnowledgeLevel } from '../../agent/types'

export class GenerateRoadmapDto {
  @IsDateString()
  examDate!: string

  @IsEnum(['beginner', 'intermediate', 'advanced'])
  knowledgeLevel!: KnowledgeLevel

  @IsNumber()
  @Min(1)
  @Max(7)
  daysPerWeek!: number

  @IsNumber()
  @Min(15)
  @Max(240)
  minutesPerDay!: number

  @IsString()
  @IsOptional()
  weakTopics?: string
}