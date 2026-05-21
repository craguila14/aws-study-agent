import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { AgentModule } from './agent/agent.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { QuizModule } from './quiz/quiz.module';
import { ProgressModule } from './progress/progress.module';
import { ExamModule } from './exam/exam.module';
import { MaterialsModule } from './materials/materials.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AgentModule,
    RoadmapModule,
    QuizModule,
    ProgressModule,
    ExamModule,
    MaterialsModule,
  ],
})
export class AppModule {}