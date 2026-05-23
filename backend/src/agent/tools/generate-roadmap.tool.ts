import { PrismaService } from '../../prisma/prisma.service'
import { Tool, RoadmapResult, KnowledgeLevel, ExamDomain } from '../types'
import Anthropic from '@anthropic-ai/sdk'

export const generateRoadmapTool: Tool = {
  name: 'generate_roadmap',
  description: 'Generates a personalized study roadmap for AWS Cloud Practitioner exam based on the user exam date, knowledge level and available study time',
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
      daysPerWeek: {
        type: 'string',
        description: 'Number of days per week the user can study'
      },
      minutesPerDay: {
        type: 'string',
        description: 'Number of minutes per day the user can study'
      },
      weakTopics: {
        type: 'string',
        description: 'Comma separated list of topics the user struggles with'
      }
    },
    required: ['examDate', 'knowledgeLevel', 'daysPerWeek', 'minutesPerDay']
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

const ROADMAP_INSTRUCTIONS = `You are an AWS Cloud Practitioner exam study planner.
Generate a detailed personalized study plan based on the user's available time and exam date.

Rules:
- Distribute topics pedagogically: start with Cloud Concepts as foundation
- Allocate more days to heavier domains (Security & Compliance 30%, Cloud Technology 34%)
- Each session should include reading the topic PDF and a quiz
- Calculate questionCount based on minutesPerDay: approximately 3 minutes per question
- Reserve last 2 weeks for review and practice exams if time allows
- Only schedule study days based on daysPerWeek
- All dates must be from today onwards and before the exam date
- Respond ONLY with a valid JSON object, no markdown, no preamble, no backticks

Format:
{
  "totalDays": 30,
  "totalWeeks": 10,
  "daysPerWeek": 3,
  "minutesPerDay": 60,
  "sessions": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "topic": "Cloud Computing Basics",
      "domain": "Cloud Concepts",
      "material": "cloud-computing-basics.pdf",
      "estimatedMinutes": 60,
      "quiz": {
        "questionCount": 8,
        "difficulty": "easy"
      }
    }
  ]
}`

export async function executeGenerateRoadmap(
  input: {
    examDate: string
    knowledgeLevel: string
    daysPerWeek: number
    minutesPerDay: number
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

  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: ROADMAP_INSTRUCTIONS,
            // @ts-ignore
            cache_control: { type: 'ephemeral' }
          },
          {
            type: 'text',
            text: `Generate a study plan with these parameters:
              - Exam date: ${input.examDate}
              - Today: ${new Date().toISOString().split('T')[0]}
              - Knowledge level: ${input.knowledgeLevel}
              - Days per week: ${input.daysPerWeek}
              - Minutes per day: ${input.minutesPerDay}
              - Days until exam: ${daysUntilExam}
              - Weak topics to prioritize: ${input.weakTopics ?? 'none'}

              Available topics by domain:
              ${DOMAIN_CONFIG.map(d => `${d.name} (${d.weight}%): ${d.topics.join(', ')}`).join('\n')}`
          }
        ]
      }
    ]
  })

  const rawText = response.content
    .filter(block => block.type === 'text')
    .map(block => block.type === 'text' ? block.text : '')
    .join('')

  const studyPlan = JSON.parse(rawText)

  await prisma.studyPlan.upsert({
    where: { userId: input.userId },
    update: { plan: studyPlan },
    create: { userId: input.userId, plan: studyPlan }
  })

  return {
    daysUntilExam,
    totalWeeks,
    domains: DOMAIN_CONFIG,
    knowledgeLevel: input.knowledgeLevel as KnowledgeLevel,
    weakTopics: input.weakTopics?.split(',').map(t => t.trim()) ?? [],
    recommendedDailyStudyHours: Math.round(input.minutesPerDay / 60),
    startingTopic: 'Cloud Computing Basics',
    startingDomain: 'Cloud Concepts',
    studyPlan,
  }
}