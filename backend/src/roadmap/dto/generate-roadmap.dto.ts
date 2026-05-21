import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator'
import type { KnowledgeLevel } from '../../../src/agent/types'

export class GenerateRoadmapDto {
  @IsDateString()
  examDate!: string

  @IsEnum(['beginner', 'intermediate', 'advanced'])
  knowledgeLevel!: KnowledgeLevel

  @IsString()
  @IsOptional()
  weakTopics?: string
}