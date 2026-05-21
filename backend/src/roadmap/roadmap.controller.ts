import { Controller, Post, Get, Patch, Body, Request, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { RoadmapService } from './roadmap.service'
import { GenerateRoadmapDto } from './dto/generate-roadmap.dto'

@Controller('roadmap')
@UseGuards(AuthGuard('jwt'))
export class RoadmapController {
  constructor(private roadmapService: RoadmapService) {}

  @Post('generate')
  generate(@Body() dto: GenerateRoadmapDto, @Request() req: any) {
    return this.roadmapService.generate(dto, req.user.id)
  }

  @Get()
  getRoadmap(@Request() req: any) {
    return this.roadmapService.getRoadmap(req.user.id)
  }

  @Patch('week')
  updateWeek(@Body('week') week: number, @Request() req: any) {
    return this.roadmapService.updateWeek(req.user.id, week)
  }
}