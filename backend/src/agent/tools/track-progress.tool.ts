import { Tool } from '../types'
import { PrismaService } from '../../prisma/prisma.service'

export const trackProgressTool: Tool = {
  name: 'track_progress',
  description: 'Updates the user progress for a specific topic after answering a quiz question',
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
      isCorrect: {
        type: 'string',
        description: 'Whether the user answered correctly (true or false)'
      }
    },
    required: ['userId', 'topic', 'domain', 'isCorrect']
  }
}

export async function executeTrackProgress(
  input: {
    userId: string
    topic: string
    domain: string
    isCorrect: string
  },
  prisma: PrismaService
) {
  const correct = input.isCorrect === 'true'

  const existing = await prisma.topicProgress.findUnique({
    where: { userId_topic: { userId: input.userId, topic: input.topic } }
  })

  const correctAnswers = (existing?.correctAnswers ?? 0) + (correct ? 1 : 0)
  const totalAnswers = (existing?.totalAnswers ?? 0) + 1
  const weakScore = ((totalAnswers - correctAnswers) / totalAnswers) * 100

  const progress = await prisma.topicProgress.upsert({
    where: { userId_topic: { userId: input.userId, topic: input.topic } },
    update: { correctAnswers, totalAnswers, weakScore, lastStudied: new Date() },
    create: {
      userId: input.userId,
      topic: input.topic,
      domain: input.domain,
      correctAnswers,
      totalAnswers,
      weakScore,
    }
  })

  return { progress, message: `Progress updated for ${input.topic}` }
}