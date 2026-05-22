import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ProgressService } from './progress.service'

@Controller('progress')
@UseGuards(AuthGuard('jwt'))
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Get()
  getProgress(@Request() req: any) {
    return this.progressService.getProgress(req.user.id)
  }

  @Get('weak-topics')
  getWeakTopics(@Request() req: any) {
    return this.progressService.getWeakTopics(req.user.id)
  }

  @Get(':topic')
  getTopicProgress(@Param('topic') topic: string, @Request() req: any) {
    return this.progressService.getTopicProgress(req.user.id, topic)
  }
}