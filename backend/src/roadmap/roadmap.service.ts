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

  // Calculamos la semana actual desde el plan
  const studyPlan = await this.prisma.studyPlan.findUnique({
    where: { userId }
  })

  let currentWeek = user.roadmapWeek

  if (studyPlan) {
    const plan = studyPlan.plan as any
    const today = new Date()
    const currentSession = plan.sessions.find(
      (s: any) => new Date(s.date) >= today
    )

    if (currentSession) {
      currentWeek = Math.ceil(currentSession.day / plan.daysPerWeek)
      
      // Actualizamos en DB si cambió
      if (currentWeek !== user.roadmapWeek) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { roadmapWeek: currentWeek }
        })
      }
    }
  }

  // Construimos el roadmap con el estado de cada topic
  const roadmap = Object.entries(DOMAIN_TOPICS).map(([domain, topics]) => ({
    domain,
    topics: topics.map(topic => {
      const progress = user.topicProgress.find(p => p.topic === topic)

      return {
        topic,
        domain,
        isUnlocked: true,
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
    currentWeek,
    knowledgeLevel: user.knowledgeLevel,
    examDate: user.examDate,
    domains: roadmap,
  }
}



  async getStudyPlan(userId: string) {

    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: { userId }
    })

    if (!studyPlan) return null

  return studyPlan.plan
}
}