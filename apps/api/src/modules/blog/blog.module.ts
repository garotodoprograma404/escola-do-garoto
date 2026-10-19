import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import {
  AdminBlogController,
  BlogLikesController,
  PublicBlogController,
} from './blog.controller.js'
import { BlogService } from './blog.service.js'

/** Blog: posts (rascunho/publicado/arquivado), SEO, curtidas, visualizações e editor rico sanitizado. */
@Module({
  imports: [AuthModule],
  controllers: [PublicBlogController, BlogLikesController, AdminBlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
