import { Tool } from '../types'

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

export async function executeGenerateRoadmap(input: {
  examDate: string
  knowledgeLevel: string
  weakTopics?: string
}) {
  const domains = [
    { name: 'Cloud Concepts', weight: 24 },
    { name: 'Security & Compliance', weight: 30 },
    { name: 'Cloud Technology & Services', weight: 34 },
    { name: 'Billing, Pricing & Support', weight: 12 },
  ]

  const daysUntilExam = Math.ceil(
    (new Date(input.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return {
    daysUntilExam,
    domains,
    knowledgeLevel: input.knowledgeLevel,
    weakTopics: input.weakTopics?.split(',').map(t => t.trim()) ?? [],
    recommendedDailyStudyHours: daysUntilExam < 14 ? 3 : daysUntilExam < 30 ? 2 : 1,
  }
}