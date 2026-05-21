import { Tool } from '../types'

export const generateQuizTool: Tool = {
  name: 'generate_quiz',
  description: 'Generates quiz questions for a specific AWS topic or domain based on the user current position in their study roadmap',
  input_schema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'The AWS topic or service to generate questions about (e.g. EC2, S3, IAM)'
      },
      domain: {
        type: 'string',
        description: 'The exam domain',
        enum: ['Cloud Concepts', 'Security & Compliance', 'Cloud Technology & Services', 'Billing, Pricing & Support']
      },
      difficulty: {
        type: 'string',
        description: 'Difficulty level of the questions',
        enum: ['easy', 'medium', 'hard']
      },
      questionCount: {
        type: 'string',
        description: 'Number of questions to generate (1-10)'
      },
      roadmapWeek: {
        type: 'string',
        description: 'Current week in the study roadmap (e.g. 1, 2, 3)'
      },
      completedTopics: {
        type: 'string',
        description: 'Comma separated list of topics the user has already studied'
      }
    },
    required: ['topic', 'difficulty']
  }
}

export async function executeGenerateQuiz(input: {
  topic: string
  domain?: string
  difficulty: string
  questionCount?: string
  roadmapWeek?: string
  completedTopics?: string
}) {
  const completed = input.completedTopics?.split(',').map(t => t.trim()) ?? []

  return {
    topic: input.topic,
    difficulty: input.difficulty,
    questionCount: parseInt(input.questionCount ?? '5'),
    roadmapWeek: input.roadmapWeek ?? '1',
    completedTopics: completed,
    instruction: `Generate ${input.questionCount ?? 5} multiple choice questions about ${input.topic} at ${input.difficulty} difficulty level.
    
    Context:
    - The user is on week ${input.roadmapWeek ?? 1} of their study roadmap
    - Topics they have already studied: ${completed.length > 0 ? completed.join(', ') : 'none yet'}
    - Only reference concepts from topics the user has already covered
    - Style questions like real AWS Cloud Practitioner exam questions
    - Each question must have 4 options (A, B, C, D), indicate the correct answer and provide a brief explanation`
  }
}