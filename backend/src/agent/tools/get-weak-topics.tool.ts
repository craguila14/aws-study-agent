import { Tool } from '../types'
import { PrismaService } from '../../prisma/prisma.service'

export const getWeakTopicsTool: Tool = {
  name: 'get_weak_topics',
  description: 'Retrieves the user progress per topic and difficulty level to determine next quiz difficulty and what topics need reinforcement',
  input_schema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID to fetch progress for'
      },
      topic: {
        type: 'string',
        description: 'Optional specific topic to check. If not provided returns all topics'
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

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { roadmapWeek: true, examDate: true, knowledgeLevel: true }
  })

  // Clasificamos los topics según su estado
  const completedTopics = progress.filter(p => p.topicCompleted)
  const inProgressTopics = progress.filter(p => !p.topicCompleted && p.easyTotal > 0)
  const notStartedTopics = progress.filter(p => p.easyTotal === 0)

  // Para cada topic en progreso, determinamos el nivel recomendado
  const topicsWithRecommendation = inProgressTopics.map(p => ({
    topic: p.topic,
    domain: p.domain,
    weakScore: p.weakScore,
    easyCompleted: p.easyCompleted,
    mediumCompleted: p.mediumCompleted,
    hardCompleted: p.hardCompleted,
    recommendedDifficulty: !p.easyCompleted ? 'easy'
      : !p.mediumCompleted ? 'medium'
      : 'hard'
  }))

  return {
    roadmapWeek: user?.roadmapWeek ?? 1,
    knowledgeLevel: user?.knowledgeLevel ?? 'beginner',
    examDate: user?.examDate,
    completedTopics: completedTopics.map(p => p.topic),
    inProgressTopics: topicsWithRecommendation,
    notStartedTopics: notStartedTopics.map(p => p.topic),
    recommendation: completedTopics.length === 0 && inProgressTopics.length === 0
      ? 'No history yet. Start with easy difficulty on the first topic of the roadmap.'
      : topicsWithRecommendation.length > 0
        ? `Continue with: ${topicsWithRecommendation[0].topic} at ${topicsWithRecommendation[0].recommendedDifficulty} difficulty`
        : 'All started topics completed. Move to the next topic in the roadmap.'
  }
}