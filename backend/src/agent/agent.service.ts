import { Injectable } from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { UserContext } from './types'

import { generateRoadmapTool, executeGenerateRoadmap } from './tools/generate-roadmap.tool'
import { generateQuizTool, executeGenerateQuiz } from './tools/generate-quiz.tool'
import { trackProgressTool, executeTrackProgress } from './tools/track-progress.tool'
import { getWeakTopicsTool, executeGetWeakTopics } from './tools/get-weak-topics.tool'

const SYSTEM_PROMPT = `
You are an expert AWS Cloud Practitioner exam coach.
You help users study and prepare for the AWS CCP certification exam.

You have access to tools to generate roadmaps, quizzes, evaluate answers, track progress and generate final exams.

DECISION RULES:

When generating a roadmap:
- Call generate_roadmap with the user's exam date and knowledge level

When the user wants to practice a topic:
- ALWAYS call get_weak_topics first to check their current progress
- Use the recommendedDifficulty from inProgressTopics for that specific topic
- If the topic has no history, use this logic to determine starting difficulty:
  * beginner → easy
  * intermediate → medium
  * advanced → medium
- Never ask the user what difficulty they want, decide it yourself

When evaluating an answer:
- Call evaluate_answer to give feedback
- Then call track_progress with the correct difficulty level
- After track_progress, check the response:
  * If topicCompleted is true → congratulate the user and suggest moving to the next topic
  * If nextRecommendedDifficulty changed → inform the user they are ready for the next level and ask if they want to continue
  * If nextRecommendedDifficulty is the same → continue with the current level

Topic completion rules:
- A topic is only completed when easy, medium AND hard levels are all completed
- A level is completed when the user has answered at least 5 questions with weakScore <= 30%
- Never mark a topic as completed if only easy level is done
- Always encourage the user to progress through all three difficulty levels

When the user asks if they are ready for the final exam:
- Call generate_final_exam to check if all topics are completed at all difficulty levels
- If not ready, tell the user which topics still need work and at what difficulty level

IMPORTANT: Always respond to the user in Spanish.
Technical AWS terms (EC2, S3, IAM, Lambda, etc.) should remain in English as they are proper nouns.
`

@Injectable()
export class AgentService {
  private client: Anthropic

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    })
  }

  async chat(userMessage: string, sessionMessages: any[], userContext: UserContext) {
    const contextualSystemPrompt = `
      ${SYSTEM_PROMPT}

      CURRENT USER CONTEXT:
      - User ID: ${userContext.userId}
      - Knowledge level: ${userContext.knowledgeLevel}
      - Current roadmap week: ${userContext.roadmapWeek}
      - Exam date: ${userContext.examDate ?? 'not set yet'}
    `

    const messages = [
      ...sessionMessages,
      { role: 'user', content: userMessage }
    ]

    const tools = [
      generateRoadmapTool,
      generateQuizTool,
      trackProgressTool,
      getWeakTopicsTool,
    ]

    // Loop ReAct
    let response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: contextualSystemPrompt,
      messages,
      tools: tools as any,
    })

    // Mientras Claude quiera usar tools seguimos el loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlock = response.content.find(block => block.type === 'tool_use')

      if (!toolUseBlock || toolUseBlock.type !== 'tool_use') break

      const toolName = toolUseBlock.name
      const toolInput = toolUseBlock.input as any

      const toolResult = await this.executeTool(toolName, toolInput, userContext.userId)

      messages.push({ role: 'assistant', content: response.content })
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify(toolResult),
          }
        ]
      })

      response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: contextualSystemPrompt,
        messages,
        tools: tools as any,
      })
    }

    const finalText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.type === 'text' ? block.text : '')
      .join('')

    const updatedMessages = [
      ...sessionMessages,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: finalText }
    ]

    return {
      message: finalText,
      updatedMessages,
    }
  }

  private async executeTool(toolName: string, input: any, userId: string) {
    const toolExecutors: Record<string, () => Promise<unknown>> = {
      get_weak_topics: () => executeGetWeakTopics({ ...input, userId }, this.prisma),
      generate_roadmap: () => executeGenerateRoadmap({ ...input, userId }, this.prisma),
      generate_quiz: () => executeGenerateQuiz(input),
      track_progress: () => executeTrackProgress({ ...input, userId }, this.prisma),
    }

    const executor = toolExecutors[toolName]

    if (!executor) {
      throw new Error(`Unknown tool: ${toolName}`)
    }

    return executor()
  }
}