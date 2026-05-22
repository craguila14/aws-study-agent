import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto'
import { executeGenerateRoadmap } from '../agent/tools/generate-roadmap.tool'

const DOMAIN_TOPICS: Record<string, string[]> = {
  'Cloud Concepts': ['Cloud Computing Basics', 'AWS Global Infrastructure', 'Cloud Economics'],
  'Security & Compliance': ['IAM', 'Security Groups', 'Compliance Programs', 'Shared Responsibility Model'],
  'Cloud Technology & Services': ['EC2', 'S3', 'RDS', 'VPC', 'Lambda', 'CloudFront'],
  'Billing, Pricing & Support': ['Pricing Models', 'Cost Explorer', 'Support Plans', 'AWS Organizations'],
}

@Injectable()
export class RoadmapService {
  constructor(private prisma: PrismaService) {}

  async generate(dto: GenerateRoadmapDto, userId: string) {
    return executeGenerateRoadmap({ ...dto, userId }, this.prisma)
  }

  async getRoadmap(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roadmapWeek: true,
        knowledgeLevel: true,
        examDate: true,
        topicProgress: true,
      }
    })

    if (!user) throw new NotFoundException('User not found')

    const roadmap = Object.entries(DOMAIN_TOPICS).map(([domain, topics]) => ({
      domain,
      topics: topics.map((topic, index) => {
        const progress = user.topicProgress.find(p => p.topic === topic)

       

        const isUnlocked = true

        return {
          topic,
          domain,
          isUnlocked,
          easyCompleted: progress?.easyCompleted ?? false,
          mediumCompleted: progress?.mediumCompleted ?? false,
          hardCompleted: progress?.hardCompleted ?? false,
          topicCompleted: progress?.topicCompleted ?? false,
          weakScore: progress?.weakScore ?? 0,
          easyStats: {
            correct: progress?.easyCorrect ?? 0,
            total: progress?.easyTotal ?? 0,
          },
          mediumStats: {
            correct: progress?.mediumCorrect ?? 0,
            total: progress?.mediumTotal ?? 0,
          },
          hardStats: {
            correct: progress?.hardCorrect ?? 0,
            total: progress?.hardTotal ?? 0,
          },
        }
      })
    }))

    return {
      roadmapWeek: user.roadmapWeek,
      knowledgeLevel: user.knowledgeLevel,
      examDate: user.examDate,
      domains: roadmap,
    }
  }

  async updateWeek(userId: string, week: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { roadmapWeek: week },
      select: { roadmapWeek: true }
    })
  }
}