import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { QuizService } from './quiz.service'
import { GenerateQuizDto } from './dto/generate-quiz.dto'
import { EvaluateAnswerDto } from './dto/evaluate-answer.dto'

@Controller('quiz')
@UseGuards(AuthGuard('jwt'))
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Post('generate')
  generate(@Body() dto: GenerateQuizDto, @Request() req: any) {
    return this.quizService.generate(dto, req.user.id)
  }

  @Post('evaluate')
  evaluate(@Body() dto: EvaluateAnswerDto, @Request() req: any) {
    return this.quizService.evaluate(dto, req.user.id)
  }
}