import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module.js'
import { StudentCoursesService } from './student-courses.service.js'
import { StudentProfileService } from './student-profile.service.js'
import { StudentController } from './student.controller.js'

/** Módulo `student`: painel, "meus cursos" e perfil do aluno (o player e o estudo ficam em `learning`). */
@Module({
  imports: [UsersModule],
  controllers: [StudentController],
  providers: [StudentCoursesService, StudentProfileService],
})
export class StudentModule {}
