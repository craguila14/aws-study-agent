import { Tool } from '../types'
import { PrismaService } from '../../prisma/prisma.service'

export const getWeakTopicsTool: Tool = {
  name: 'get_weak_topics',
  description: 'Retrieves the user progress and weak topics from the database to determine quiz difficulty and what topics need reinforcement',
  input_schema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID to fetch progress for'
      },
      topic: {
        type: 'string',
        description: 'Optional specific topic to check. If not provided, returns all topics'
      }
    },
    required: ['userId']
  }
}

export async function executeGetWeakTopics(
  input: { userId: string; topic?: string },
  prisma: PrismaService
) {
  const where = input.topic
    ? { userId: input.userId, topic: input.topic }
    : { userId: input.userId }

  const progress = await prisma.topicProgress.findMany({ where })

  const weakTopics = progress.filter(p => p.weakScore > 60)
  const mediumTopics = progress.filter(p => p.weakScore > 30 && p.weakScore <= 60)
  const strongTopics = progress.filter(p => p.weakScore <= 30)

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { roadmapWeek: true, examDate: true }
  })

  return {
    roadmapWeek: user?.roadmapWeek ?? 1,
    examDate: user?.examDate,
    topicProgress: progress,
    weakTopics: weakTopics.map(t => t.topic),
    mediumTopics: mediumTopics.map(t => t.topic),
    strongTopics: strongTopics.map(t => t.topic),
    recommendation: weakTopics.length > 0
      ? `Focus on reinforcing: ${weakTopics.map(t => t.topic).join(', ')}`
      : 'Good progress! Keep studying new topics.'
  }
}