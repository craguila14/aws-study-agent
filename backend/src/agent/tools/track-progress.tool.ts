import { Tool } from '../types'
import { PrismaService } from '../../prisma/prisma.service'
import { Difficulty } from '../types'

export const trackProgressTool: Tool = {
  name: 'track_progress',
  description: 'Updates the user progress for a specific topic after answering a quiz question, tracking progress per difficulty level',
  input_schema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID'
      },
      topic: {
        type: 'string',
        description: 'The AWS topic or service'
      },
      domain: {
        type: 'string',
        description: 'The exam domain this topic belongs to'
      },
      difficulty: {
        type: 'string',
        description: 'The difficulty level of the question answered',
        enum: ['easy', 'medium', 'hard']
      },
      isCorrect: {
        type: 'string',
        description: 'Whether the user answered correctly (true or false)'
      }
    },
    required: ['userId', 'topic', 'domain', 'difficulty', 'isCorrect']
  }
}

function isLevelCompleted(correct: number, total: number): boolean {
  if (total < 5) return false
  const weakScore = ((total - correct) / total) * 100
  return weakScore <= 30
}

export async function executeTrackProgress(
  input: {
    userId: string
    topic: string
    domain: string
    difficulty: Difficulty
    isCorrect: string
  },
  prisma: PrismaService
) {
  const correct = input.isCorrect === 'true'

  const existing = await prisma.topicProgress.findUnique({
    where: { userId_topic: { userId: input.userId, topic: input.topic } }
  })

  // Calculamos los nuevos contadores según la dificultad
  const easyCorrect = (existing?.easyCorrect ?? 0) + (input.difficulty === 'easy' && correct ? 1 : 0)
  const easyTotal = (existing?.easyTotal ?? 0) + (input.difficulty === 'easy' ? 1 : 0)
  const mediumCorrect = (existing?.mediumCorrect ?? 0) + (input.difficulty === 'medium' && correct ? 1 : 0)
  const mediumTotal = (existing?.mediumTotal ?? 0) + (input.difficulty === 'medium' ? 1 : 0)
  const hardCorrect = (existing?.hardCorrect ?? 0) + (input.difficulty === 'hard' && correct ? 1 : 0)
  const hardTotal = (existing?.hardTotal ?? 0) + (input.difficulty === 'hard' ? 1 : 0)

  // Calculamos el estado de completado por nivel
  const easyCompleted = isLevelCompleted(easyCorrect, easyTotal)
  const mediumCompleted = isLevelCompleted(mediumCorrect, mediumTotal)
  const hardCompleted = isLevelCompleted(hardCorrect, hardTotal)
  const topicCompleted = easyCompleted && mediumCompleted && hardCompleted

  // weakScore general basado en el nivel actual que está practicando
  const totalAnswers = easyTotal + mediumTotal + hardTotal
  const totalCorrect = easyCorrect + mediumCorrect + hardCorrect
  const weakScore = totalAnswers > 0
    ? ((totalAnswers - totalCorrect) / totalAnswers) * 100
    : 0

  const progress = await prisma.topicProgress.upsert({
    where: { userId_topic: { userId: input.userId, topic: input.topic } },
    update: {
      easyCorrect, easyTotal,
      mediumCorrect, mediumTotal,
      hardCorrect, hardTotal,
      easyCompleted, mediumCompleted, hardCompleted,
      topicCompleted,
      weakScore,
      lastStudied: new Date(),
    },
    create: {
      userId: input.userId,
      topic: input.topic,
      domain: input.domain,
      easyCorrect, easyTotal,
      mediumCorrect, mediumTotal,
      hardCorrect, hardTotal,
      easyCompleted, mediumCompleted, hardCompleted,
      topicCompleted,
      weakScore,
    }
  })

  // Determinamos el siguiente nivel recomendado
  let nextRecommendedDifficulty: Difficulty | null = null
  if (!easyCompleted) nextRecommendedDifficulty = 'easy'
  else if (!mediumCompleted) nextRecommendedDifficulty = 'medium'
  else if (!hardCompleted) nextRecommendedDifficulty = 'hard'

  return {
    progress,
    topicCompleted,
    nextRecommendedDifficulty,
    message: topicCompleted
      ? `¡Felicitaciones! Has completado ${input.topic} en todos los niveles.`
      : nextRecommendedDifficulty
        ? `Progreso actualizado. Nivel recomendado para continuar: ${nextRecommendedDifficulty}`
        : `Progreso actualizado para ${input.topic}`
  }
}