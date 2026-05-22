import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getProgress(userId: string) {
    const progress = await this.prisma.topicProgress.findMany({
      where: { userId },
      orderBy: { lastStudied: 'desc' }
    })

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roadmapWeek: true, examDate: true, knowledgeLevel: true }
    })

    const totalTopics = 16 
    const completedTopics = progress.filter(p => p.topicCompleted).length
    const inProgressTopics = progress.filter(p => !p.topicCompleted && p.easyTotal > 0).length

    return {
      user,
      summary: {
        totalTopics,
        completedTopics,
        inProgressTopics,
        pendingTopics: totalTopics - completedTopics - inProgressTopics,
        completionPercentage: Math.round((completedTopics / totalTopics) * 100)
      },
      topics: progress
    }
  }

  async getTopicProgress(userId: string, topic: string) {
    return this.prisma.topicProgress.findUnique({
      where: { userId_topic: { userId, topic } }
    })
  }

  async getWeakTopics(userId: string) {
    const progress = await this.prisma.topicProgress.findMany({
      where: { userId, topicCompleted: false },
      orderBy: { weakScore: 'desc' }
    })

    return {
      weakTopics: progress.filter(p => p.weakScore > 60),
      mediumTopics: progress.filter(p => p.weakScore > 30 && p.weakScore <= 60),
      strongTopics: progress.filter(p => p.weakScore <= 30),
    }
  }
}