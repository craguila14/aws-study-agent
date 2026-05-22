import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { MaterialsService } from './materials.service'
import type { Response } from 'express'

@Controller('materials')
@UseGuards(AuthGuard('jwt'))
export class MaterialsController {
  constructor(private materialsService: MaterialsService) {}

  @Get()
  getMaterials() {
    return this.materialsService.getMaterials()
  }

  @Get(':topic')
  getMaterial(@Param('topic') topic: string, @Res() res: Response) {
    const { filePath, fileName } = this.materialsService.getMaterial(topic)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`)
    res.sendFile(filePath)
  }
}