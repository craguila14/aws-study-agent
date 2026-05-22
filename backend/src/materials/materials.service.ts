import { Injectable, NotFoundException } from '@nestjs/common'
import * as path from 'path'
import * as fs from 'fs'

const TOPIC_ORDER = [
  'Cloud Computing Basics',
  'AWS Global Infrastructure',
  'Cloud Economics',
  'IAM',
  'Security Groups',
  'Compliance Programs',
  'Shared Responsibility Model',
  'EC2',
  'S3',
  'RDS',
  'VPC',
  'Lambda',
  'CloudFront',
  'Pricing Models',
  'Cost Explorer',
  'Support Plans',
  'AWS Organizations',
]

@Injectable()
export class MaterialsService {
  private materialsPath = path.join(process.cwd(), 'materials')

  getMaterials() {
    const materials = TOPIC_ORDER.map(topic => {
      const fileName = `${topic.toLowerCase().replace(/ /g, '-')}.pdf`
      const filePath = path.join(this.materialsPath, fileName)
      const fileExists = fs.existsSync(filePath)

      return {
        topic,
        fileName: fileExists ? fileName : null,
        available: fileExists,
      }
    })

    return { materials }
  }

  getMaterial(topic: string) {
    if (!TOPIC_ORDER.includes(topic)) {
      throw new NotFoundException('Topic not found')
    }

    const fileName = `${topic.toLowerCase().replace(/ /g, '-')}.pdf`
    const filePath = path.join(this.materialsPath, fileName)

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Material file not found')
    }

    return { filePath, fileName }
  }
}