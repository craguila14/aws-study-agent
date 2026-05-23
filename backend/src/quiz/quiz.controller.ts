import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { QuizService } from './quiz.service'
import { GenerateQuizDto } from './dto/generate-quiz.dto'
import { EvaluateAnswerDto } from './dto/evaluate-answer.dto'
import { CompleteQuizDto } from './dto/complete-quiz.dto'
import { CompleteDailyQuizDto, DailyQuizDto } from './dto/daily-quiz.dto'

@Controller('quiz')
@UseGuards(AuthGuard('jwt'))
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Post('generate')
  generate(@Body() dto: GenerateQuizDto, @Request() req: any) {
    return this.quizService.generate(dto, req.user.id)
  }

   @Post('complete')
  complete(@Body() dto: CompleteQuizDto, @Request() req: any) {
    return this.quizService.complete(dto, req.user.id)
  }

  @Post('daily/generate')
generateDaily(@Body() dto: DailyQuizDto, @Request() req: any) {
  return this.quizService.generateDaily(dto, req.user.id)
}

@Post('daily/complete')
completeDaily(@Body() dto: CompleteDailyQuizDto, @Request() req: any) {
  return this.quizService.completeDaily(dto, req.user.id)
}

 
}