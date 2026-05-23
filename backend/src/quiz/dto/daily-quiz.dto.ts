import { IsNumber, IsOptional, IsObject } from 'class-validator'

export class DailyQuizDto {
  @IsNumber()
  day!: number

  @IsObject()
  @IsOptional()
  previousFeedback?: {
    weakPoints: string[]
    focusTopics: string[]
  }
}

export class CompleteDailyQuizDto {
  @IsNumber()
  day! : number

  answers!: {
    question: string
    correctAnswer: string
    userAnswer: string
    explanation: string
  }[]
}