'use client'

import { BlogManagementContent } from './BlogManagementContent.client'
import type { BlogPost } from '../types'

interface BlogMainTabsProps {
  initialPosts: BlogPost[]
}

export function BlogMainTabs({ initialPosts }: BlogMainTabsProps) {
  return (
    <div className="mt-6">
      <BlogManagementContent initialPosts={initialPosts} />
    </div>
  )
}
