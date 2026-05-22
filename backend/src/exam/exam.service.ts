import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SubmitExamDto } from './dto/submit-exam.dto'
import Anthropic from '@anthropic-ai/sdk'
import { ConfigService } from '@nestjs/config'

const DOMAIN_CONFIG = [
  {
    name: 'Cloud Concepts',
    questionCount: 16,
    topics: ['Cloud Computing Basics', 'AWS Global Infrastructure', 'Cloud Economics']
  },
  {
    name: 'Security & Compliance',
    questionCount: 20,
    topics: ['IAM', 'Security Groups', 'Compliance Programs', 'Shared Responsibility Model']
  },
  {
    name: 'Cloud Technology & Services',
    questionCount: 22,
    topics: ['EC2', 'S3', 'RDS', 'VPC', 'Lambda', 'CloudFront']
  },
  {
    name: 'Billing, Pricing & Support',
    questionCount: 7,
    topics: ['Pricing Models', 'Cost Explorer', 'Support Plans', 'AWS Organizations']
  },
]

const EXAM_INSTRUCTIONS = `You are an AWS Cloud Practitioner exam question generator.
Generate scenario-based multiple choice questions exactly like the real AWS CCP exam.

Rules:
- Questions must be hard difficulty, scenario-based
- Only one correct answer per question
- Each question has exactly 4 options (A, B, C, D)
- All content in Spanish except AWS service names and technical terms
- Respond ONLY with a valid JSON array, no markdown, no preamble, no backticks

Format:
[
  {
    "question": "...",
    "domain": "...",
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

@Injectable()
export class ExamService {
  private client: Anthropic

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    })
  }

  async generate(userId: string) {
    const progress = await this.prisma.topicProgress.findMany({
      where: { userId }
    })

    const allTopics = DOMAIN_CONFIG.flatMap(d => d.topics)
    const completedTopics = progress.filter(p => p.topicCompleted).map(p => p.topic)
    const pendingTopics = allTopics.filter(t => !completedTopics.includes(t))

    if (pendingTopics.length > 0) {
      return {
        ready: false,
        message: 'Aún tienes topics pendientes antes de poder hacer el examen final',
        pendingTopics,
        completedCount: completedTopics.length,
        totalCount: allTopics.length,
      }
    }

    const previousExams = await this.prisma.examResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 3,
    })

const allQuestions: any[] = []
    for (const domain of DOMAIN_CONFIG) {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: EXAM_INSTRUCTIONS,
                // @ts-ignore
                cache_control: { type: 'ephemeral' }
              },
              {
                type: 'text',
                text: `Generate ${domain.questionCount} questions covering: ${domain.topics.join(', ')}. Domain: ${domain.name}`
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
      allQuestions.push(...questions)
    }

    return {
      ready: true,
      timeLimit: 90,
      totalQuestions: 65,
      previousAttempts: previousExams.length,
      bestScore: previousExams.length > 0
        ? Math.max(...previousExams.map(e => e.score))
        : null,
      questions: allQuestions,
    }
  }

  async submit(dto: SubmitExamDto, userId: string) {
    const score = Math.round((dto.correctAnswers / dto.totalQuestions) * 100)

    const domainScores = dto.domainScores.reduce((acc, d) => {
      acc[d.domain] = Math.round((d.correct / d.total) * 100)
      return acc
    }, {} as Record<string, number>)

    const result = await this.prisma.examResult.create({
      data: {
        userId,
        score,
        totalQuestions: dto.totalQuestions,
        correctAnswers: dto.correctAnswers,
        domainScores,
      }
    })

    const passed = score >= 70

    return {
      result,
      passed,
      score,
      message: passed
        ? `¡Felicitaciones! Aprobaste con un ${score}%. ¡Estás listo para el examen real!`
        : `Obtuviste un ${score}%. Necesitas al menos 70% para aprobar. ¡Sigue practicando!`
    }
  }

  async getHistory(userId: string) {
    return this.prisma.examResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' }
    })
  }
}