import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import type { SessionUser } from '@vox/contracts'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js'
import { CurrentUser } from '../auth/decorators.js'
import {
  createNoteSchema,
  idSchema,
  listNotesQuerySchema,
  updateNoteSchema,
  uuidSchema,
  type CreateNoteInput,
  type ListNotesQuery,
  type UpdateNoteInput,
} from './learning.schemas.js'
import { NotesService } from './notes.service.js'

/** Notas de aula do aluno. Tudo é do usuário da sessão; nota de outra pessoa dá 404. */
@Controller('learning')
export class NotesController {
  constructor(@Inject(NotesService) private readonly notes: NotesService) {}

  @Get('notes')
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(listNotesQuerySchema)) query: ListNotesQuery,
  ) {
    return this.notes.listMyNotes(user.id, query)
  }

  @Get('notes/stats')
  stats(@CurrentUser() user: SessionUser) {
    return this.notes.getStats(user.id)
  }

  @Get('notes/by-course')
  byCourse(@CurrentUser() user: SessionUser) {
    return this.notes.getNotesByCourse(user.id)
  }

  @Get('notes/courses')
  courses(@CurrentUser() user: SessionUser) {
    return this.notes.getCoursesForFilter(user.id)
  }

  @Get('notes/:noteId')
  get(
    @CurrentUser() user: SessionUser,
    @Param('noteId', new ZodValidationPipe(uuidSchema)) noteId: string,
  ) {
    return this.notes.getNote(user.id, noteId)
  }

  @Post('notes')
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createNoteSchema)) body: CreateNoteInput,
  ) {
    return this.notes.createNote(user.id, body)
  }

  @Patch('notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @CurrentUser() user: SessionUser,
    @Param('noteId', new ZodValidationPipe(uuidSchema)) noteId: string,
    @Body(new ZodValidationPipe(updateNoteSchema)) body: UpdateNoteInput,
  ) {
    return this.notes.updateNote(user.id, noteId, body)
  }

  @Delete('notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: SessionUser,
    @Param('noteId', new ZodValidationPipe(uuidSchema)) noteId: string,
  ) {
    return this.notes.deleteNote(user.id, noteId)
  }

  /** Notas do aluno numa aula (aba "Notas" do player). */
  @Get('lessons/:lessonId/notes')
  listForLesson(
    @CurrentUser() user: SessionUser,
    @Param('lessonId', new ZodValidationPipe(idSchema)) lessonId: number,
  ) {
    return this.notes.listLessonNotes(user.id, lessonId)
  }
}
