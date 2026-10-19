// Schema do banco (Drizzle), um arquivo por domínio. Autorização não vive no banco: é feita por
// guards (@Roles) e por filtro de dono nos services.
export * from './enums.js'
export * from './users.js'
export * from './auth.js'
export * from './profiles.js'
export * from './courses.js'
export * from './commerce.js'
export * from './affiliate.js'
export * from './certificates.js'
export * from './content.js'
export * from './support.js'
export * from './gamification.js'
