// =====================================================
// COURSE REQUIREMENTS - SERVER COMPONENT
// =====================================================

interface CourseRequirementsProps {
  requirements: string[]
}

export function CourseRequirements({ requirements }: CourseRequirementsProps) {
  if (!requirements || requirements.length === 0) {
    return null
  }

  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Requisitos</h2>
      <ul className="list-disc space-y-2 pl-5 text-slate-700 dark:text-slate-300">
        {requirements.map((requirement, index) => (
          <li key={index} className="leading-relaxed">
            {requirement}
          </li>
        ))}
      </ul>
    </section>
  )
}
