'use server'

import { getCourseStatusCounts } from '../services/courseService'

export async function getCourseStatusCountsAction() {
  try {
    return await getCourseStatusCounts()
  } catch (error) {
    console.error('Error in getCourseStatusCountsAction:', error)
    return {
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
    }
  }
}
