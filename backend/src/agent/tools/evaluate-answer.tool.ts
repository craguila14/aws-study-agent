import { Tool } from '../types'

export const evaluateAnswerTool: Tool = {
  name: 'evaluate_answer',
  description: 'Evaluates the user answer to a quiz question and provides detailed feedback',
  input_schema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The quiz question that was asked'
      },
      correctAnswer: {
        type: 'string',
        description: 'The correct answer to the question'
      },
      userAnswer: {
        type: 'string',
        description: 'The answer provided by the user'
      },
      topic: {
        type: 'string',
        description: 'The AWS topic this question belongs to'
      }
    },
    required: ['question', 'correctAnswer', 'userAnswer', 'topic']
  }
}

export async function executeEvaluateAnswer(input: {
  question: string
  correctAnswer: string
  userAnswer: string
  topic: string
}) {
  const isCorrect = input.userAnswer.trim().toLowerCase() === 
                    input.correctAnswer.trim().toLowerCase()

  return {
    isCorrect,
    topic: input.topic,
    instruction: `The user answered "${input.userAnswer}" to the question "${input.question}". The correct answer is "${input.correctAnswer}". Provide detailed feedback explaining ${isCorrect ? 'why their answer is correct and reinforce the concept' : 'why their answer is wrong, what the correct answer is, and explain the underlying AWS concept clearly'}.`
  }
}