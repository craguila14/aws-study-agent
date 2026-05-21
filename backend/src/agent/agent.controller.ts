import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AgentService } from './agent.service'
import { PrismaService } from '../prisma/prisma.service'
import { IsString, IsArray, IsOptional } from 'class-validator'

export class ChatDto {
  @IsString()
  message!: string

  @IsArray()
  @IsOptional()
  sessionMessages: any[] = []
}

@Controller('agent')
@UseGuards(AuthGuard('jwt'))
export class AgentController {
  constructor(
    private agentService: AgentService,
    private prisma: PrismaService,
  ) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto, @Request() req: any) {
    const userId = req.user.id

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        roadmapWeek: true,
        knowledgeLevel: true,
        examDate: true,
      }
    })

    const userContext = {
      userId: user!.id,
      email: user!.email,
      roadmapWeek: user!.roadmapWeek,
      knowledgeLevel: user!.knowledgeLevel as any,
      examDate: user!.examDate,
    }

    return this.agentService.chat(dto.message, dto.sessionMessages, userContext)
  }
}