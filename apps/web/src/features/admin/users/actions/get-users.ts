'use server'

import { getUsers } from '../services/userService'
import type { UserFilters } from '../types'

export async function getUsersAction(
  filters: UserFilters,
  page: number = 1,
  pageSize: number = 10,
) {
  return await getUsers(filters, page, pageSize)
}
