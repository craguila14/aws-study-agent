import { PrismaService } from '../../prisma/prisma.service'
import { Tool, RoadmapResult, KnowledgeLevel, ExamDomain } from '../types'

export const generateRoadmapTool: Tool = {
  name: 'generate_roadmap',
  description: 'Generates a personalized study roadmap for AWS Cloud Practitioner exam based on the user exam date and current knowledge level',
  input_schema: {
    type: 'object',
    properties: {
      examDate: {
        type: 'string',
        description: 'Target exam date in YYYY-MM-DD format'
      },
      knowledgeLevel: {
        type: 'string',
        description: 'Current knowledge level of the user',
        enum: ['beginner', 'intermediate', 'advanced']
      },
      weakTopics: {
        type: 'string',
        description: 'Comma separated list of topics the user struggles with'
      }
    },
    required: ['examDate', 'knowledgeLevel']
  }
}

const DOMAIN_CONFIG = [
  {
    name: 'Cloud Concepts' as ExamDomain,
    weight: 24,
    topics: ['Cloud Computing Basics', 'AWS Global Infrastructure', 'Cloud Economics']
  },
  {
    name: 'Security & Compliance' as ExamDomain,
    weight: 30,
    topics: ['IAM', 'Security Groups', 'Compliance Programs', 'Shared Responsibility Model']
  },
  {
    name: 'Cloud Technology & Services' as ExamDomain,
    weight: 34,
    topics: ['EC2', 'S3', 'RDS', 'VPC', 'Lambda', 'CloudFront']
  },
  {
    name: 'Billing, Pricing & Support' as ExamDomain,
    weight: 12,
    topics: ['Pricing Models', 'Cost Explorer', 'Support Plans', 'AWS Organizations']
  },
]

export async function executeGenerateRoadmap(
  input: {
    examDate: string
    knowledgeLevel: string
    weakTopics?: string
    userId: string
  },
  prisma: PrismaService
): Promise<RoadmapResult> {
  await prisma.user.update({
    where: { id: input.userId },
    data: {
      examDate: new Date(input.examDate),
      knowledgeLevel: input.knowledgeLevel,
      roadmapWeek: 1,
    }
  })

  const daysUntilExam = Math.ceil(
    (new Date(input.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const totalWeeks = Math.floor(daysUntilExam / 7)

  return {
    daysUntilExam,
    totalWeeks,
    domains: DOMAIN_CONFIG,
    knowledgeLevel: input.knowledgeLevel as KnowledgeLevel,
    weakTopics: input.weakTopics?.split(',').map(t => t.trim()) ?? [],
    recommendedDailyStudyHours: daysUntilExam < 14 ? 3 : daysUntilExam < 30 ? 2 : 1,
    startingTopic: 'Cloud Computing Basics',
    startingDomain: 'Cloud Concepts',
  }
}