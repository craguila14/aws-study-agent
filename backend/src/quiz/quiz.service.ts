import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaService } from '../prisma/prisma.service'
import { GenerateQuizDto } from './dto/generate-quiz.dto'
import { CompleteQuizDto } from './dto/complete-quiz.dto'
import { executeTrackProgress } from '../agent/tools/track-progress.tool'
import { DailyQuizDto, CompleteDailyQuizDto } from './dto/daily-quiz.dto'

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

const FEEDBACK_INSTRUCTIONS = `You are an AWS Cloud Practitioner exam coach.
Analyze the user's quiz results and provide constructive feedback.

Rules:
- Always respond in Spanish except for AWS technical terms
- Be specific about which concepts the user struggled with
- Be encouraging but honest
- Identify patterns in wrong answers
- Give actionable study recommendations
- Respond ONLY with a valid JSON object, no markdown, no preamble, no backticks

Format:
{
  "generalFeedback": "...",
  "strongPoints": ["...", "..."],
  "weakPoints": ["...", "..."],
  "studyRecommendations": ["...", "..."],
  "focusTopics": ["...", "..."]
}`

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
  const questionCount = parseInt(dto.questionCount ?? '5')

  const quizContext = dto.previousFeedback
    ? `Generate ${questionCount} questions about ${dto.topic} at ${dto.difficulty} difficulty level.
       The user has already taken a quiz on this topic. Focus specifically on these weak points:
       - Weak concepts: ${dto.previousFeedback.weakPoints.join(', ')}
       - Focus topics: ${dto.previousFeedback.focusTopics.join(', ')}
       - Study recommendations: ${dto.previousFeedback.studyRecommendations.join(', ')}
       Generate different questions that target these specific weaknesses.`
    : `Generate ${questionCount} questions about ${dto.topic} at ${dto.difficulty} difficulty level.`

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
            // @ts-ignore
            cache_control: { type: 'ephemeral' }
          },
          {
            type: 'text',
            text: quizContext
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
    difficulty: dto.difficulty,
    questions,
  }
}

async complete(dto: CompleteQuizDto, userId: string) {
  const results = dto.answers.map(answer => ({
    question: answer.question,
    userAnswer: answer.userAnswer,
    correctAnswer: answer.correctAnswer,
    isCorrect: answer.userAnswer.trim().toLowerCase() ===
               answer.correctAnswer.trim().toLowerCase(),
    explanation: answer.explanation,
  }))

  const correctCount = results.filter(r => r.isCorrect).length
  const score = Math.round((correctCount / results.length) * 100)
  const wrongAnswers = results.filter(r => !r.isCorrect)

  // Guardamos el progreso
  for (const result of results) {
    await executeTrackProgress({
      userId,
      topic: dto.topic,
      domain: dto.domain,
      difficulty: dto.difficulty,
      isCorrect: result.isCorrect.toString(),
    }, this.prisma)
  }

  // Generamos feedback detallado por cada respuesta incorrecta
  const detailedFeedbacks = await Promise.all(
    wrongAnswers.map(async answer => {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: EVALUATE_INSTRUCTIONS,
                // @ts-ignore
                cache_control: { type: 'ephemeral' }
              },
              {
                type: 'text',
                text: `Question: "${answer.question}"
                        User answer: "${answer.userAnswer}"
                        Correct answer: "${answer.correctAnswer}"
                        Topic: ${dto.topic}
                        Result: INCORRECT

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

      return {
        question: answer.question,
        feedback,
      }
    })
  )

  // Generamos el feedback general del quiz
  const quizSummary = `
        Topic: ${dto.topic}
        Difficulty: ${dto.difficulty}
        Score: ${correctCount}/${results.length} (${score}%)

        All answers:
        ${results.map(a => `
        Question: ${a.question}
        User answered: ${a.userAnswer}
        Correct answer: ${a.correctAnswer}
        Result: ${a.isCorrect ? 'CORRECT' : 'INCORRECT'}
        Explanation: ${a.explanation}
        `).join('\n')}
        `

  const feedbackResponse = await this.client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: FEEDBACK_INSTRUCTIONS,
            // @ts-ignore
            cache_control: { type: 'ephemeral' }
          },
          {
            type: 'text',
            text: quizSummary
          }
        ]
      }
    ]
  })

  const feedbackRaw = feedbackResponse.content
    .filter(block => block.type === 'text')
    .map(block => block.type === 'text' ? block.text : '')
    .join('')

  const generalFeedback = JSON.parse(feedbackRaw)

  // Combinamos los resultados con los feedbacks detallados
  const resultsWithFeedback = results.map(result => ({
    ...result,
    detailedFeedback: result.isCorrect
      ? null
      : detailedFeedbacks.find(f => f.question === result.question)?.feedback ?? null
  }))

  return {
    results: resultsWithFeedback,
    score,
    correctCount,
    totalQuestions: results.length,
    feedback: generalFeedback,
  }
}

async generateDaily(dto: DailyQuizDto, userId: string) {
  // Obtenemos el plan del usuario
  const studyPlan = await this.prisma.studyPlan.findUnique({
    where: { userId }
  })

  if (!studyPlan) {
    throw new NotFoundException('No study plan found. Please generate your roadmap first.')
  }

  const plan = studyPlan.plan as any
  const session = plan.sessions.find((s: any) => s.day === dto.day)

  if (!session) {
    throw new NotFoundException(`Session for day ${dto.day} not found`)
  }

  const quizContext = dto.previousFeedback
    ? `Generate ${session.quiz.questionCount} questions about ${session.topic} at ${session.quiz.difficulty} difficulty level.
       Focus specifically on these weak points from the previous attempt:
       - Weak concepts: ${dto.previousFeedback.weakPoints.join(', ')}
       - Focus topics: ${dto.previousFeedback.focusTopics.join(', ')}
       Generate different questions that target these specific weaknesses.`
    : `Generate ${session.quiz.questionCount} questions about ${session.topic} at ${session.quiz.difficulty} difficulty level.`

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
            // @ts-ignore
            cache_control: { type: 'ephemeral' }
          },
          {
            type: 'text',
            text: quizContext
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
    day: dto.day,
    topic: session.topic,
    domain: session.domain,
    material: session.material,
    estimatedMinutes: session.estimatedMinutes,
    questions,
  }
}

async completeDaily(dto: CompleteDailyQuizDto, userId: string) {
  const studyPlan = await this.prisma.studyPlan.findUnique({
    where: { userId }
  })

  if (!studyPlan) {
    throw new NotFoundException('No study plan found.')
  }

  const plan = studyPlan.plan as any
  const session = plan.sessions.find((s: any) => s.day === dto.day)

  if (!session) {
    throw new NotFoundException(`Session for day ${dto.day} not found`)
  }

  const results = dto.answers.map(answer => ({
    question: answer.question,
    userAnswer: answer.userAnswer,
    correctAnswer: answer.correctAnswer,
    isCorrect: answer.userAnswer.trim().toLowerCase() ===
               answer.correctAnswer.trim().toLowerCase(),
    explanation: answer.explanation,
  }))

  const correctCount = results.filter(r => r.isCorrect).length
  const score = Math.round((correctCount / results.length) * 100)
  const wrongAnswers = results.filter(r => !r.isCorrect)

  // Guardamos el progreso
  for (const result of results) {
    await executeTrackProgress({
      userId,
      topic: session.topic,
      domain: session.domain,
      difficulty: session.quiz.difficulty,
      isCorrect: result.isCorrect.toString(),
    }, this.prisma)
  }

  // Feedback detallado solo por respuestas incorrectas
  const detailedFeedbacks = await Promise.all(
    wrongAnswers.map(async answer => {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: EVALUATE_INSTRUCTIONS,
                // @ts-ignore
                cache_control: { type: 'ephemeral' }
              },
              {
                type: 'text',
                text: `Question: "${answer.question}"
User answer: "${answer.userAnswer}"
Correct answer: "${answer.correctAnswer}"
Topic: ${session.topic}
Result: INCORRECT

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

      return { question: answer.question, feedback }
    })
  )

  const resultsWithFeedback = results.map(result => ({
    ...result,
    detailedFeedback: result.isCorrect
      ? null
      : detailedFeedbacks.find(f => f.question === result.question)?.feedback ?? null
  }))

  // Calculamos weakPoints para que el frontend pueda repetir con feedback
  const weakPoints = wrongAnswers.map(a => a.question)

  return {
    day: dto.day,
    topic: session.topic,
    results: resultsWithFeedback,
    score,
    correctCount,
    totalQuestions: results.length,
    // Si hay errores, devolvemos info para repetir el quiz
    canRepeat: wrongAnswers.length > 0,
    repeatFeedback: wrongAnswers.length > 0 ? {
      weakPoints,
      focusTopics: [...new Set(wrongAnswers.map(() => session.topic))],
    } : null,
  }
}

  
}