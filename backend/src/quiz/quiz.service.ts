import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaService } from '../prisma/prisma.service'
import { GenerateQuizDto } from './dto/generate-quiz.dto'
import { EvaluateAnswerDto } from './dto/evaluate-answer.dto'
import { executeGetWeakTopics } from '../agent/tools/get-weak-topics.tool'
import { executeTrackProgress } from '../agent/tools/track-progress.tool'

const QUIZ_INSTRUCTIONS = `You are an AWS Cloud Practitioner exam question generator.
Generate multiple choice questions exactly like the real AWS CCP exam.

Rules:
- Questions must be scenario-based
- Only one correct answer per question
- Each question has exactly 4 options (A, B, C, D)
- Explanation must be clear and educational
- All content in Spanish except AWS service names and technical terms
- Respond ONLY with a valid JSON array, no markdown, no preamble, no backticks

Format:
[
  {
    "question": "...",
    "options": [
      { "id": "A", "text": "..." },
      { "id": "B", "text": "..." },
      { "id": "C", "text": "..." },
      { "id": "D", "text": "..." }
    ],
    "correctAnswer": "A",
    "explanation": "..."
  }
]`

const EVALUATE_INSTRUCTIONS = `You are an AWS Cloud Practitioner exam coach.
Your job is to evaluate the user's answer and provide detailed educational feedback.

Rules:
- Always respond in Spanish except for AWS technical terms
- Be encouraging but honest
- Explain the underlying AWS concept clearly
- If wrong, explain why the correct answer is right
- If correct, reinforce the concept with additional context`

@Injectable()
export class QuizService {
  private client: Anthropic

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    })
  }

  async generate(dto: GenerateQuizDto, userId: string) {
    const weakTopics = await executeGetWeakTopics({ userId, topic: dto.topic }, this.prisma)
    const difficulty = this.determineDifficulty(weakTopics, dto.topic)
    const questionCount = parseInt(dto.questionCount ?? '5')

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: QUIZ_INSTRUCTIONS,
              cache_control: { type: 'ephemeral' } 
            },
            {
              type: 'text',
              text: `Generate ${questionCount} questions about ${dto.topic} at ${difficulty} difficulty level.`
            }
          ]
        }
      ]
    })

    const rawText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('')

    const questions = JSON.parse(rawText)

    return {
      topic: dto.topic,
      domain: dto.domain,
      difficulty,
      questions,
    }
  }

  async evaluate(dto: EvaluateAnswerDto, userId: string) {
    const isCorrect = dto.userAnswer.trim().toLowerCase() ===
      dto.correctAnswer.trim().toLowerCase()

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: EVALUATE_INSTRUCTIONS,
              cache_control: { type: 'ephemeral' }  
            },
            {
              type: 'text',
              text: `Question: "${dto.question}"
                        User answer: "${dto.userAnswer}"
                        Correct answer: "${dto.correctAnswer}"
                        Topic: ${dto.topic}
                        Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}

                        Provide detailed feedback.`
            }
          ]
        }
      ]
    })

    const feedback = response.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('')

    const progress = await executeTrackProgress({
      userId,
      topic: dto.topic,
      domain: dto.domain,
      difficulty: dto.difficulty,
      isCorrect: isCorrect.toString(),
    }, this.prisma)

    return { isCorrect, feedback, progress }
  }

  private determineDifficulty(weakTopics: any, topic: string) {
    const topicProgress = weakTopics.inProgressTopics.find(
      (p: any) => p.topic === topic
    )

    if (topicProgress) return topicProgress.recommendedDifficulty

    const knowledgeLevel = weakTopics.knowledgeLevel
    if (knowledgeLevel === 'intermediate') return 'medium'
    if (knowledgeLevel === 'advanced') return 'medium'
    return 'easy'
  }
}